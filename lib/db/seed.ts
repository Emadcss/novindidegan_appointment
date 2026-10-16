import {
    doctorSchedules,
    doctors,
    scheduleExceptions,
    specialties,
} from "../../../../../Downloads/novindidegan_appointment-latest/novindidegan_appointment/data/kiosk-data";
import type { Exec } from "@/lib/db/connection";

/** جدول‌هایی که با شناسه‌ی صریح پر می‌شوند و شمارنده‌ی شناسه‌شان باید جلو برود */
const TABLES_WITH_SEEDED_IDS = [
    "specialties",
    "doctors",
    "doctor_schedules",
    "schedule_exceptions",
];

/**
 * فقط وقتی دیتابیس کاملاً خالی است، داده‌ی اولیه (تخصص‌ها، پزشکان و برنامه‌ها) را از
 * data/kiosk-data.ts وارد می‌کند. بعد از آن، دیتابیس مرجع است و این فایل دیگر چیزی را
 * بازنویسی نمی‌کند (تغییرات بعدی از پنل ادمین می‌آید).
 * (داخل تراکنش و قفل راه‌اندازی صدا زده می‌شود؛ پس دو پروسه‌ی هم‌زمان دوبار seed نمی‌کنند.)
 */
export async function seedIfEmpty(exec: Exec): Promise<void> {
    const rows = await exec("SELECT COUNT(*) AS n FROM specialties");

    if (Number(rows[0]?.n ?? 0) > 0) return;

    for (const item of specialties) {
        await exec(
            "INSERT INTO specialties (id, name, slug, icon, is_active, sort_order) VALUES ($1, $2, $3, $4, $5, $6)",
            [item.id, item.name, item.slug, item.icon, item.isActive, item.sortOrder],
        );
    }

    for (const item of doctors) {
        await exec(
            `INSERT INTO doctors
             (id, specialty_id, first_name, last_name, display_name, requires_surgery_history, is_active, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                item.id,
                item.specialtyId,
                item.firstName,
                item.lastName,
                item.displayName,
                item.requiresSurgeryHistory,
                item.isActive,
                item.sortOrder,
            ],
        );
    }

    for (const item of doctorSchedules) {
        await exec(
            `INSERT INTO doctor_schedules
             (id, doctor_id, weekday, start_time, end_time, valid_from, valid_until, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                item.id,
                item.doctorId,
                item.weekday,
                item.startTime,
                item.endTime,
                item.validFrom,
                item.validUntil,
                item.isActive,
            ],
        );
    }

    for (const item of scheduleExceptions) {
        await exec(
            `INSERT INTO schedule_exceptions
             (id, doctor_id, date, type, start_time, end_time, reason, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                item.id,
                item.doctorId,
                item.date,
                item.type,
                item.startTime,
                item.endTime,
                item.reason,
                item.isActive,
            ],
        );
    }

    // شناسه‌ها صریح وارد شدند؛ شمارنده‌ی خودکار باید بعد از بزرگ‌ترین شناسه ادامه دهد
    // (وگرنه ردیف بعدی که از پنل ادمین اضافه شود با شناسه‌ی موجود برخورد می‌کند)
    for (const table of TABLES_WITH_SEEDED_IDS) {
        await exec(
            `SELECT setval(pg_get_serial_sequence('${table}', 'id'),
                           COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`,
        );
    }
}
