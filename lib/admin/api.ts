
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin/session";

export async function requireAdminApi() {
    const token = (await cookies()).get("novin_admin_session")?.value;
    const session = await verifyAdminSession(token);

    if (!session) {
        return {
            session: null,
            response: NextResponse.json(
                { error: "نشست مدیر معتبر نیست. دوباره وارد شوید." },
                { status: 401 },
            ),
        };
    }

    return { session, response: null };
}

export function rejectCrossOrigin(request: Request) {
    const origin = request.headers.get("origin");

    if (!origin) return null;

    try {
        if (new URL(origin).origin !== new URL(request.url).origin) {
            return NextResponse.json(
                { error: "درخواست از مبدأ نامعتبر ارسال شده است." },
                { status: 403 },
            );
        }
    } catch {
        return NextResponse.json(
            { error: "مبدأ درخواست معتبر نیست." },
            { status: 403 },
        );
    }

    return null;
}
