/**
 * اعتبارسنجی کد ملی ایران
 * - باید دقیقاً ۱۰ رقم باشد
 * - نباید همه ارقام یکسان باشند
 * - رقم کنترل (رقم آخر) باید با الگوریتم رسمی مطابقت داشته باشد
 */
export function isValidIranianNationalId(value: string): boolean {
    if (!/^\d{10}$/.test(value)) {
        return false;
    }

    // رد کردن کدهایی مثل 0000000000 یا 1111111111
    if (/^(\d)\1{9}$/.test(value)) {
        return false;
    }

    const digits = value.split("").map(Number);
    const check = digits[9];

    const sum = digits
        .slice(0, 9)
        .reduce((acc, digit, index) => acc + digit * (10 - index), 0);

    const remainder = sum % 11;

    return remainder < 2 ? check === remainder : check === 11 - remainder;
}