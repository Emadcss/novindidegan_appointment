import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/session";

export async function withAdmin<T>(
    fn: () => Promise<T>,
): Promise<NextResponse> {
    try {
        await requireAdminSession();
    } catch {
        return NextResponse.json(
            { success: false, message: "ابتدا وارد شوید" },
            { status: 401 },
        );
    }

    try {
        const data = await fn();
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("admin API error", error);
        const message =
            error instanceof Error ? error.message : "خطای داخلی سرور";
        return NextResponse.json(
            { success: false, message },
            { status: 500 },
        );
    }
}