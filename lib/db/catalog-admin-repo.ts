import { query } from "@/lib/db/connection";
import type { Row } from "@/lib/db/connection";
import { toBool, toHourMinute, toNullableString } from "@/lib/db/util";

/** مدیریت تخصص‌ها، پزشکان، برنامه‌ی هفتگی و استثناها (پنل ادمین) */

export type ScheduleRange = { weekday: number; startTime: string; endTime: string };

export async function createSpecialty(input: {
    name: string;
    slug: string;
    icon: string | null;
}): Promise<number> {
    const rows = await query(
        `INSERT INTO specialties (name, slug, icon, sort_order)
         VALUES ($1, $2, $3, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM specialties))
         RETURNING id`,
        [input.name, input.slug, input.icon],
    );
    return Number(rows[0].id);
}

export async function updateSpecialty(
    id: number,
    patch: { name?: string; icon?: string | null; isActive?: boolean; sortOrder?: number },
): Promise<boolean> {
    return patchRow("specialties", id, {
        name: patch.name,
        icon: patch.icon,
        is_active: patch.isActive,
        sort_order: patch.sortOrder,
    });
}

export async function createDoctor(input: {
    specialtyId: number;
    firstName: string;
    lastName: string;
    displayName: string;
    requiresSurgeryHistory: boolean;
}): Promise<number> {
    const rows = await query(
        `INSERT INTO doctors (specialty_id, first_name, last_name, display_name, requires_surgery_history, sort_order)
         VALUES ($1, $2, $3, $4, $5, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM doctors))
         RETURNING id`,
        [input.specialtyId, input.firstName, input.lastName, input.displayName, input.requiresSurgeryHistory],
    );
    return Number(rows[0].id);
}

export async function updateDoctor(
    id: number,
    patch: {
        specialtyId?: number;
        firstName?: string;
        lastName?: string;
        displayName?: string;
        requiresSurgeryHistory?: boolean;
        isActive?: boolean;
        sortOrder?: number;
    },
): Promise<boolean> {
    return patchRow("doctors", id, {
        specialty_id: patch.specialtyId,
        first_name: patch.firstName,
        last_name: patch.lastName,
        display_name: patch.displayName,
        requires_surgery_history: patch.requiresSurgeryHistory,
        is_active: patch.isActive,
        sort_order: patch.sortOrder,
    });
}

/** نام ستون‌ها فقط از کد خودمان می‌آید (نه از ورودی کاربر)؛ مقدارها پارامتر هستند */
async function patchRow(
    table: "specialties" | "doctors",
    id: number,
    values: Record<string, string | number | boolean | null | undefined>,
): Promise<boolean> {
    const sets: string[] = [];
    const params: (string | number | boolean | null)[] = [];

    for (const [column, value] of Object.entries(values)) {
        if (value === undefined) continue;
        params.push(value);
        sets.push(`${column} = $${params.length}`);
    }
    if (sets.length === 0) return true;

    params.push(id);
    const rows = await query(
        `UPDATE ${table} SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING id`,
        params,
    );
    return rows.length > 0;
}

// ---------------- برنامه‌ی هفتگی ----------------

export type ScheduleRow = ScheduleRange & { id: number; doctorId: number };

export async function listAllSchedules(): Promise<ScheduleRow[]> {
    const rows = await query(
        "SELECT * FROM doctor_schedules WHERE is_active = TRUE ORDER BY doctor_id, weekday, start_time",
    );
    return rows.map((row) => ({
        id: Number(row.id),
        doctorId: Number(row.doctor_id),
        weekday: Number(row.weekday),
        startTime: toHourMinute(row.start_time),
        endTime: toHourMinute(row.end_time),
    }));
}

/** کل برنامه‌ی هفتگی پزشک را عوض می‌کند. باید داخل withTransaction صدا زده شود. */
export async function replaceWeeklySchedule(
    doctorId: number,
    ranges: ScheduleRange[],
    validFrom: string,
): Promise<void> {
    await query("DELETE FROM doctor_schedules WHERE doctor_id = $1", [doctorId]);

    for (const range of ranges) {
        await query(
            `INSERT INTO doctor_schedules (doctor_id, weekday, start_time, end_time, valid_from, valid_until, is_active)
             VALUES ($1, $2, $3, $4, $5, NULL, TRUE)`,
            [doctorId, range.weekday, range.startTime, range.endTime, validFrom],
        );
    }
}

// ---------------- استثناها ----------------

export type ExceptionRow = {
    id: number;
    doctorId: number;
    date: string;
    type: "disabled" | "override";
    startTime: string | null;
    endTime: string | null;
    reason: string | null;
};

function toExceptionRow(row: Row): ExceptionRow {
    return {
        id: Number(row.id),
        doctorId: Number(row.doctor_id),
        date: String(row.date),
        type: String(row.type) as ExceptionRow["type"],
        startTime: row.start_time === null ? null : toHourMinute(row.start_time),
        endTime: row.end_time === null ? null : toHourMinute(row.end_time),
        reason: toNullableString(row.reason),
    };
}

export async function listExceptionsFrom(fromDate: string): Promise<ExceptionRow[]> {
    const rows = await query(
        "SELECT * FROM schedule_exceptions WHERE is_active = TRUE AND date >= $1 ORDER BY date, doctor_id",
        [fromDate],
    );
    return rows.map(toExceptionRow);
}

/** برای هر پزشک در هر روز فقط یک استثنای فعال می‌ماند. باید داخل withTransaction صدا زده شود. */
export async function replaceException(input: {
    doctorId: number;
    date: string;
    type: "disabled" | "override";
    startTime: string | null;
    endTime: string | null;
    reason: string | null;
}): Promise<number> {
    await query(
        "UPDATE schedule_exceptions SET is_active = FALSE WHERE doctor_id = $1 AND date = $2 AND is_active = TRUE",
        [input.doctorId, input.date],
    );
    const rows = await query(
        `INSERT INTO schedule_exceptions (doctor_id, date, type, start_time, end_time, reason, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING id`,
        [input.doctorId, input.date, input.type, input.startTime, input.endTime, input.reason],
    );
    return Number(rows[0].id);
}

export async function deactivateException(id: number): Promise<boolean> {
    const rows = await query(
        "UPDATE schedule_exceptions SET is_active = FALSE WHERE id = $1 AND is_active = TRUE RETURNING id",
        [id],
    );
    return rows.length > 0;
}

export { toBool };