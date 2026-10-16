export function toPersianDigits(value: string | number): string {
    return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

/**
 * تبدیل ارقام فارسی و عربی به انگلیسی و حذف هر نویسه‌ی غیرعددی.
 * (قبلاً در NationalIdForm و MobileForm تکرار شده بود.)
 */
export function normalizeDigits(value: string): string {
    return value
        .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
        .replace(/\D/g, "");
}
