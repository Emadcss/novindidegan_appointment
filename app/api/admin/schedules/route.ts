
import { NextResponse } from "next/server";

import { requireAdminApi, rejectCrossOrigin } from "@/lib/admin/api";
import {
    advisoryLock,
    query,
    withTransaction,
} from "@/lib/db/connection";

const WEEKDAYS = new Set([0, 1, 2, 3, 4, 5, 6]);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_DATE = "9999-12-31";

type ShiftInput = {
    weekday: number;
    startTime: string;
    endTime: string;
};

type RequestBody = Record<string, unknown>;

function getTodayTehran(): string {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Tehran",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());

    const part = (type: string) =>
        parts.find((item) => item.type === type)?.value ?? "";

    return `${part("year")}-${part("month")}-${part("day")}`;
}

function isShift(value: unknown): value is ShiftInput {
    if (!value || typeof value !== "object") return false;

    const item = value as Record<string, unknown>;

    return (
        typeof item.weekday === "number" &&
        Number.isInteger(item.weekday) &&
        WEEKDAYS.has(item.weekday) &&
        typeof item.startTime === "string" &&
        TIME_PATTERN.test(item.startTime) &&
        typeof item.endTime === "string" &&
        TIME_PATTERN.test(item.endTime) &&
        item.startTime < item.endTime
    );
}

function overlaps(a: ShiftInput, b: ShiftInput): boolean {
    return (
        a.weekday === b.weekday &&
        a.startTime < b.endTime &&
        b.startTime < a.endTime
    );
}

function weekdayLabel(weekday: number): string {
    const labels: Record<number, string> = {
        0: "یکشنبه",
        1: "دوشنبه",
        2: "سه‌شنبه",
        3: "چهارشنبه",
        4: "پنجشنبه",
        5: "جمعه",
        6: "شنبه",
    };

    return labels[weekday] ?? "نامشخص";
}

function errorResponse(message: string, status: number) {
    return NextResponse.json({ error: message }, { status });
}

async function readBody(request: Request): Promise<RequestBody | null> {
    try {
        const value: unknown = await request.json();

        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return null;
        }

        return value as RequestBody;
    } catch {
        return null;
    }
}

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : "";
}

export async function GET() {
    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    try {
        const [doctors, schedules] = await Promise.all([
            query(`
                SELECT
                    d.id,
                    d.first_name,
                    d.last_name,
                    d.display_name,
                    d.is_active,
                    s.name AS specialty_name
                FROM doctors d
                         JOIN specialties s ON s.id = d.specialty_id
                ORDER BY
                    s.sort_order,
                    s.name,
                    d.sort_order,
                    d.last_name,
                    d.first_name
            `),

            query(`
                SELECT
                    ds.id,
                    ds.doctor_id,
                    d.display_name AS doctor_name,
                    s.name AS specialty_name,
                    ds.weekday,
                    TO_CHAR(ds.start_time, 'HH24:MI') AS start_time,
                    TO_CHAR(ds.end_time, 'HH24:MI') AS end_time,
                    ds.valid_from::text AS valid_from,
                    ds.valid_until::text AS valid_until,
                    ds.is_active
                FROM doctor_schedules ds
                         JOIN doctors d ON d.id = ds.doctor_id
                         JOIN specialties s ON s.id = d.specialty_id
                ORDER BY
                    d.last_name,
                    d.first_name,
                    ds.weekday,
                    ds.start_time,
                    ds.id
            `),
        ]);

        return NextResponse.json({ doctors, schedules });
    } catch (error) {
        console.error("خطا در دریافت برنامه‌های پزشکان:", error);
        return errorResponse("دریافت برنامه‌های پزشکان انجام نشد.", 500);
    }
}

export async function POST(request: Request) {
    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    const originError = rejectCrossOrigin(request);
    if (originError) return originError;

    const body = await readBody(request);

    if (!body) {
        return errorResponse("اطلاعات ارسالی معتبر نیست.", 400);
    }

    const doctorId = Number(body.doctorId);
    const rawShifts = body.shifts;

    if (
        !Number.isSafeInteger(doctorId) ||
        doctorId < 1 ||
        !Array.isArray(rawShifts) ||
        rawShifts.length === 0 ||
        rawShifts.length > 42 ||
        !rawShifts.every(isShift)
    ) {
        return errorResponse(
            "پزشک و حداقل یک شیفت معتبر برای روزهای هفته لازم است.",
            400,
        );
    }

    const shifts = rawShifts as ShiftInput[];

    // جلوگیری از تداخل میان شیفت‌های همین درخواست.
    for (let i = 0; i < shifts.length; i++) {
        for (let j = i + 1; j < shifts.length; j++) {
            if (overlaps(shifts[i], shifts[j])) {
                return errorResponse(
                    `شیفت‌های روز ${weekdayLabel(shifts[i].weekday)} با یکدیگر هم‌پوشانی دارند.`,
                    409,
                );
            }
        }
    }

    try {
        const inserted = await withTransaction(async () => {
            // ثبت و فعال‌سازی شیفت‌های یک پزشک با یک قفل هماهنگ می‌شوند.
            await advisoryLock(42, doctorId);

            const doctor = await query(
                `
                    SELECT id
                    FROM doctors
                    WHERE id = $1
                      AND is_active = TRUE
                `,
                [doctorId],
            );

            if (doctor.length === 0) {
                throw new Error("DOCTOR_NOT_FOUND");
            }

            const today = getTodayTehran();

            for (const shift of shifts) {
                const conflicts = await query(
                    `
                        SELECT id
                        FROM doctor_schedules
                        WHERE doctor_id = $1
                          AND weekday = $2
                          AND is_active = TRUE
                          AND valid_from <= $3::date
              AND COALESCE(valid_until, $4::date) >= $5::date
                          AND start_time < $7::time
                          AND end_time > $6::time
                            LIMIT 1
                    `,
                    [
                        doctorId,
                        shift.weekday,
                        MAX_DATE,
                        MAX_DATE,
                        today,
                        shift.startTime,
                        shift.endTime,
                    ],
                );

                if (conflicts.length > 0) {
                    throw new Error(`SHIFT_CONFLICT:${shift.weekday}`);
                }
            }

            const rows = [];

            for (const shift of shifts) {
                const result = await query(
                    `
                        INSERT INTO doctor_schedules (
                            doctor_id,
                            weekday,
                            start_time,
                            end_time,
                            valid_from,
                            valid_until,
                            is_active
                        )
                        VALUES ($1, $2, $3::time, $4::time, $5::date, NULL, TRUE)
                            RETURNING
              id,
              doctor_id,
              weekday,
              TO_CHAR(start_time, 'HH24:MI') AS start_time,
              TO_CHAR(end_time, 'HH24:MI') AS end_time,
              valid_from::text AS valid_from,
              valid_until::text AS valid_until,
              is_active
                    `,
                    [
                        doctorId,
                        shift.weekday,
                        shift.startTime,
                        shift.endTime,
                        today,
                    ],
                );

                rows.push(result[0]);
            }

            return rows;
        });

        return NextResponse.json({ schedules: inserted }, { status: 201 });
    } catch (error) {
        const message = getErrorMessage(error);

        if (message === "DOCTOR_NOT_FOUND") {
            return errorResponse(
                "پزشک انتخاب‌شده وجود ندارد یا غیرفعال است.",
                404,
            );
        }

        if (message.startsWith("SHIFT_CONFLICT:")) {
            const weekday = Number(message.split(":")[1]);

            return errorResponse(
                `شیفت روز ${weekdayLabel(weekday)} با برنامه فعال قبلی پزشک تداخل دارد. ابتدا برنامه قبلی را غیرفعال کنید یا ساعت را تغییر دهید.`,
                409,
            );
        }

        console.error("خطا در ثبت برنامه هفتگی پزشک:", error);
        return errorResponse("ثبت برنامه هفتگی پزشک انجام نشد.", 500);
    }
}

export async function PATCH(request: Request) {
    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    const originError = rejectCrossOrigin(request);
    if (originError) return originError;

    const body = await readBody(request);

    if (!body) {
        return errorResponse("اطلاعات ارسالی معتبر نیست.", 400);
    }

    const id = Number(body.id);
    const isActive = body.isActive;

    if (
        !Number.isSafeInteger(id) ||
        id < 1 ||
        typeof isActive !== "boolean"
    ) {
        return errorResponse("شناسه یا وضعیت برنامه معتبر نیست.", 400);
    }

    try {
        const updated = await withTransaction(async () => {
            // ابتدا فقط شناسه پزشک را پیدا می‌کنیم تا قفل پزشک را بگیریم.
            const initial = await query(
                `
                    SELECT doctor_id
                    FROM doctor_schedules
                    WHERE id = $1
                `,
                [id],
            );

            if (initial.length === 0) {
                throw new Error("SCHEDULE_NOT_FOUND");
            }

            const doctorId = Number(initial[0].doctor_id);

            await advisoryLock(42, doctorId);

            // پس از گرفتن قفل، رکورد را دوباره می‌خوانیم.
            const targetRows = await query(
                `
                    SELECT
                        id,
                        doctor_id,
                        weekday,
                        start_time,
                        end_time,
                        valid_from,
                        valid_until,
                        is_active
                    FROM doctor_schedules
                    WHERE id = $1
                        FOR UPDATE
                `,
                [id],
            );

            if (targetRows.length === 0) {
                throw new Error("SCHEDULE_NOT_FOUND");
            }

            const target = targetRows[0];

            const targetWeekday = Number(target.weekday);
            const targetStartTime = String(target.start_time);
            const targetEndTime = String(target.end_time);
            const targetValidFrom = String(target.valid_from);
            const targetValidUntil =
                target.valid_until == null ? null : String(target.valid_until);

            if (isActive && !target.is_active) {

                const conflicts = await query(
                    `
                        SELECT id
                        FROM doctor_schedules other
                        WHERE other.doctor_id = $1
                          AND other.id <> $2
                          AND other.weekday = $3
                          AND other.is_active = TRUE
                          AND other.valid_from <= COALESCE($5::date, $6::date)
                          AND COALESCE(other.valid_until, $6::date) >= $4::date
      AND other.start_time < $8::time
                          AND other.end_time > $7::time
                            LIMIT 1
                    `,
                    [
                        doctorId,
                        id,
                        targetWeekday,
                        targetValidFrom,
                        targetValidUntil,
                        MAX_DATE,
                        targetStartTime,
                        targetEndTime,
                    ],
                );


                if (conflicts.length > 0) {
                    throw new Error(`SHIFT_CONFLICT:${target.weekday}`);
                }
            }

            const result = await query(
                `
                    UPDATE doctor_schedules
                    SET is_active = $2
                    WHERE id = $1
                        RETURNING id, doctor_id, is_active
                `,
                [id, isActive],
            );

            return result[0];
        });

        return NextResponse.json({ schedule: updated });
    } catch (error) {
        const message = getErrorMessage(error);

        if (message === "SCHEDULE_NOT_FOUND") {
            return errorResponse("برنامه موردنظر پیدا نشد.", 404);
        }

        if (message.startsWith("SHIFT_CONFLICT:")) {
            const weekday = Number(message.split(":")[1]);

            return errorResponse(
                `این شیفت در روز ${weekdayLabel(weekday)} با شیفت فعال دیگری تداخل دارد و نمی‌توان آن را فعال کرد.`,
                409,
            );
        }

        console.error("خطا در تغییر وضعیت برنامه:", error);
        return errorResponse("تغییر وضعیت برنامه انجام نشد.", 500);
    }
}
