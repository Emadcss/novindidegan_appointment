import {NextResponse} from "next/server";
import {
    getAvailableSpecialtiesForDate,
} from "@/lib/kiosk/kiosk-service";
import { getServerNow } from "@/lib/time/server-clock";

export async function GET() {
    try {
        const specialties =
            getAvailableSpecialtiesForDate(getServerNow());

        return NextResponse.json({
            success: true,
            data: specialties,
        });
    } catch {
        return NextResponse.json(
            {
                success: false,
                message: "خطا در دریافت تخصص ها",
            },
            { status: 500 }
        );
    }
}