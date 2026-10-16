import { query } from "@/lib/db/connection";
import type { Row } from "@/lib/db/connection";
import { hashIdentifier, protectIdentifier } from "@/lib/db/crypto";

import type {
    Appointment,
    AppointmentStatus,
    Doctor,
    DoctorSchedule,
    Nationality,
    ScheduleException,
    Specialty,
} from "../../../../../Downloads/novindidegan_appointment-latest/novindidegan_appointment/types/kiosk";

/**
 * تمام کوئری‌های SQL پروژه اینجاست. سرویس‌ها (lib/kiosk) فقط همین توابع را صدا می‌زنند
 * و SQL نمی‌نویسند. پارامترها به‌صورت $1، $2، ... هستند.
 */

const toBool = (value: unknown): boolean => value === true || Number(value) === 1;
const toNullableString = (value: unknown): string | null =>
    value === null || value === undefined ? null : String(value);
/** ساعت از PostgreSQL به‌صورت «HH:MM:SS» می‌آید؛ برنامه «HH:MM» می‌خواهد */
const toHourMinute = (value: unknown): string => String(value).slice(0, 5);
const toNullableHourMinute = (value: unknown): string | null =>
    value === null || value === undefined ? null : toHourMinute(value);

// ------------------------------------------------------------
// کاتالوگ: تخصص، پزشک، برنامه
// ------------------------------------------------------------

function toSpecialty(row: Row): Specialty {
    return {
        id: Number(row.id),
        name: String(row.name),
        slug: String(row.slug),
        icon: toNullableString(row.icon),
        isActive: toBool(row.is_active),
        sortOrder: Number(row.sort_order),
    };
}

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

function toSchedule(row: Row): DoctorSchedule {
    return {
        id: Number(row.id),
        doctorId: Number(row.doctor_id),
        weekday: Number(row.weekday),
        startTime: toHourMinute(row.start_time),
        endTime: toHourMinute(row.end_time),
        validFrom: String(row.valid_from),
        validUntil: toNullableString(row.valid_until),
        isActive: toBool(row.is_active),
    };
}

function toException(row: Row): ScheduleException {
    return {
        id: Number(row.id),
        doctorId: Number(row.doctor_id),
        date: String(row.date),
        type: String(row.type) as ScheduleException["type"],
        startTime: toNullableHourMinute(row.start_time),
        endTime: toNullableHourMinute(row.end_time),
        reason: toNullableString(row.reason),
        isActive: toBool(row.is_active),
    };
}

export async function listSpecialties(): Promise<Specialty[]> {
    const rows = await query("SELECT * FROM specialties ORDER BY sort_order, id");
    return rows.map(toSpecialty);
}

export async function getSpecialty(id: number): Promise<Specialty | null> {
    const rows = await query("SELECT * FROM specialties WHERE id = $1", [id]);
    return rows[0] ? toSpecialty(rows[0]) : null;
}

export async function listDoctors(): Promise<Doctor[]> {
    const rows = await query("SELECT * FROM doctors ORDER BY sort_order, id");
    return rows.map(toDoctor);
}

export async function getDoctor(id: number): Promise<Doctor | null> {
    const rows = await query("SELECT * FROM doctors WHERE id = $1", [id]);
    return rows[0] ? toDoctor(rows[0]) : null;
}

/** برنامه‌ی هفتگی معتبر پزشک برای یک روز هفته و یک تاریخ (YYYY-MM-DD) */
export async function listRegularSchedules(
    doctorId: number,
    weekday: number,
    dateKey: string,
): Promise<DoctorSchedule[]> {
    const rows = await query(
        `SELECT * FROM doctor_schedules
         WHERE doctor_id = $1 AND weekday = $2 AND is_active = TRUE
           AND valid_from <= $3
           AND (valid_until IS NULL OR valid_until >= $3)
         ORDER BY start_time`,
        [doctorId, weekday, dateKey],
    );

    return rows.map(toSchedule);
}

export async function findActiveException(
    doctorId: number,
    dateKey: string,
): Promise<ScheduleException | null> {
    const rows = await query(
        `SELECT * FROM schedule_exceptions
         WHERE doctor_id = $1 AND date = $2 AND is_active = TRUE`,
        [doctorId, dateKey],
    );

    return rows[0] ? toException(rows[0]) : null;
}

// ------------------------------------------------------------
// بیمار
// ------------------------------------------------------------

type Identity = { nationalId: string | null; mobile: string | null };

/** شناسه‌ی بیمار بر اساس کد ملی یا موبایل (جستجو با hash) */
export async function findPatientId(identity: Identity): Promise<number | null> {
    if (identity.nationalId) {
        const rows = await query(
            "SELECT id FROM patients WHERE national_id_hash = $1",
            [hashIdentifier("nid", identity.nationalId)],
        );
        if (rows[0]) return Number(rows[0].id);
    }

    if (identity.mobile) {
        const rows = await query(
            "SELECT id FROM patients WHERE mobile_hash = $1",
            [hashIdentifier("mob", identity.mobile)],
        );
        if (rows[0]) return Number(rows[0].id);
    }

    return null;
}

/**
 * بیمار را پیدا می‌کند یا می‌سازد.
 * ⚠ برای جلوگیری از ساخته شدن هم‌زمان دو بار، باید زیر advisoryLock همان هویت صدا زده شود.
 */
export async function getOrCreatePatientId(
    input: Identity & { nationality: Nationality },
): Promise<number> {
    const existing = await findPatientId(input);
    if (existing !== null) return existing;

    const nid = input.nationalId
        ? protectIdentifier("nid", input.nationalId)
        : null;
    const mob = input.mobile ? protectIdentifier("mob", input.mobile) : null;

    const rows = await query(
        `INSERT INTO patients
         (nationality, national_id_hash, national_id_enc, mobile_hash, mobile_enc, created_at)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
            input.nationality,
            nid?.hash ?? null,
            nid?.enc ?? null,
            mob?.hash ?? null,
            mob?.enc ?? null,
            new Date().toISOString(),
        ],
    );

    return Number(rows[0]?.id);
}

// ------------------------------------------------------------
// نوبت و شمارنده
// ------------------------------------------------------------

function toAppointment(row: Row): Appointment {
    return {
        id: Number(row.id),
        patientId: Number(row.patient_id),
        specialtyId: Number(row.specialty_id),
        doctorId: Number(row.doctor_id),
        appointmentDate: String(row.appointment_date),
        appointmentTime: toHourMinute(row.appointment_time),
        appointmentNumber: Number(row.appointment_number),
        hasSurgeryHistory:
            row.has_surgery_history === null ? null : toBool(row.has_surgery_history),
        status: String(row.status) as AppointmentStatus,
        requestId: toNullableString(row.request_id),
        createdAt: new Date(row.created_at as string | Date).toISOString(),
    };
}

export async function findAppointmentByRequestId(
    requestId: string,
): Promise<Appointment | null> {
    const rows = await query("SELECT * FROM appointments WHERE request_id = $1", [
        requestId,
    ]);

    return rows[0] ? toAppointment(rows[0]) : null;
}

/** نوبت‌های فعال (booked) یک بیمار در یک روز، جدیدترین اول */
export async function listBookedAppointments(
    patientId: number,
    dateKey: string,
): Promise<Appointment[]> {
    const rows = await query(
        `SELECT * FROM appointments
         WHERE patient_id = $1 AND appointment_date = $2 AND status = 'booked'
         ORDER BY id DESC`,
        [patientId, dateKey],
    );

    return rows.map(toAppointment);
}

/**
 * شماره‌ی بعدی صف (تخصص، پزشک، روز) به‌صورت اتمیک.
 * ردیف شمارنده تا پایان تراکنش قفل می‌ماند؛ پس دو ثبت هم‌زمان شماره‌ی یکسان نمی‌گیرند.
 * باید داخل withTransaction صدا زده شود تا با ثبت نوبت یکپارچه باشد.
 */
export async function incrementCounter(
    specialtyId: number,
    doctorId: number,
    dayKey: string,
): Promise<number> {
    const rows = await query(
        `INSERT INTO daily_counters (specialty_id, doctor_id, day, last_number)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (specialty_id, doctor_id, day)
         DO UPDATE SET last_number = daily_counters.last_number + 1
         RETURNING last_number`,
        [specialtyId, doctorId, dayKey],
    );

    return Number(rows[0]?.last_number);
}

export async function insertAppointment(input: {
    patientId: number;
    specialtyId: number;
    doctorId: number;
    appointmentDate: string;
    appointmentTime: string;
    appointmentNumber: number;
    hasSurgeryHistory: boolean | null;
    requestId: string | null;
}): Promise<Appointment> {
    const rows = await query(
        `INSERT INTO appointments
         (patient_id, specialty_id, doctor_id, appointment_date, appointment_time,
          appointment_number, has_surgery_history, status, request_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'booked', $8, $9)
         RETURNING *`,
        [
            input.patientId,
            input.specialtyId,
            input.doctorId,
            input.appointmentDate,
            input.appointmentTime,
            input.appointmentNumber,
            input.hasSurgeryHistory,
            input.requestId,
            new Date().toISOString(),
        ],
    );

    return toAppointment(rows[0] as Row);
}
