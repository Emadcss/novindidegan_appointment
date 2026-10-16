import { KioskError } from "@/lib/kiosk/errors";
import { normalizeDigits } from "@/lib/utils/persian-digits";
import { isValidIranianMobile } from "@/lib/validators/mobile";
import { isValidIranianNationalId } from "@/lib/validators/national-id";
import type { Nationality } from "@/types/kiosk";

export type Identity = {
    nationality: Nationality;
    nationalId: string | null;
    mobile: string | null;
};

/**
 * مشخصات بیمار را از بدنه‌ی درخواست می‌خواند، ارقام فارسی/عربی را نرمال می‌کند
 * و اعتبار آن را (دوباره، سمت سرور) بررسی می‌کند.
 * فقط مشخصه‌ی متناسب با ملیت پذیرفته می‌شود.
 */
export function parseIdentity(body: Record<string, unknown>): Identity {
    const nationality = body.nationality;

    if (nationality !== "iranian" && nationality !== "foreign") {
        throw new KioskError("VALIDATION", "ملیت نامعتبر است");
    }

    if (nationality === "iranian") {
        const nationalId = normalizeDigits(String(body.nationalId ?? ""));

        if (!isValidIranianNationalId(nationalId)) {
            throw new KioskError("VALIDATION", "کد ملی معتبر نیست");
        }

        return { nationality, nationalId, mobile: null };
    }

    const mobile = normalizeDigits(String(body.mobile ?? ""));

    if (!isValidIranianMobile(mobile)) {
        throw new KioskError("VALIDATION", "شماره موبایل معتبر نیست");
    }

    return { nationality, nationalId: null, mobile };
}
