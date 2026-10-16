import { query } from "@/lib/db/connection";
import type { Row } from "@/lib/db/connection";
import { getTehranDateKey } from "@/lib/time/tehran-time";
import { getServerNow } from "@/lib/time/server-clock";
import type { Doctor, DoctorSchedule, Specialty } from "@/types/kiosk";

const toBool = (v: unknown) => v === true || Number(v) === 1;
const toHM = (v: unknown) => String(v).slice(0, 5);

export async function findAdminByUsername(username: string) {
    const rows = await query(
        "SELECT id, username, password_hash FROM admin_users WHERE username = $1",
        [username],
    );
    if (!rows[0]) return null;
    return {
        id: Number(rows[0].id),
        username: String(rows[0].username),
        passwordHash: String(rows[0].password_hash),
    };
}

// ---- Dashboard ----
export async function getDashboardStats() {
    const day = getTehranDateKey(getServerNow());

    const [appts, activeDoctors, kiosks] = await Promise.all([
        query(
            `SELECT COUNT(*)::int AS n FROM appointments
       WHERE appointment_date = $1 AND status = 'booked'`,
            [day],
        ),
        query(`SELECT COUNT(*)::int AS n FROM doctors WHERE is_active = TRUE`),
        query(
            `SELECT id, code, name, is_active, last_seen_at, printer_status, last_error
       FROM kiosks ORDER BY code`,
        ),
    ]);

    const byDoctor = await query(
        `SELECT d.display_name AS name, COUNT(a.id)::int AS count
     FROM appointments a
     JOIN doctors d ON d.id = a.doctor_id
     WHERE a.appointment_date = $1 AND a.status = 'booked'
     GROUP BY d.id, d.display_name
     ORDER BY count DESC`,
        [day],
    );

    return {
        day,
        bookedToday: Number(appts[0]?.n ?? 0),
        activeDoctors: Number(activeDoctors[0]?.n ?? 0),
        byDoctor: byDoctor.map((r) => ({
            name: String(r.name),
            count: Number(r.count),
        })),
        kiosks: kiosks.map((r) => ({
            id: Number(r.id),
            code: String(r.code),
            name: String(r.name),
            isActive: toBool(r.is_active),
            lastSeenAt: r.last_seen_at
                ? new Date(r.last_seen_at as string).toISOString()
                : null,
            printerStatus: String(r.printer_status),
            lastError: r.last_error ? String(r.last_error) : null,
        })),
    };
}

// ---- Specialties CRUD ----
function toSpecialty(row: Row): Specialty {
    return {
        id: Number(row.id),
        name: String(row.name),
        slug: String(row.slug),
        icon: row.icon == null ? null : String(row.icon),
        isActive: toBool(row.is_active),
        sortOrder: Number(row.sort_order),
    };
}

export async function adminListSpecialties() {
    const rows = await query("SELECT * FROM specialties ORDER BY sort_order, id");
    return rows.map(toSpecialty);
}

export async function adminUpsertSpecialty(input: {
    id?: number;
    name: string;
    slug: string;
    icon: string | null;
    isActive: boolean;
    sortOrder: number;
}) {
    if (input.id) {
        await query(
            `UPDATE specialties
       SET name=$2, slug=$3, icon=$4, is_active=$5, sort_order=$6
       WHERE id=$1`,
            [
                input.id,
                input.name,
                input.slug,
                input.icon,
                input.isActive,
                input.sortOrder,
            ],
        );
        return input.id;
    }
    const rows = await query(
        `INSERT INTO specialties (name, slug, icon, is_active, sort_order)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [input.name, input.slug, input.icon, input.isActive, input.sortOrder],
    );
    return Number(rows[0].id);
}

// ---- Doctors CRUD ----
function toDoctor(row: Row): Doctor {
    return {
        id: Number(row.id),
        specialtyId: Number(row.specialty_id),
        firstName: String(row.first_name),
        lastName: String(row.last_name),
        displayName: String(row.display_name),
        requiresSurgeryHistory: toBool(row.requires_surgery_history),
        isActive: toBool(row.is_active),
        sortOrder: Number(row.sort_order),
    };
}

export async function adminListDoctors() {
    const rows = await query(
        `SELECT d.*, s.name AS specialty_name
     FROM doctors d
     JOIN specialties s ON s.id = d.specialty_id
     ORDER BY d.sort_order, d.id`,
    );
    return rows.map((r) => ({
        ...toDoctor(r),
        specialtyName: String(r.specialty_name),
    }));
}

export async function adminUpsertDoctor(input: {
    id?: number;
    specialtyId: number;
    firstName: string;
    lastName: string;
    displayName: string;
    requiresSurgeryHistory: boolean;
    isActive: boolean;
    sortOrder: number;
}) {
    if (input.id) {
        await query(
            `UPDATE doctors SET
        specialty_id=$2, first_name=$3, last_name=$4, display_name=$5,
        requires_surgery_history=$6, is_active=$7, sort_order=$8
       WHERE id=$1`,
            [
                input.id,
                input.specialtyId,
                input.firstName,
                input.lastName,
                input.displayName,
                input.requiresSurgeryHistory,
                input.isActive,
                input.sortOrder,
            ],
        );
        return input.id;
    }
    const rows = await query(
        `INSERT INTO doctors
     (specialty_id, first_name, last_name, display_name,
      requires_surgery_history, is_active, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [
            input.specialtyId,
            input.firstName,
            input.lastName,
            input.displayName,
            input.requiresSurgeryHistory,
            input.isActive,
            input.sortOrder,
        ],
    );
    return Number(rows[0].id);
}

export async function adminListSchedules(doctorId: number) {
    const rows = await query(
        `SELECT * FROM doctor_schedules
     WHERE doctor_id=$1 ORDER BY weekday, start_time`,
        [doctorId],
    );
    return rows.map(
        (row): DoctorSchedule => ({
            id: Number(row.id),
            doctorId: Number(row.doctor_id),
            weekday: Number(row.weekday),
            startTime: toHM(row.start_time),
            endTime: toHM(row.end_time),
            validFrom: String(row.valid_from),
            validUntil: row.valid_until == null ? null : String(row.valid_until),
            isActive: toBool(row.is_active),
        }),
    );
}

export async function adminUpsertSchedule(input: {
    id?: number;
    doctorId: number;
    weekday: number;
    startTime: string;
    endTime: string;
    validFrom: string;
    validUntil: string | null;
    isActive: boolean;
}) {
    if (input.id) {
        await query(
            `UPDATE doctor_schedules SET
        weekday=$2, start_time=$3, end_time=$4,
        valid_from=$5, valid_until=$6, is_active=$7
       WHERE id=$1 AND doctor_id=$8`,
            [
                input.id,
                input.weekday,
                input.startTime,
                input.endTime,
                input.validFrom,
                input.validUntil,
                input.isActive,
                input.doctorId,
            ],
        );
        return;
    }
    await query(
        `INSERT INTO doctor_schedules
     (doctor_id, weekday, start_time, end_time, valid_from, valid_until, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
            input.doctorId,
            input.weekday,
            input.startTime,
            input.endTime,
            input.validFrom,
            input.validUntil,
            input.isActive,
        ],
    );
}

// ---- Appointments today ----
export async function adminListAppointmentsToday(doctorId?: number) {
    const day = getTehranDateKey(getServerNow());
    const params: (string | number)[] = [day];
    let sql = `
    SELECT a.id, a.appointment_number, a.appointment_time, a.status,
           a.has_surgery_history, a.created_at,
           d.display_name AS doctor_name,
           s.name AS specialty_name
    FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    JOIN specialties s ON s.id = a.specialty_id
    WHERE a.appointment_date = $1`;
    if (doctorId) {
        params.push(doctorId);
        sql += ` AND a.doctor_id = $2`;
    }
    sql += ` ORDER BY a.appointment_number`;

    const rows = await query(sql, params);
    return {
        day,
        items: rows.map((r) => ({
            id: Number(r.id),
            number: Number(r.appointment_number),
            time: toHM(r.appointment_time),
            status: String(r.status),
            hasSurgeryHistory:
                r.has_surgery_history === null
                    ? null
                    : toBool(r.has_surgery_history),
            doctorName: String(r.doctor_name),
            specialtyName: String(r.specialty_name),
            createdAt: new Date(r.created_at as string).toISOString(),
        })),
    };
}

// ---- Kiosks ----
export async function adminListKiosks() {
    const rows = await query(`SELECT * FROM kiosks ORDER BY code`);
    return rows.map((r) => ({
        id: Number(r.id),
        code: String(r.code),
        name: String(r.name),
        ipAddress: r.ip_address == null ? null : String(r.ip_address),
        port: r.port == null ? null : Number(r.port),
        locationNote: r.location_note == null ? null : String(r.location_note),
        isActive: toBool(r.is_active),
        lastSeenAt: r.last_seen_at
            ? new Date(r.last_seen_at as string).toISOString()
            : null,
        lastError: r.last_error == null ? null : String(r.last_error),
        printerStatus: String(r.printer_status),
    }));
}

export async function adminUpsertKiosk(input: {
    id?: number;
    code: string;
    name: string;
    ipAddress: string | null;
    port: number | null;
    locationNote: string | null;
    isActive: boolean;
    printerStatus: string;
}) {
    if (input.id) {
        await query(
            `UPDATE kiosks SET
        code=$2, name=$3, ip_address=$4, port=$5,
        location_note=$6, is_active=$7, printer_status=$8
       WHERE id=$1`,
            [
                input.id,
                input.code,
                input.name,
                input.ipAddress,
                input.port,
                input.locationNote,
                input.isActive,
                input.printerStatus,
            ],
        );
        return input.id;
    }
    const rows = await query(
        `INSERT INTO kiosks
     (code, name, ip_address, port, location_note, is_active, printer_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [
            input.code,
            input.name,
            input.ipAddress,
            input.port,
            input.locationNote,
            input.isActive,
            input.printerStatus,
        ],
    );
    return Number(rows[0].id);
}