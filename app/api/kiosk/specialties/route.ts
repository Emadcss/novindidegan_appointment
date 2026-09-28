import {NextResponse} from "next/server";
import {
    getAvailableSpecialtiesForDate, getSpecialtyById
} from "@/lib/kiosk/kiosk-service";

export async function GET() {
    try {
        const specialties =
            getAvailableSpecialtiesForDate(new Date());

        return NextResponse.json({
            success: true,
            data: specialties,
        });
    } catch (error) {
        console.error(
            "Get /api/kiosk/specialties error:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message: "خطا در دریافت تخصص ها",
            },
            { status: 500 }
        );
    }
}