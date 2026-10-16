import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/session";
import {
    adminListKiosks,
    adminUpsertKiosk,
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
        const data = await adminListKiosks();
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("GET kiosks", error);
        return NextResponse.json(
            { success: false, message: "خطا در دریافت کیوسک‌ها" },
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
        const code = String(body.code ?? "").trim();
        const name = String(body.name ?? "").trim();
        if (!code || !name) {
            return NextResponse.json(
                { success: false, message: "کد و نام الزامی است" },
                { status: 400 },
            );
        }
        const printerStatus = String(body.printerStatus ?? "unknown");
        if (!["ok", "paper_low", "offline", "unknown"].includes(printerStatus)) {
            return NextResponse.json(
                { success: false, message: "وضعیت چاپگر نامعتبر است" },
                { status: 400 },
            );
        }
        const id = await adminUpsertKiosk({
            id: body.id != null ? Number(body.id) : undefined,
            code,
            name,
            ipAddress:
                body.ipAddress == null || body.ipAddress === ""
                    ? null
                    : String(body.ipAddress),
            port:
                body.port == null || body.port === "" ? null : Number(body.port),
            locationNote:
                body.locationNote == null || body.locationNote === ""
                    ? null
                    : String(body.locationNote),
            isActive: body.isActive !== false,
            printerStatus,
        });
        return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
        console.error("POST kiosks", error);
        return NextResponse.json(
            { success: false, message: "خطا در ذخیره کیوسک" },
            { status: 500 },
        );
    }
}