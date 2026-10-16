
import { NextResponse } from "next/server";

import { query } from "@/lib/db/connection";
import { verifyPassword } from "@/lib/admin/password";
import {
    createAdminSession,
    SESSION_DURATION_SECONDS,
} from "@/lib/admin/session";

export const runtime = "nodejs";

const COOKIE_NAME = "novin_admin_session";

export async function POST(request: Request) {
    try {
        const url = new URL(request.url);
        const origin = request.headers.get("origin");

        if (origin && origin !== url.origin) {
            return NextResponse.json(
                { error: "درخواست نامعتبر است." },
                { status: 403 },
            );
        }

        const body: unknown = await request.json();

        if (
            typeof body !== "object" ||
            body === null ||
            !("username" in body) ||
            !("password" in body) ||
            typeof body.username !== "string" ||
            typeof body.password !== "string"
        ) {
            return NextResponse.json(
                { error: "نام کاربری و رمز عبور الزامی است." },
                { status: 400 },
            );
        }

        const username = body.username.trim();
        const password = body.password;

        if (
            username.length < 1 ||
            username.length > 100 ||
            password.length < 1 ||
            password.length > 1024
        ) {
            return NextResponse.json(
                { error: "اطلاعات ورود نامعتبر است." },
                { status: 400 },
            );
        }

        const rows = await query(
            `SELECT username, password_hash
             FROM admin_users
             WHERE username = $1
             LIMIT 1`,
            [username],
        );

        const admin = rows[0];

        if (
            !admin ||
            typeof admin.username !== "string" ||
            typeof admin.password_hash !== "string" ||
            !(await verifyPassword(password, admin.password_hash))
        ) {
            return NextResponse.json(
                { error: "نام کاربری یا رمز عبور اشتباه است." },
                { status: 401 },
            );
        }

        const token = createAdminSession(admin.username);
        const response = NextResponse.json({ ok: true });

        response.cookies.set(COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: SESSION_DURATION_SECONDS,
        });

        return response;
    } catch (error) {
        console.error("Admin login failed:", error);

        return NextResponse.json(
            { error: "ورود انجام نشد. تنظیمات سرور را بررسی کنید." },
            { status: 500 },
        );
    }
}
