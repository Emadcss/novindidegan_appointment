import { NextResponse } from "next/server";
import { APP_TIMEZONE } from "@/lib/time/constants";
import { getServerNow } from "@/lib/time/server-clock";

export async function GET() {
    const now = getServerNow();

    return NextResponse.json({
        success: true,
        data: {
            serverTime: now.toISOString(),
            timezone: APP_TIMEZONE,
        },
    });
}