import { NextRequest, NextResponse } from "next/server";
import { runDbSelfCheck } from "@/lib/db/self-check";

/**
 * خودآزمایی دیتابیس (فقط در حالت توسعه).
 *   /api/dev/db-check          ← بررسی‌های پایه با داده‌ی ساختگی
 *   /api/dev/db-check?e2e=1    ← ثبت نوبت واقعی هم‌زمان هم آزمایش می‌شود
 */
export async function GET(request: NextRequest) {
    if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
            { success: false, message: "فقط در حالت توسعه فعال است" },
            { status: 404 },
        );
    }

    const e2e = request.nextUrl.searchParams.get("e2e") === "1";

    try {
        const results = await runDbSelfCheck({ e2e });

        return NextResponse.json({
            allOk: results.every((item) => item.ok),
            results,
        });
    } catch (error) {
        return NextResponse.json(
            {
                allOk: false,
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
