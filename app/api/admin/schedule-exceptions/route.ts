import { NextResponse } from "next/server";

import { requireAdminApi, rejectCrossOrigin } from "@/lib/admin/api";
import { query, withTransaction, advisoryLock } from "@/lib/db/connection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
type ExceptionType = "disabled" | "override";

function todayInTehran(): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tehran",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
}

function isRealDate(value: string): boolean {
    if (!DATE_PATTERN.test(value)) return false;
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function GET() {
    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    try {
        const [doctors, exceptions] = await Promise.all([
            query(`
                SELECT d.id, d.display_name, s.name AS specialty_name, d.is_active
                FROM doctors d
                JOIN specialties s ON s.id = d.specialty_id
                ORDER BY s.sort_order, d.sort_order, d.display_name
            `),
            query(`
                SELECT
                    se.id,
                    se.doctor_id,
                    d.display_name AS doctor_name,
                    s.name AS specialty_name,
                    se.date::text AS date,
                    se.type,
                    TO_CHAR(se.start_time, 'HH24:MI') AS start_time,
                    TO_CHAR(se.end_time, 'HH24:MI') AS end_time,
                    se.reason,
                    se.is_active
                FROM schedule_exceptions se
                JOIN doctors d ON d.id = se.doctor_id
                JOIN specialties s ON s.id = d.specialty_id
                WHERE se.date >= $1::date - 30
                ORDER BY se.date ASC, s.sort_order, d.display_name
            `, [todayInTehran()]),
        ]);

        return NextResponse.json({ doctors, exceptions });
    } catch (error) {
        console.error("Admin schedule exceptions GET error:", error);
        return NextResponse.json(
            { error: "دریافت استثناهای تقویم انجام نشد." },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    let body: Record<string, unknown>;
    try {
        const parsed: unknown = await request.json();
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("invalid body");
        }
        body = parsed as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: "اطلاعات ارسالی معتبر نیست." }, { status: 400 });
    }

    const doctorId = Number(body.doctorId);
    const date = typeof body.date === "string" ? body.date : "";
    const type = body.type;
    const startTime = typeof body.startTime === "string" ? body.startTime : "";
    const endTime = typeof body.endTime === "string" ? body.endTime : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!Number.isSafeInteger(doctorId) || doctorId < 1 || !isRealDate(date) || date < todayInTehran()) {
        return NextResponse.json(
            { error: "پزشک و تاریخ امروز یا یکی از روزهای آینده را انتخاب کنید." },
            { status: 400 },
        );
    }
    if (type !== "disabled" && type !== "override") {
        return NextResponse.json({ error: "نوع استثنا معتبر نیست." }, { status: 400 });
    }
    if (type === "override" && (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime) || startTime >= endTime)) {
        return NextResponse.json(
            { error: "برای برنامه جایگزین، ساعت شروع و پایان معتبر لازم است." },
            { status: 400 },
        );
    }
    if (reason.length > 300) {
        return NextResponse.json({ error: "علت استثنا نباید بیشتر از ۳۰۰ نویسه باشد." }, { status: 400 });
    }

    try {
        const exception = await withTransaction(async () => {
            await advisoryLock(43, doctorId);
            const doctor = await query("SELECT id FROM doctors WHERE id = $1", [doctorId]);
            if (doctor.length === 0) throw new Error("DOCTOR_NOT_FOUND");

            const rows = await query(`
                INSERT INTO schedule_exceptions
                    (doctor_id, date, type, start_time, end_time, reason, is_active)
                VALUES ($1, $2::date, $3, $4::time, $5::time, $6, TRUE)
                ON CONFLICT (doctor_id, date) WHERE is_active
                DO UPDATE SET
                    type = EXCLUDED.type,
                    start_time = EXCLUDED.start_time,
                    end_time = EXCLUDED.end_time,
                    reason = EXCLUDED.reason,
                    is_active = TRUE
                RETURNING
                    id, doctor_id, date::text AS date, type,
                    TO_CHAR(start_time, 'HH24:MI') AS start_time,
                    TO_CHAR(end_time, 'HH24:MI') AS end_time,
                    reason, is_active
            `, [doctorId, date, type as ExceptionType, type === "override" ? startTime : null, type === "override" ? endTime : null, reason || null]);
            return rows[0];
        });
        return NextResponse.json({ exception }, { status: 201 });
    } catch (error) {
        if (error instanceof Error && error.message === "DOCTOR_NOT_FOUND") {
            return NextResponse.json({ error: "پزشک انتخاب‌شده پیدا نشد." }, { status: 404 });
        }
        console.error("Admin schedule exceptions POST error:", error);
        return NextResponse.json({ error: "ثبت استثنای تقویم انجام نشد." }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;
    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    let body: Record<string, unknown>;
    try {
        const parsed: unknown = await request.json();
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid body");
        body = parsed as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: "اطلاعات ارسالی معتبر نیست." }, { status: 400 });
    }

    const id = Number(body.id);
    if (!Number.isSafeInteger(id) || id < 1 || typeof body.isActive !== "boolean") {
        return NextResponse.json({ error: "شناسه یا وضعیت استثنا معتبر نیست." }, { status: 400 });
    }

    try {
        const rows = await query(
            "UPDATE schedule_exceptions SET is_active = $2 WHERE id = $1 RETURNING id, is_active",
            [id, body.isActive],
        );
        if (!rows.length) return NextResponse.json({ error: "استثنای موردنظر پیدا نشد." }, { status: 404 });
        return NextResponse.json({ exception: rows[0] });
    } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code === "23505") {
            return NextResponse.json(
                { error: "برای این پزشک و تاریخ، یک استثنای فعال دیگر وجود دارد." },
                { status: 409 },
            );
        }
        console.error("Admin schedule exceptions PATCH error:", error);
        return NextResponse.json({ error: "تغییر وضعیت استثنا انجام نشد." }, { status: 500 });
    }
}
