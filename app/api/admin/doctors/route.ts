
import { NextResponse } from "next/server";
import { query } from "@/lib/db/connection";
import {
    rejectCrossOrigin,
    requireAdminApi,
} from "@/lib/admin/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    try {
        const [doctors, specialties] = await Promise.all([
            query(`
        SELECT
          d.id,
          d.specialty_id,
          d.first_name,
          d.last_name,
          d.display_name,
          d.requires_surgery_history,
          d.is_active,
          d.sort_order,
          s.name AS specialty_name
        FROM doctors d
        JOIN specialties s ON s.id = d.specialty_id
        ORDER BY s.sort_order, d.sort_order, d.last_name, d.first_name
      `),
            query(`
        SELECT id, name, is_active
        FROM specialties
        ORDER BY sort_order, name
      `),
        ]);

        return NextResponse.json({ doctors, specialties });
    } catch (error) {
        console.error("Admin doctors GET error:", error);
        return NextResponse.json(
            { error: "دریافت فهرست پزشکان انجام نشد." },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;

    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    try {
        const body: unknown = await request.json();

        if (!body || typeof body !== "object") {
            return NextResponse.json(
                { error: "اطلاعات ارسالی معتبر نیست." },
                { status: 400 },
            );
        }

        const data = body as Record<string, unknown>;
        const firstName =
            typeof data.first_name === "string" ? data.first_name.trim() : "";
        const lastName =
            typeof data.last_name === "string" ? data.last_name.trim() : "";
        const displayName =
            typeof data.display_name === "string"
                ? data.display_name.trim()
                : `${firstName} ${lastName}`.trim();
        const specialtyId = Number(data.specialty_id);
        const sortOrder = Number(data.sort_order ?? 0);
        const requiresSurgeryHistory =
            data.requires_surgery_history === true;

        if (
            !firstName ||
            !lastName ||
            !displayName ||
            firstName.length > 100 ||
            lastName.length > 100 ||
            displayName.length > 200 ||
            !Number.isSafeInteger(specialtyId) ||
            specialtyId <= 0 ||
            !Number.isSafeInteger(sortOrder) ||
            sortOrder < 0
        ) {
            return NextResponse.json(
                { error: "نام، نام خانوادگی، تخصص یا ترتیب نمایش معتبر نیست." },
                { status: 400 },
            );
        }

        const specialty = await query(
            `SELECT id FROM specialties WHERE id = $1 AND is_active = TRUE`,
            [specialtyId],
        );

        if (specialty.length === 0) {
            return NextResponse.json(
                { error: "تخصص انتخاب‌شده فعال نیست یا وجود ندارد." },
                { status: 400 },
            );
        }

        const rows = await query(
            `INSERT INTO doctors (
        specialty_id,
        first_name,
        last_name,
        display_name,
        requires_surgery_history,
        sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, specialty_id, first_name, last_name,
        display_name, requires_surgery_history, is_active, sort_order`,
            [
                specialtyId,
                firstName,
                lastName,
                displayName,
                requiresSurgeryHistory,
                sortOrder,
            ],
        );

        return NextResponse.json({ doctor: rows[0] }, { status: 201 });
    } catch (error) {
        console.error("Admin doctors POST error:", error);
        return NextResponse.json(
            { error: "ثبت پزشک انجام نشد." },
            { status: 500 },
        );
    }
}
