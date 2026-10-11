import { NextResponse } from "next/server";
import { APP_TIMEZONE } from "@/lib/time/constants";

export async function GET() {
    const now = new Date();

    return NextResponse.json({
        success: true,
        data: {
            serverTime: now.toISOString(),
            timezone: APP_TIMEZONE,
        },
    });
}