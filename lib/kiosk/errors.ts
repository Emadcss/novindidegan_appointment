export type KioskErrorCode =
    | "VALIDATION"
    | "NOT_FOUND"
    | "OUT_OF_SCHEDULE"
    | "DUPLICATE"
    | "LIMIT"
    | "UNPAIRED";

const STATUS_BY_CODE: Record<KioskErrorCode, number> = {
    VALIDATION: 400,
    NOT_FOUND: 404,
    OUT_OF_SCHEDULE: 409,
    DUPLICATE: 409,
    LIMIT: 409,
    UNPAIRED: 401,
};

/**
 * خطای قابل‌نمایش به بیمار.
 * پیام فارسی است و وضعیت HTTP از روی code تعیین می‌شود
 * (دیگر نیازی به مقایسه‌ی متن خطا نیست).
 */
export class KioskError extends Error {
    readonly code: KioskErrorCode;
    readonly status: number;

    constructor(code: KioskErrorCode, message: string) {
        super(message);
        this.name = "KioskError";
        this.code = code;
        this.status = STATUS_BY_CODE[code];
    }
}

export function isKioskError(error: unknown): error is KioskError {
    return (
        error instanceof KioskError ||
        (error instanceof Error && error.name === "KioskError")
    );
}
