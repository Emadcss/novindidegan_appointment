import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/session";
import {
    adminListSpecialties,
    adminUpsertSpecialty,
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
        const data = await adminListSpecialties();
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("GET /api/admin/specialties", error);
        return NextResponse.json(
            { success: false, message: "خطا در دریافت تخصص‌ها" },
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
        const name = String(body.name ?? "").trim();
        const slug = String(body.slug ?? "").trim();
        if (!name || !slug) {
            return NextResponse.json(
                { success: false, message: "نام و slug الزامی است" },
                { status: 400 },
            );
        }
        const id = await adminUpsertSpecialty({
            id: body.id != null ? Number(body.id) : undefined,
            name,
            slug,
            icon: body.icon == null || body.icon === "" ? null : String(body.icon),
            isActive: body.isActive !== false,
            sortOrder: Number(body.sortOrder ?? 0),
        });
        return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
        console.error("POST /api/admin/specialties", error);
        return NextResponse.json(
            { success: false, message: "خطا در ذخیره تخصص" },
            { status: 500 },
        );
    }
}