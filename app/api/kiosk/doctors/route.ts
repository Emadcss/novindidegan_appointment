import { NextRequest, NextResponse} from "next/server";
import  {
    getAvailableDoctorsForSpecialty
} from "@/lib/kiosk/kiosk-service";

export async function GET(
    request: NextRequest
) {
    try {
        const specialtyId =
            request.nextUrl.searchParams.get(
                "specialtyId"
            );

        if (!specialtyId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "شناسه تخصص ارسال نشده است",
                },
                { status: 400 }
            );
        }

        const parsedSpecialtyId =
            Number(specialtyId);

        if (
            !Number.isInteger(parsedSpecialtyId) ||
            parsedSpecialtyId <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "شناسه تخصص نامعتبر است"
                },
                { status: 400 }
            );
        }

        const doctors =
            getAvailableDoctorsForSpecialty(
                parsedSpecialtyId,
                new Date()
            );

        return NextResponse.json({
            success: true,
            data: doctors,
        });
    } catch (error) {
        console.error(
            "GET /api/kiosk/doctors error:",
            error
        );

        return NextResponse.json(
            {
            success: false,
            message: "خطا در دریافت پزشکان",
            },
            { status: 500 }
            );
    }
}