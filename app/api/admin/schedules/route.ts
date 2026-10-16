
import { NextResponse } from "next/server";

import { requireAdminApi, rejectCrossOrigin } from "@/lib/admin/api";
import { query } from "@/lib/db/connection";

const WEEKDAYS = new Set([0, 1, 2, 3, 4, 5, 6]);

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
    if (!DATE_PATTERN.test(value)) return false;

    const date = new Date(`${value}T00:00:00Z`);

    return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
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
        ORDER BY s.sort_order, s.name, d.sort_order, d.last_name
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
        ORDER BY d.last_name, ds.weekday, ds.start_time, ds.valid_from
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
    const weekday = Number(body.weekday);
    const startTime =
        typeof body.startTime === "string" ? body.startTime : "";
    const endTime =
        typeof body.endTime === "string" ? body.endTime : "";
    const validFrom =
        typeof body.validFrom === "string" ? body.validFrom : "";
    const validUntil =
        typeof body.validUntil === "string" && body.validUntil
            ? body.validUntil
            : null;

    if (
        !Number.isSafeInteger(doctorId) ||
        doctorId < 1 ||
        !WEEKDAYS.has(weekday) ||
        !TIME_PATTERN.test(startTime) ||
        !TIME_PATTERN.test(endTime) ||
        startTime >= endTime ||
        !isValidDate(validFrom) ||
        (validUntil !== null &&
            (!isValidDate(validUntil) || validUntil < validFrom))
    ) {
        return NextResponse.json(
            { error: "روز، ساعت یا بازهٔ اعتبار برنامه صحیح نیست." },
            { status: 400 },
        );
    }

    try {
        const doctor = await query(
            `SELECT id FROM doctors WHERE id = $1 AND is_active = TRUE`,
            [doctorId],
        );

        if (doctor.length === 0) {
            return NextResponse.json(
                { error: "پزشک انتخاب‌شده وجود ندارد یا غیرفعال است." },
                { status: 404 },
            );
        }

        // جلوگیری از هم‌پوشانی ساعت‌ها در بازه‌های اعتبار مشترک
        const conflicts = await query(
            `
        SELECT id
        FROM doctor_schedules
        WHERE doctor_id = $1
          AND weekday = $2
          AND is_active = TRUE
          AND valid_from <= COALESCE($5::date, '9999-12-31'::date)
          AND COALESCE(valid_until, '9999-12-31'::date) >= $4::date
          AND (start_time, end_time)
              OVERLAPS ($3::time, $6::time)
        LIMIT 1
      `,
            [
                doctorId,
                weekday,
                startTime,
                validFrom,
                validUntil,
                endTime,
            ],
        );

        if (conflicts.length > 0) {
            return NextResponse.json(
                {
                    error:
                        "این برنامه با برنامهٔ فعال دیگری از همین پزشک هم‌پوشانی دارد.",
                },
                { status: 409 },
            );
        }

        const inserted = await query(
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
        VALUES ($1, $2, $3::time, $4::time, $5::date, $6::date, TRUE)
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
                weekday,
                startTime,
                endTime,
                validFrom,
                validUntil,
            ],
        );

        return NextResponse.json({ schedule: inserted[0] }, { status: 201 });
    } catch (error) {
        console.error("خطا در ثبت برنامهٔ پزشک:", error);

        return NextResponse.json(
            { error: "ثبت برنامهٔ پزشک انجام نشد." },
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
                { error: "برنامهٔ موردنظر پیدا نشد." },
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
