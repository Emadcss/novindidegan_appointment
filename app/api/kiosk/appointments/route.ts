import { NextRequest, NextResponse } from "next/server";
import { createAppointment } from "@/lib/kiosk/appointment-service";
import { KioskError } from "@/lib/kiosk/errors";
import { errorResponse, readJsonObject } from "@/lib/kiosk/http";
import { parseIdentity } from "@/lib/kiosk/identity";
import { authorizeKiosk } from "@/lib/kiosk/kiosk-auth";

function parseId(value: unknown, label: string): number {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw new KioskError("VALIDATION", `شناسه ${label} نامعتبر است`);
    }

    return id;
}

export async function POST(request: NextRequest) {
    try {
        //کیوسک جفت شده اگر باشد روی نوبت ثبت میشود تا در گزارش به تفکیک کیوسک بیاید
        const kiosk = await authorizeKiosk(request);

        const body = await readJsonObject(request);

        const identity = parseIdentity(body);
        const specialtyId = parseId(body.specialtyId, "تخصص");
        const doctorId = parseId(body.doctorId, "پزشک");

        const hasSurgeryHistory =
            typeof body.hasSurgeryHistory === "boolean"
                ? body.hasSurgeryHistory
                : null;

        const requestId =
            typeof body.requestId === "string" &&
            body.requestId.length > 0 &&
            body.requestId.length <= 100
                ? body.requestId
                : null;

        // تاریخ/ساعت نوبت را کلاینت نمی‌فرستد؛ سرور داخل createAppointment می‌سازد
        const appointment = await createAppointment({
            specialtyId,
            doctorId,
            ...identity,
            hasSurgeryHistory,
            requestId,
            kioskId: kiosk?.id ?? null,
        });

        return NextResponse.json({
            success: true,
            data: {
                appointmentId: appointment.id,
                appointmentNumber: appointment.appointmentNumber,
                appointmentDate: appointment.appointmentDate,
                appointmentTime: appointment.appointmentTime,
            },
        });
    } catch (error) {
        return errorResponse(error, "POST /api/kiosk/appointments error");
    }
}
