import { NextRequest, NextResponse } from "next/server";
import { addKioskEvent } from "@/lib/db/kiosk-repo";
import { KioskError } from "@/lib/kiosk/errors";
import { errorResponse, readJsonObject } from "@/lib/kiosk/http";
import { pairWithCode, setKioskCookie } from "@/lib/kiosk/kiosk-auth";

/** جفت‌سازی کیوسک با کد یک‌بارمصرفی که ادمین از پنل صادر کرده است */
export async function POST(request: NextRequest) {
    try {
        const body = await readJsonObject(request);
        const result = await pairWithCode(String(body.code ?? ""));

        if (!result.ok) {
            if (result.reason === "RATE_LIMITED") {
                return NextResponse.json(
                    { success: false, code: "RATE_LIMITED", message: "تلاش بیش از حد؛ یک دقیقه بعد دوباره امتحان کنید" },
                    { status: 429 },
                );
            }
            throw new KioskError("VALIDATION", "کد جفت‌سازی نامعتبر یا منقضی شده است");
        }

        await addKioskEvent({
            kioskId: result.kiosk.id,
            type: "paired",
            severity: "info",
            message: "کیوسک جفت شد",
        });

        const response = NextResponse.json({ success: true, data: { kioskName: result.kiosk.name } });
        setKioskCookie(response, result.token);
        return response;
    } catch (error) {
        return errorResponse(error, "POST /api/kiosk/pair error:");
    }
}