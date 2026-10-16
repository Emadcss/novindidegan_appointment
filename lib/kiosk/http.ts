import { NextResponse } from "next/server";
import { isKioskError, KioskError } from "@/lib/kiosk/errors";

/** بدنه‌ی JSON را می‌خواند؛ اگر شیء معتبر نباشد خطای ۴۰۰ می‌دهد */
export async function readJsonObject(
    request: Request,
): Promise<Record<string, unknown>> {
    const body: unknown = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new KioskError("VALIDATION", "درخواست نامعتبر است");
    }

    return body as Record<string, unknown>;
}

/**
 * خطاهای شناخته‌شده با پیام فارسی و کد مناسب برمی‌گردند؛
 * خطای ناشناخته فقط لاگ می‌شود و پیام داخلی آن به کلاینت نمی‌رسد.
 */
export function errorResponse(error: unknown, logLabel: string) {
    if (isKioskError(error)) {
        return NextResponse.json(
            { success: false, code: error.code, message: error.message },
            { status: error.status },
        );
    }

    console.error(logLabel, error);

    return NextResponse.json(
        {
            success: false,
            code: "INTERNAL",
            message: "خطای داخلی سرور. دوباره تلاش کنید یا به پذیرش مراجعه کنید",
        },
        { status: 500 },
    );
}
