import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/session";
import {
    adminListDoctors,
    adminUpsertDoctor,
} from "@/lib/db/admin-repositories";

export async function GET() {
    try {
        await requireAdminSession();
    } catch {
        return NextResponse.json(
            { success: false, message: "ابتدا وارد شوید" },
            { status: 401 },
        );
    }
    try {
        const data = await adminListDoctors();
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("GET /api/admin/doctors", error);
        return NextResponse.json(
            { success: false, message: "خطا در دریافت پزشکان" },
            { status: 500 },
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireAdminSession();
    } catch {
        return NextResponse.json(
            { success: false, message: "ابتدا وارد شوید" },
            { status: 401 },
        );
    }
    try {
        const body = await request.json();
        const specialtyId = Number(body.specialtyId);
        const firstName = String(body.firstName ?? "").trim();
        const lastName = String(body.lastName ?? "").trim();
        const displayName = String(body.displayName ?? "").trim();

        if (!Number.isInteger(specialtyId) || specialtyId <= 0) {
            return NextResponse.json(
                { success: false, message: "تخصص نامعتبر است" },
                { status: 400 },
            );
        }
        if (!firstName || !lastName || !displayName) {
            return NextResponse.json(
                { success: false, message: "نام پزشک ناقص است" },
                { status: 400 },
            );
        }

        const id = await adminUpsertDoctor({
            id: body.id != null ? Number(body.id) : undefined,
            specialtyId,
            firstName,
            lastName,
            displayName,
            requiresSurgeryHistory: Boolean(body.requiresSurgeryHistory),
            isActive: body.isActive !== false,
            sortOrder: Number(body.sortOrder ?? 0),
        });
        return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
        console.error("POST /api/admin/doctors", error);
        return NextResponse.json(
            { success: false, message: "خطا در ذخیره پزشک" },
            { status: 500 },
        );
    }
}