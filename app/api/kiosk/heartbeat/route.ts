import { NextRequest, NextResponse } from "next/server";
import { KioskError } from "@/lib/kiosk/errors";
import { parseHeartbeat } from "@/lib/kiosk/heartbeat";
import { errorResponse, readJsonObject } from "@/lib/kiosk/http";
import { resolveKiosk } from "@/lib/kiosk/kiosk-auth";
import { MONITOR } from "@/lib/monitoring/config";
import { handleHeartbeat } from "@/lib/monitoring/monitor";

/** نبض کیوسک: «زنده‌ام» + وضعیت مرورگر. فقط برای کیوسک جفت‌شده. */
export async function POST(request: NextRequest) {
    try {
        const kiosk = await resolveKiosk(request);

        if (!kiosk) {
            throw new KioskError("UNPAIRED", "این دستگاه به‌عنوان کیوسک ثبت نشده است");
        }

        const payload = parseHeartbeat(await readJsonObject(request), Date.now());
        await handleHeartbeat(kiosk, payload);

        return NextResponse.json({
            success: true,
            data: { serverTime: new Date().toISOString(), intervalMs: MONITOR.heartbeatIntervalMs },
        });
    } catch (error) {
        return errorResponse(error, "POST /api/kiosk/heartbeat error:");
    }
}