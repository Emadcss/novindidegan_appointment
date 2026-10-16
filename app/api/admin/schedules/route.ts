import { NextResponse } from "next/server";

import { requireAdminApi, rejectCrossOrigin } from "@/lib/admin/api";
import {
    advisoryLock,
    query,
    withTransaction,
} from "@/lib/db/connection";

const WEEKDAYS = new Set([0, 1, 2, 3, 4, 5, 6]);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

type ShiftInput = {
    weekday: number;
    startTime: string;
    endTime: string;
};

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

function getWeekdayLabel(weekday: number): string {
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
                    d.last_name
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
                    ds.weekday,
                    ds.start_time,
                    ds.id
            `),
        ]);

        return NextResponse.json({ doctors, schedules });
    } catch (error) {
        console.error("خطا در دریافت برنامه‌های پزشکان:", error);

        return NextResponse.json(
            { error: "دریافت برنامه‌های پزشکان انجام نشد." },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    const auth = await requireAdminApi();

    if (auth.response) return auth.response;

    const originError = rejectCrossOrigin(request);
    if (originError) return originError;

    let body: Record<string, unknown>;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "اطلاعات ارسالی معتبر نیست." },
            { status: 400 },
        );
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
        return NextResponse.json(
            {
                error:
                    "پزشک و حداقل یک شیفت معتبر برای روزهای هفته لازم است.",
            },
            { status: 400 },
        );
    }

    const shifts = rawShifts as ShiftInput[];

    // بررسی تداخل بین شیفت‌های همین درخواست
    for (let i = 0; i < shifts.length; i++) {
        for (let j = i + 1; j < shifts.length; j++) {
            if (overlaps(shifts[i], shifts[j])) {
                return NextResponse.json(
                    {
                        error: `شیفت‌های روز ${getWeekdayLabel(
                            shifts[i].weekday,
                        )} با یکدیگر هم‌پوشانی دارند.`,
                    },
                    { status: 409 },
                );
            }
        }
    }

    try {
        const inserted = await withTransaction(async () => {
            // درخواست‌های هم‌زمان برای یک پزشک پشت سر هم بررسی می‌شوند.
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

            // بررسی تداخل با برنامه‌های قبلی فعال.
            // برنامهٔ جدید از امروز به بعد معتبر است.
            for (const shift of shifts) {
                const conflicts = await query(
                    `
                        SELECT id
                        FROM doctor_schedules
                        WHERE doctor_id = $1
                          AND weekday = $2
                          AND is_active = TRUE
                          AND valid_from <= '9999-12-31'::date
                          AND COALESCE(
                                valid_until,
                                '9999-12-31'::date
                              ) >= $3::date
                          AND (start_time, end_time)
                              OVERLAPS ($4::time, $5::time)
                        LIMIT 1
                    `,
                    [
                        doctorId,
                        shift.weekday,
                        today,
                        shift.startTime,
                        shift.endTime,
                    ],
                );

                if (conflicts.length > 0) {
                    throw new Error(
                        `SHIFT_CONFLICT:${shift.weekday}`,
                    );
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
                        VALUES (
                            $1,
                            $2,
                            $3::time,
                            $4::time,
                            $5::date,
                            NULL,
                            TRUE
                        )
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

        return NextResponse.json(
            { schedules: inserted },
            { status: 201 },
        );
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "";

        if (message === "DOCTOR_NOT_FOUND") {
            return NextResponse.json(
                {
                    error:
                        "پزشک انتخاب‌شده وجود ندارد یا غیرفعال است.",
                },
                { status: 404 },
            );
        }

        if (message.startsWith("SHIFT_CONFLICT:")) {
            const weekday = Number(message.split(":")[1]);

            return NextResponse.json(
                {
                    error: `شیفت روز ${getWeekdayLabel(
                        weekday,
                    )} با برنامهٔ فعال قبلی پزشک هم‌پوشانی دارد. ابتدا برنامهٔ قبلی را غیرفعال کنید یا ساعت‌ها را تغییر دهید.`,
                },
                { status: 409 },
            );
        }

        console.error("خطا در ثبت برنامه هفتگی پزشک:", error);

        return NextResponse.json(
            { error: "ثبت برنامه هفتگی پزشک انجام نشد." },
            { status: 500 },
        );
    }
}

export async function PATCH(request: Request) {
    const auth = await requireAdminApi();

    if (auth.response) return auth.response;

    const originError = rejectCrossOrigin(request);
    if (originError) return originError;

    let body: Record<string, unknown>;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "اطلاعات ارسالی معتبر نیست." },
            { status: 400 },
        );
    }

    const id = Number(body.id);

    if (
        !Number.isSafeInteger(id) ||
        id < 1 ||
        typeof body.isActive !== "boolean"
    ) {
        return NextResponse.json(
            { error: "شناسه یا وضعیت برنامه معتبر نیست." },
            { status: 400 },
        );
    }

    try {
        const updated = await query(
            `
                UPDATE doctor_schedules
                SET is_active = $2
                WHERE id = $1
                RETURNING id, is_active
            `,
            [id, body.isActive],
        );

        if (updated.length === 0) {
            return NextResponse.json(
                { error: "برنامه موردنظر پیدا نشد." },
                { status: 404 },
            );
        }

        return NextResponse.json({ schedule: updated[0] });
    } catch (error) {
        console.error("خطا در تغییر وضعیت برنامه:", error);

        return NextResponse.json(
            { error: "تغییر وضعیت برنامه انجام نشد." },
            { status: 500 },
        );
    }
}