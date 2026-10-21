import { toPersianDigits } from "@/lib/utils/persian-digits";

/**
 * تبدیل تاریخ شمسی ⇄ میلادی با خود Intl (تقویم persian)، پس همیشه با مرورگر و سرور هم‌خوان است.
 * همه‌ی تاریخ‌ها به‌صورت متن «YYYY-MM-DD» (میلادی) یا سه‌تایی (jy, jm, jd) هستند.
 */

const partsFormatter = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
    timeZone: "UTC",
    year: "numeric",
    month: "numeric",
    day: "numeric",
});

export type Jalali = { jy: number; jm: number; jd: number };

function utcNoon(iso: string): Date {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12));
}

function toIso(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export function gregorianToJalali(iso: string): Jalali {
    const parts = partsFormatter.formatToParts(utcNoon(iso));
    const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value);

    return { jy: pick("year"), jm: pick("month"), jd: pick("day") };
}

const compare = (a: Jalali, b: Jalali): number =>
    a.jy - b.jy || a.jm - b.jm || a.jd - b.jd;

/** تاریخ شمسی → «YYYY-MM-DD» میلادی؛ اگر تاریخ وجود نداشته باشد (مثلاً ۳۱ اسفند غیرکبیسه) null */
export function jalaliToGregorian(jy: number, jm: number, jd: number): string | null {
    if (!(jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31)) return null;

    const target: Jalali = { jy, jm, jd };
    // حدس اولیه: ۱ فروردین حدود ۲۱ مارس است
    let date = utcNoon(`${jy + 621}-03-21`);
    date = new Date(date.getTime() + ((jm - 1) * 30.5 + (jd - 1)) * 86_400_000);

    for (let i = 0; i < 400; i += 1) {
        const current = gregorianToJalali(toIso(date));
        const order = compare(current, target);

        if (order === 0) return toIso(date);
        date = new Date(date.getTime() + (order > 0 ? -1 : 1) * 86_400_000);
    }

    return null;
}

/** «۱۴۰۵/۰۷/۲۴»، «1405-7-24» و ... → «YYYY-MM-DD» میلادی، یا null */
export function parseJalaliInput(text: string): string | null {
    const latin = text
        .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
        .trim();
    const match = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/.exec(latin);

    if (!match) return null;

    const [jy, jm, jd] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const iso = jalaliToGregorian(jy, jm, jd);

    // ۳۱ اسفند (یا ۳۰ اسفند در سال غیرکبیسه) به روز بعد می‌رود؛ فقط تاریخ برگشتی هم‌خوان را می‌پذیریم
    if (!iso) return null;
    const back = gregorianToJalali(iso);

    return back.jy === jy && back.jm === jm && back.jd === jd ? iso : null;
}

/** «YYYY-MM-DD» میلادی → «۱۴۰۵/۰۷/۲۴» (یا با ارقام لاتین) */
export function formatJalali(iso: string, options?: { latinDigits?: boolean }): string {
    const { jy, jm, jd } = gregorianToJalali(iso);
    const text = `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;

    return options?.latinDigits ? text : toPersianDigits(text);
}

export function addDays(iso: string, days: number): string {
    return toIso(new Date(utcNoon(iso).getTime() + days * 86_400_000));
}

/** نخستین روز ماه شمسی تاریخ داده‌شده */
export function startOfJalaliMonth(iso: string): string {
    const { jy, jm } = gregorianToJalali(iso);
    return jalaliToGregorian(jy, jm, 1) as string;
}