import { NextRequest, NextResponse } from "next/server";
import { findAdminByUsername } from "@/lib/db/admin-repositories";
import { verifyPassword } from "@/lib/admin/password";
import { setAdminSession } from "@/lib/admin/session";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const username = String(body.username ?? "").trim();
        const password = String(body.password ?? "");

        if (!username || !password) {
            return NextResponse.json(
                { success: false, message: "نام کاربری و رمز عبور الزامی است" },
                { status: 400 },
            );
        }

        const user = await findAdminByUsername(username);
        if (!user || !verifyPassword(password, user.passwordHash)) {
            return NextResponse.json(
                { success: false, message: "نام کاربری یا رمز عبور نادرست است" },
                { status: 401 },
            );
        }

        await setAdminSession(user.username);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("POST /api/admin/login", error);
        return NextResponse.json(
            { success: false, message: "خطا در ورود" },
            { status: 500 },
        );
    }
}