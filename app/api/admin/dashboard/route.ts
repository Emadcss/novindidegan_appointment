import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/session";
import { getDashboardStats } from "@/lib/db/admin-repositories";

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
        const data = await getDashboardStats();
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("GET /api/admin/dashboard", error);
        return NextResponse.json(
            { success: false, message: "خطا در دریافت داشبورد" },
            { status: 500 },
        );
    }
}