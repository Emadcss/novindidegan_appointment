import { NextRequest, NextResponse } from "next/server";
import { getAvailableDoctorsForSpecialty } from "@/lib/kiosk/kiosk-service";
import { KioskError } from "@/lib/kiosk/errors";
import { errorResponse } from "@/lib/kiosk/http";
import { authorizeKiosk } from "@/lib/kiosk/kiosk-auth";
import { getServerNow } from "@/lib/time/server-clock";

export async function GET(request: NextRequest) {
    try {
        await authorizeKiosk(request);

        const specialtyId = request.nextUrl.searchParams.get("specialtyId");

        if (!specialtyId) {
            throw new KioskError("VALIDATION", "شناسه تخصص ارسال نشده است");
        }

        const parsedSpecialtyId = Number(specialtyId);

        if (!Number.isInteger(parsedSpecialtyId) || parsedSpecialtyId <= 0) {
            throw new KioskError("VALIDATION", "شناسه تخصص نامعتبر است");
        }

        return NextResponse.json({
            success: true,
            data: await getAvailableDoctorsForSpecialty(parsedSpecialtyId, getServerNow()),
        });
    } catch (error) {
        return errorResponse(error, "GET /api/kiosk/doctors error:");
    }
}