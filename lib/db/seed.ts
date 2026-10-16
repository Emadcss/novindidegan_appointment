
import {
    doctorSchedules,
    doctors,
    scheduleExceptions,
    specialties,
} from "@/data/kiosk-data";

import type { Exec } from "@/lib/db/connection";
import { hashPassword } from "@/lib/admin/password";

/**
 * جدول‌هایی که داده اولیه آن‌ها با شناسه مشخص وارد می‌شود.
 * بعد از seed باید sequence مربوط به شناسه‌ها تنظیم شود.
 */
const TABLES_WITH_SEEDED_IDS = [
    "specialties",
    "doctors",
    "doctor_schedules",
    "schedule_exceptions",
] as const;

/**
 * فقط در صورت خالی بودن جدول ادمین‌ها، ادمین اولیه ایجاد می‌شود.
 *
 * برای امنیت، رمز عبور از ADMIN_PASSWORD دریافت می‌شود؛
 * رمز پیش‌فرض و ثابت در کد قرار نمی‌دهیم.
 */
export async function ensureAdminUser(exec: Exec): Promise<void> {
    const existingAdmins = await exec(
        "SELECT id FROM admin_users LIMIT 1",
    );

    if (existingAdmins.length > 0) {
        return;
    }

    const username = process.env.ADMIN_USERNAME?.trim() || "admin";
    const password = process.env.ADMIN_PASSWORD;

    if (!password || password.length < 12) {
        throw new Error(
            "برای ساخت ادمین اولیه، ADMIN_PASSWORD را در .env.local تنظیم کنید؛ رمز باید حداقل ۱۲ کاراکتر داشته باشد.",
        );
    }

    await exec(
        `
        INSERT INTO admin_users (username, password_hash)
        VALUES ($1, $2)
        ON CONFLICT (username) DO NOTHING
        `,
        [username, await hashPassword(password)],
    );

    // بررسی نهایی؛ در صورت شکست درج، راه‌اندازی نباید موفق تلقی شود.
    const createdAdmins = await exec(
        "SELECT id FROM admin_users LIMIT 1",
    );

    if (createdAdmins.length === 0) {
        throw new Error("ساخت ادمین اولیه انجام نشد.");
    }
}

/**
 * ایجاد کیوسک‌های نمونه فقط وقتی جدول خالی است.
 * اطلاعات کیوسک‌های موجود را بازنویسی نمی‌کند.
 */
export async function ensureDemoKiosks(exec: Exec): Promise<void> {
    const existingKiosks = await exec(
        "SELECT id FROM kiosks LIMIT 1",
    );

    if (existingKiosks.length > 0) {
        return;
    }

    await exec(
        `
        INSERT INTO kiosks (
            code,
            name,
            ip_address,
            port,
            location_note,
            printer_status
        )
        VALUES
            ('K1', 'کیوسک ورودی', '192.168.1.21', 3000, 'لابی', 'unknown'),
            ('K2', 'کیوسک طبقه اول', '192.168.1.22', 3000, 'نزدیک پذیرش', 'unknown')
        ON CONFLICT (code) DO NOTHING
        `,
    );
}

/**
 * وارد کردن داده‌های اولیه کاتالوگ.
 *
 * اگر تخصصی از قبل وجود داشته باشد، هیچ داده‌ای را بازنویسی نمی‌کنیم.
 * اگر جدول تخصص‌ها خالی اما جدول‌های وابسته دارای اطلاعات باشند،
 * به‌جای seed کورکورانه خطا می‌دهیم تا داده‌ها آسیب نبینند.
 */
export async function seedIfEmpty(exec: Exec): Promise<void> {
    const specialtyRows = await exec(
        "SELECT COUNT(*) AS n FROM specialties",
    );

    const specialtyCount = Number(specialtyRows[0]?.n ?? 0);

    if (specialtyCount > 0) {
        return;
    }

    const dependentTables = [
        "doctors",
        "doctor_schedules",
        "schedule_exceptions",
    ] as const;

    for (const table of dependentTables) {
        const rows = await exec(
            `SELECT COUNT(*) AS n FROM ${table}`,
        );

        if (Number(rows[0]?.n ?? 0) > 0) {
            throw new Error(
                `جدول specialties خالی است، اما جدول ${table} اطلاعات دارد. برای جلوگیری از تغییر ناخواسته داده‌ها، seed متوقف شد.`,
            );
        }
    }

    // تخصص‌ها
    for (const item of specialties) {
        await exec(
            `
            INSERT INTO specialties (
                id,
                name,
                slug,
                icon,
                is_active,
                sort_order
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            `,
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

    // پزشکان
    for (const item of doctors) {
        await exec(
            `
            INSERT INTO doctors (
                id,
                specialty_id,
                first_name,
                last_name,
                display_name,
                requires_surgery_history,
                is_active,
                sort_order
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `,
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

    // برنامه‌های هفتگی پزشکان
    for (const item of doctorSchedules) {
        await exec(
            `
            INSERT INTO doctor_schedules (
                id,
                doctor_id,
                weekday,
                start_time,
                end_time,
                valid_from,
                valid_until,
                is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `,
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

    // استثناهای برنامه پزشکان
    for (const item of scheduleExceptions) {
        await exec(
            `
            INSERT INTO schedule_exceptions (
                id,
                doctor_id,
                date,
                type,
                start_time,
                end_time,
                reason,
                is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `,
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

    // چون شناسه‌ها به‌صورت صریح وارد شدند، sequence را تنظیم می‌کنیم.
    for (const table of TABLES_WITH_SEEDED_IDS) {
        await exec(
            `
            SELECT setval(
                pg_get_serial_sequence('${table}', 'id'),
                COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1,
                false
            )
            `,
        );
    }
}
