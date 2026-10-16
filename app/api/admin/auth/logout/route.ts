
import { NextResponse } from "next/server";

const COOKIE_NAME = "novin_admin_session";

export async function POST(request: Request) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");

    if (origin && origin !== url.origin) {
        return NextResponse.json(
            { error: "درخواست نامعتبر است." },
            { status: 403 },
        );
    }

    const response = NextResponse.json({ ok: true });

    response.cookies.set(COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 0,
    });

    return response;
}
