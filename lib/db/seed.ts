import { hashPassword } from "@/lib/admin/password";
import {
    doctorSchedules,
    doctors,
    scheduleExceptions,
    specialties,
} from "@/data/kiosk-data";
import type { Exec } from "@/lib/db/connection";

/**
 * جدول‌هایی که ID آن‌ها به‌صورت صریح وارد می‌شود.
 * نام جدول‌ها ثابت و از قبل تعیین شده است.
 */
const TABLES_WITH_SEEDED_IDS = [
    "specialties",
    "doctors",
    "doctor_schedules",
    "schedule_exceptions",
] as const;

/**
 * ایجاد مدیر اولیه.
 *
 * اگر مدیر از قبل وجود داشته باشد، هیچ تغییری نمی‌کند.
 * رمز عبور باید از متغیر محیطی دریافت شود.
 */

export async function ensureAdminUser(exec: Exec): Promise<void> {
    const username = process.env.ADMIN_USERNAME?.trim();
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
        throw new Error(
            "برای ساخت مدیر اولیه، ADMIN_USERNAME و ADMIN_PASSWORD را در .env.local تنظیم کنید.",
        );
    }

    if (password.length < 12) {
        throw new Error("رمز عبور مدیر باید حداقل ۱۲ کاراکتر داشته باشد.");
    }

    const rows = await exec(
        "SELECT id FROM admin_users WHERE username = $1 LIMIT 1",
        [username],
    );

    if (rows.length > 0) {
        return;
    }

    const passwordHash = await hashPassword(password);

    await exec(
        `INSERT INTO admin_users (username, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (username) DO NOTHING`,
        [username, passwordHash],
    );
}


/**
 * تنظیم sequence پس از ورود شناسه‌های صریح.
 *
 * اگر جدول رکورد داشته باشد، sequence روی MAX(id) تنظیم می‌شود
 * و فراخوانی بعدی nextval شناسه‌ی بعدی را می‌دهد.
 *
 * اگر جدول خالی باشد، sequence از ۱ شروع می‌شود.
 */
async function syncIdSequences(exec: Exec): Promise<void> {
    for (const table of TABLES_WITH_SEEDED_IDS) {
        await exec(
            `SELECT setval(
                pg_get_serial_sequence('${table}', 'id'),
                COALESCE((SELECT MAX(id) FROM ${table}), 1),
                EXISTS (SELECT 1 FROM ${table})
            )`,
        );
    }
}

/**
 * اضافه‌کردن دو کیوسک نمونه فقط در صورتی که جدول kiosks خالی باشد.
 *
 * توجه: این اطلاعات نمونه هستند و باید با مشخصات واقعی دستگاه‌ها
 * جایگزین شوند. در محیط عملیاتی، کیوسک‌ها بهتر است از پنل ثبت و جفت شوند.
 */
async function ensureSeedKiosks(exec: Exec): Promise<void> {
    const rows = await exec(
        "SELECT COUNT(*) AS n FROM kiosks",
    );

    if (Number(rows[0]?.n ?? 0) > 0) {
        return;
    }

    await exec(
        `INSERT INTO kiosks
            (code, name, ip_address, port, location_note, printer_status)
         VALUES
            ($1, $2, $3, $4, $5, $6),
            ($7, $8, $9, $10, $11, $12)
         ON CONFLICT (code) DO NOTHING`,
        [
            "K1",
            "کیوسک ورودی",
            "192.168.1.21",
            3000,
            "لابی",
            "unknown",
            "K2",
            "کیوسک طبقه اول",
            "192.168.1.22",
            3000,
            "نزدیک پذیرش",
            "unknown",
        ],
    );
}

/**
 * ورود داده‌های اولیه‌ی کاتالوگ.
 *
 * اگر تخصصی وجود داشته باشد، اطلاعات تخصص‌ها، پزشکان و برنامه‌ها
 * از روی فایل ثابت بازنویسی نمی‌شوند؛ از آن پس دیتابیس مرجع است.
 *
 * این تابع باید در تراکنش راه‌اندازی و زیر قفل راه‌اندازی اجرا شود.
 */
export async function seedIfEmpty(exec: Exec): Promise<void> {
    // این موارد مستقل از خالی‌بودن جدول تخصص‌ها بررسی می‌شوند.
    await ensureAdminUser(exec);
    await ensureSeedKiosks(exec);

    const specialtyRows = await exec(
        "SELECT COUNT(*) AS n FROM specialties",
    );

    if (Number(specialtyRows[0]?.n ?? 0) > 0) {
        return;
    }

    // ۱. تخصص‌ها
    for (const item of specialties) {
        await exec(
            `INSERT INTO specialties
                (id, name, slug, icon, is_active, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                item.id,
                item.name,
                item.slug,
                item.icon,
                item.isActive,
                item.sortOrder,
            ],
        );
    }

    // ۲. پزشکان
    for (const item of doctors) {
        await exec(
            `INSERT INTO doctors
                (
                    id,
                    specialty_id,
                    first_name,
                    last_name,
                    display_name,
                    requires_surgery_history,
                    is_active,
                    sort_order
                )
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

    // ۳. برنامه‌های هفتگی پزشکان
    for (const item of doctorSchedules) {
        await exec(
            `INSERT INTO doctor_schedules
                (
                    id,
                    doctor_id,
                    weekday,
                    start_time,
                    end_time,
                    valid_from,
                    valid_until,
                    is_active
                )
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

    // ۴. استثناهای برنامه‌ی حضور
    for (const item of scheduleExceptions) {
        await exec(
            `INSERT INTO schedule_exceptions
                (
                    id,
                    doctor_id,
                    date,
                    type,
                    start_time,
                    end_time,
                    reason,
                    is_active
                )
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

    // ۵. هماهنگ‌کردن sequenceها پس از ورود IDهای ثابت
    await syncIdSequences(exec);
}
