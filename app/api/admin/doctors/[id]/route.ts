
import { NextResponse } from "next/server";
import { query } from "@/lib/db/connection";
import {
    rejectCrossOrigin,
    requireAdminApi,
} from "@/lib/admin/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
    const originError = rejectCrossOrigin(request);
    if (originError) return originError;

    const auth = await requireAdminApi();
    if (auth.response) return auth.response;

    const { id: rawId } = await context.params;
    const id = Number(rawId);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return NextResponse.json(
            { error: "شناسه پزشک معتبر نیست." },
            { status: 400 },
        );
    }

    try {
        const body: unknown = await request.json();

        if (!body || typeof body !== "object") {
            return NextResponse.json(
                { error: "اطلاعات ارسالی معتبر نیست." },
                { status: 400 },
            );
        }

        const data = body as Record<string, unknown>;

        // تغییر وضعیت مستقل از ویرایش مشخصات
        if (typeof data.is_active === "boolean" &&
            Object.keys(data).length === 1) {
            const rows = await query(
                `UPDATE doctors
         SET is_active = $1
         WHERE id = $2
         RETURNING id, is_active`,
                [data.is_active, id],
            );

            if (rows.length === 0) {
                return NextResponse.json(
                    { error: "پزشک پیدا نشد." },
                    { status: 404 },
                );
            }

            return NextResponse.json({ doctor: rows[0] });
        }

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
                { error: "اطلاعات پزشک معتبر نیست." },
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
            `UPDATE doctors
       SET specialty_id = $1,
           first_name = $2,
           last_name = $3,
           display_name = $4,
           requires_surgery_history = $5,
           sort_order = $6
       WHERE id = $7
       RETURNING id, specialty_id, first_name, last_name,
         display_name, requires_surgery_history, is_active, sort_order`,
            [
                specialtyId,
                firstName,
                lastName,
                displayName,
                requiresSurgeryHistory,
                sortOrder,
                id,
            ],
        );

        if (rows.length === 0) {
            return NextResponse.json(
                { error: "پزشک پیدا نشد." },
                { status: 404 },
            );
        }

        return NextResponse.json({ doctor: rows[0] });
    } catch (error) {
        console.error("Admin doctors PATCH error:", error);
        return NextResponse.json(
            { error: "ذخیره تغییرات پزشک انجام نشد." },
            { status: 500 },
        );
    }
}
