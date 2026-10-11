

/**
 * لحظه فعلی سرور.
 *
 * خروجی یک Date استاندارد است که منطقه زمانی در آن ذخیره نشده؛
 * تبدیل به تاریخ و ساعت تهران باید با توابع tehran-time انجام شود.
 */

export function getServerNow(): Date {
    return new Date();
}