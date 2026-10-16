import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/session";
import { adminListAppointmentsToday } from "@/lib/db/admin-repositories";

export async function GET(request: NextRequest) {
    try {
        await requireAdminSession();
    } catch {
        return NextResponse.json(
            { success: false, message: "ابتدا وارد شوید" },
            { status: 401 },
        );
    }
    try {
        const raw = request.nextUrl.searchParams.get("doctorId");
        const doctorId =
            raw && Number.isInteger(Number(raw)) ? Number(raw) : undefined;
        const data = await adminListAppointmentsToday(doctorId);
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("GET appointments/today", error);
        return NextResponse.json(
            { success: false, message: "خطا در دریافت نوبت‌ها" },
            { status: 500 },
        );
    }
}