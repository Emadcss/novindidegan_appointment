import { NextRequest, NextResponse } from "next/server";
import { lookupPreviousAppointment } from "@/lib/kiosk/appointment-service";
import { errorResponse, readJsonObject } from "@/lib/kiosk/http";
import { parseIdentity } from "@/lib/kiosk/identity";
import { authorizeKiosk } from "@/lib/kiosk/kiosk-auth";

/** POST است تا کد ملی/موبایل در URL و لاگ‌ها نیفتد */
export async function POST(request: NextRequest) {
  try {
    await authorizeKiosk(request);

    const body = await readJsonObject(request);
    const identity = parseIdentity(body);

    return NextResponse.json({
      success: true,
      data: await lookupPreviousAppointment(identity),
    });
  } catch (error) {
    return errorResponse(error, "POST /api/kiosk/appointments/lookup error");
  }
}
