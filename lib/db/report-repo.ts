import { query } from "@/lib/db/connection";
import type { Row } from "@/lib/db/connection";
import { toHourMinute, toIso, toNullableString } from "@/lib/db/util";

/** کوئری‌های گزارش و مدیریت نوبت‌ها برای پنل ادمین */

export type DateRange = { from: string; to: string };

const n = (value: unknown): number => Number(value ?? 0);

export type StatusCounts = {
    total: number;
    booked: number;
    completed: number;
    cancelled: number;
    noShow: number;
};

const STATUS_SUMS = `
    COUNT(*) AS total,
    SUM(CASE WHEN a.status = 'booked' THEN 1 ELSE 0 END) AS booked,
    SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) AS completed,
    SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
    SUM(CASE WHEN a.status = 'no_show' THEN 1 ELSE 0 END) AS no_show`;

const toCounts = (row: Row): StatusCounts => ({
    total: n(row.total),
    booked: n(row.booked),
    completed: n(row.completed),
    cancelled: n(row.cancelled),
    noShow: n(row.no_show),
});

export type SummaryReport = {
    range: DateRange;
    totals: StatusCounts & { iranian: number; foreign: number };
    byDay: { date: string; total: number }[];
    byHour: { hour: number; total: number }[];
    byDoctor: ({ doctorId: number; doctorName: string; specialtyName: string } & StatusCounts)[];
    bySpecialty: { specialtyId: number; name: string; total: number }[];
    byKiosk: { kioskId: number | null; name: string; total: number }[];
};

export async function summaryReport(range: DateRange): Promise<SummaryReport> {
    const params = [range.from, range.to];
    const where = "a.appointment_date BETWEEN $1 AND $2";

    const totals = (
        await query(
            `SELECT ${STATUS_SUMS},
                SUM(CASE WHEN p.nationality = 'iranian' THEN 1 ELSE 0 END) AS iranian,
                SUM(CASE WHEN p.nationality = 'foreign' THEN 1 ELSE 0 END) AS foreign_count
             FROM appointments a JOIN patients p ON p.id = a.patient_id
             WHERE ${where}`,
            params,
        )
    )[0];

    const byDay = await query(
        `SELECT a.appointment_date AS d, COUNT(*) AS total
         FROM appointments a WHERE ${where}
         GROUP BY a.appointment_date ORDER BY a.appointment_date`,
        params,
    );

    const byHour = await query(
        `SELECT CAST(SUBSTR(CAST(a.appointment_time AS TEXT), 1, 2) AS INTEGER) AS h, COUNT(*) AS total
         FROM appointments a WHERE ${where}
         GROUP BY 1 ORDER BY 1`,
        params,
    );

    const byDoctor = await query(
        `SELECT d.id AS doctor_id, d.display_name, s.name AS specialty_name, ${STATUS_SUMS}
         FROM appointments a
         JOIN doctors d ON d.id = a.doctor_id
         JOIN specialties s ON s.id = a.specialty_id
         WHERE ${where}
         GROUP BY d.id, d.display_name, s.name
         ORDER BY total DESC, d.id`,
        params,
    );

    const bySpecialty = await query(
        `SELECT s.id AS specialty_id, s.name, COUNT(*) AS total
         FROM appointments a JOIN specialties s ON s.id = a.specialty_id
         WHERE ${where}
         GROUP BY s.id, s.name ORDER BY total DESC, s.id`,
        params,
    );

    const byKiosk = await query(
        `SELECT a.kiosk_id, k.name, COUNT(*) AS total
         FROM appointments a LEFT JOIN kiosks k ON k.id = a.kiosk_id
         WHERE ${where}
         GROUP BY a.kiosk_id, k.name ORDER BY total DESC`,
        params,
    );

    return {
        range,
        totals: {
            ...toCounts(totals ?? {}),
            iranian: n(totals?.iranian),
            foreign: n(totals?.foreign_count),
        },
        byDay: byDay.map((row) => ({ date: String(row.d), total: n(row.total) })),
        byHour: byHour.map((row) => ({ hour: n(row.h), total: n(row.total) })),
        byDoctor: byDoctor.map((row) => ({
            doctorId: n(row.doctor_id),
            doctorName: String(row.display_name),
            specialtyName: String(row.specialty_name),
            ...toCounts(row),
        })),
        bySpecialty: bySpecialty.map((row) => ({
            specialtyId: n(row.specialty_id),
            name: String(row.name),
            total: n(row.total),
        })),
        byKiosk: byKiosk.map((row) => ({
            kioskId: row.kiosk_id === null ? null : n(row.kiosk_id),
            name: row.name === null ? "نامشخص (بدون کیوسک)" : String(row.name),
            total: n(row.total),
        })),
    };
}

// ---------------- فهرست نوبت‌ها ----------------

export type AppointmentFilter = {
    from: string;
    to: string;
    doctorId?: number;
    specialtyId?: number;
    kioskId?: number;
    status?: string;
    /** شماره‌ی نوبت */
    number?: number;
};

export type AppointmentRow = {
    id: number;
    appointmentDate: string;
    appointmentTime: string;
    appointmentNumber: number;
    status: string;
    doctorId: number;
    doctorName: string;
    specialtyName: string;
    kioskId: number | null;
    kioskName: string | null;
    nationality: string;
    nationalIdEnc: string | null;
    mobileEnc: string | null;
    createdAt: string;
};

function buildWhere(filter: AppointmentFilter): { sql: string; params: (string | number)[] } {
    const params: (string | number)[] = [filter.from, filter.to];
    const parts = ["a.appointment_date BETWEEN $1 AND $2"];
    const add = (sql: string, value: string | number) => {
        params.push(value);
        parts.push(sql.replace("?", `$${params.length}`));
    };

    if (filter.doctorId !== undefined) add("a.doctor_id = ?", filter.doctorId);
    if (filter.specialtyId !== undefined) add("a.specialty_id = ?", filter.specialtyId);
    if (filter.kioskId !== undefined) add("a.kiosk_id = ?", filter.kioskId);
    if (filter.status !== undefined) add("a.status = ?", filter.status);
    if (filter.number !== undefined) add("a.appointment_number = ?", filter.number);

    return { sql: parts.join(" AND "), params };
}

const APPOINTMENT_SELECT = `
    SELECT a.id, a.appointment_date, a.appointment_time, a.appointment_number, a.status,
           a.created_at, a.doctor_id, d.display_name AS doctor_name, s.name AS specialty_name,
           a.kiosk_id, k.name AS kiosk_name,
           p.nationality, p.national_id_enc, p.mobile_enc
    FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    JOIN specialties s ON s.id = a.specialty_id
    JOIN patients p ON p.id = a.patient_id
    LEFT JOIN kiosks k ON k.id = a.kiosk_id`;

function toAppointmentRow(row: Row): AppointmentRow {
    return {
        id: n(row.id),
        appointmentDate: String(row.appointment_date),
        appointmentTime: toHourMinute(row.appointment_time),
        appointmentNumber: n(row.appointment_number),
        status: String(row.status),
        doctorId: n(row.doctor_id),
        doctorName: String(row.doctor_name),
        specialtyName: String(row.specialty_name),
        kioskId: row.kiosk_id === null ? null : n(row.kiosk_id),
        kioskName: toNullableString(row.kiosk_name),
        nationality: String(row.nationality),
        nationalIdEnc: toNullableString(row.national_id_enc),
        mobileEnc: toNullableString(row.mobile_enc),
        createdAt: toIso(row.created_at) as string,
    };
}

export async function listAppointmentsAdmin(
    filter: AppointmentFilter,
    limit: number,
    offset: number,
): Promise<{ rows: AppointmentRow[]; total: number }> {
    const { sql, params } = buildWhere(filter);

    const count = await query(
        `SELECT COUNT(*) AS total FROM appointments a WHERE ${sql}`,
        params,
    );

    const rows = await query(
        `${APPOINTMENT_SELECT} WHERE ${sql}
         ORDER BY a.appointment_date DESC, a.id DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
    );

    return { rows: rows.map(toAppointmentRow), total: n(count[0]?.total) };
}

export async function getAppointmentAdmin(id: number): Promise<AppointmentRow | null> {
    const rows = await query(`${APPOINTMENT_SELECT} WHERE a.id = $1`, [id]);
    return rows[0] ? toAppointmentRow(rows[0]) : null;
}

export async function updateAppointmentStatus(id: number, status: string): Promise<boolean> {
    const rows = await query(
        "UPDATE appointments SET status = $2 WHERE id = $1 RETURNING id",
        [id, status],
    );
    return rows.length > 0;
}

/** آخرین شماره‌ی صادرشده‌ی هر پزشک در یک روز */
export async function lastNumbersForDay(day: string): Promise<Map<number, number>> {
    const rows = await query(
        "SELECT doctor_id, last_number FROM daily_counters WHERE day = $1",
        [day],
    );
    return new Map(rows.map((row) => [n(row.doctor_id), n(row.last_number)]));
}