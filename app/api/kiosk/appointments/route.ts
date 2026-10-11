import { NextRequest, NextResponse } from "next/server";
import { createAppointment } from "@/lib/kiosk/appointment-service";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const specialtyId = Number(body.specialtyId);
        const doctorId = Number(body.doctorId);

        const nationalId =
            typeof body.nationalId === "string" ? body.nationalId : null;

        const mobile =
            typeof body.mobile === "string" ? body.mobile : null;

        if (!Number.isInteger(specialtyId) || specialtyId <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "شناسه تخصص نامعتبر است",
                },
                { status: 400 }
            );
        }

        if (!Number.isInteger(doctorId) || doctorId <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "شناسه پزشک نامعتبر است",
                },
                { status: 400 }
            );
        }

        if (!nationalId && !mobile) {
            return NextResponse.json(
                {
                    success: false,
                    message: "کد ملی یا شماره موبایل الزامی است",
                },
                { status: 400 }
            );
        }

        const nationality =
            body.nationality === "iranian" || body.nationality === "foreign"
                ? body.nationality
                : nationalId
                    ? "iranian"
                    : mobile
                        ? "foreign"
                        : null;

        if (!nationality) {
            return NextResponse.json(
                {
                    success: false,
                    message: "ملیت نامعتبر است",
                },
                { status: 400 }
            );
        }

        // تاریخ/ساعت نوبت را کلاینت نمی‌فرستد؛ سرور داخل createAppointment می‌سازد
        const appointment = await createAppointment({
            specialtyId,
            doctorId,
            nationality,
            nationalId,
            mobile,
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
        console.error("POST /api/kiosk/appointments error", error);

        const message =
            error instanceof Error && error.message
                ? error.message
                : "خطا در ایجاد نوبت";

        //throw error 400
        const businessErrors = [
            "کد ملی یا شماره موبایل الزامی است",
            "تخصص معتبر نیست",
            "پزشک معتبر نیست",
            "پزشک برای امروز برنامه حضور ندارد",
            "در حال حاضر خارج از ساعت حضور پزشک است",
        ];

        const status = businessErrors.includes(message) ? 400 : 500;

        return NextResponse.json(
            {
                success: false,
                message,
            },
            { status }
        );
    }
}