import {NextRequest, NextResponse} from "next/server";

import {createAppointment} from "@/lib/kiosk/appointment-service";

export async function POST(
    request: NextRequest,
) {
    try {
        const body = await request.json();
        const specialtyId = Number(
            body.specialtyId
        );
        const doctorId = Number(
            body.doctorId
        );
        const nationalId =
            typeof body.nationalId === "string"
                ? body.nationalId
                : null;
        const mobile =
            typeof body.mobile === "string"
                ? body.mobile
                : null;
        if (
            !Number.isInteger(specialtyId) ||
            specialtyId <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "شناسه تخصص نامعتبر است"
                },
                { status:400 }
            );
        }

        if (
            !Number.isInteger(doctorId) ||
            doctorId <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "سناسه پزشک نامعتبر است"
                },
                { status: 400 }
            );
        }

        if (!nationalId && !mobile) {
            return NextResponse.json(
                {
                    success: false,
                    message:"کد ملی یا شماره موبایل الزامی است"
                },
                { status:400 }
            );
        }

        const appointment =
            createAppointment({
                specialtyId,
                doctorId,
                nationalId,
                mobile,
            });

        return NextResponse.json({
            success: true,
            date: {
                appointmentId: appointment.id,
                appointmentNumber:
                    appointment.appointmentNumber,
                appointmentDate:
                    appointment.appointmentDate,
                appointmentTime:
                    appointment.appointmentTime,
            },
        });
    } catch (error) {
        console.error(
            "POST /api/kiosk/appointments error",
            error
        );

        return NextResponse.json({
            success: false,
            message: "خطا در ایجاد نوبت",
        },
            { status:500 }
            );
    }
}