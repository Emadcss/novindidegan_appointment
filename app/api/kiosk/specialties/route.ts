import {NextRequest, NextResponse} from "next/server";
import {
    getAvailableSpecialtiesForDate,
} from "@/lib/kiosk/kiosk-service";
import { errorResponse } from "@/lib/kiosk/http";
import {authorizeKiosk} from "@/lib/kiosk/kiosk-auth";
import { getServerNow } from "@/lib/time/server-clock";

export async function GET(request: NextRequest) {
    try {
        await authorizeKiosk(request);

        return NextResponse.json({
            success: true,
            data: await getAvailableSpecialtiesForDate(getServerNow()),
        });
    } catch (error) {
        return errorResponse(error, "GET /api/kiosk/specialties error:");
    }
}