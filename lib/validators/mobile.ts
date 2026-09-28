/**
 * اعتبارسنجی شماره موبایل ایران
 *
 * فرمت مورد قبول:
 * 09xxxxxxxxx
 *
 * یعنی دقیقاً ۱۱ رقم و شروع با 09
 */
export function isValidIranianMobile(
    value: string
): boolean {
    return /^09\d{9}$/.test(value);
}