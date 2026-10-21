import { APP_TIMEZONE } from "@/lib/time/constants";

const tehranDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
});

export type TehranDateParts = {
    year: string;
    month: string;
    day: string;
    weekday: string;
    hour: string;
    minute: string;
    second: string;
};

/**
 * اجزای تاریخ و ساعت یک لحظه بر اساس منطقه زمانی تهران.
 * ورودی Date باید نشان‌دهنده یک لحظه واقعی باشد، نه تاریخ محلی ساختگی.
 */

export function getTehranDateParts(date: Date): TehranDateParts {
    if (Number.isNaN(date.getTime())) {
        throw new Error("تاریخ ورودی معتبر نیست");
    }

    const parts = tehranDateTimeFormatter.formatToParts(date);

    const values = Object.fromEntries(
        parts
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value]),
    );

    return {
        year: values.year,
        month: values.month,
        day: values.day,
        weekday: values.weekday,
        hour: values.hour,
        minute: values.minute,
        second: values.second,
    };
}
    /** تاریخ میلادی تهران با قالب ثابت YYYY-MM-DD */
    export function getTehranDateKey(date: Date): string {
        const parts = getTehranDateParts(date);

        return `${parts.year}-${parts.month}-${parts.day}`;
    }

    /**
     * شماره روز هفته مطابق قرارداد فعلی پروژه:
     * شنبه = 0، یکشنبه = 1، ...، جمعه = 6
     */

    export function getTehranWeekday(date: Date): number {
        const weekdayMap: Record<string, number> = {
            Sat: 0,
            Sun: 1,
            Mon: 2,
            Tue: 3,
            Wed: 4,
            Thu: 5,
            Fri: 6,
        };

        const weekday = getTehranDateParts(date).weekday;
        const result = weekdayMap[weekday];

        if (result === undefined) {
            throw new Error(`روز هفته نامعتبر است: ${weekday}`);
        }

        return result;
    }

    /** ساعت تهران با ثانیه، در قالب HH:mm:ss */
    export function getTehranTime(date: Date): string {
        const parts = getTehranDateParts(date);

        return `${parts.hour}:${parts.minute}:${parts.second}`;
    }

    /** ساعت تهران بدون ثانیه، در قالب HH:mm */

    export function getTehranTimeWithoutSeconds(date: Date): string {
        const parts = getTehranDateParts(date);

        return `${parts.hour}:${parts.minute}`;
    }

    /** تبدیل HH:mm یا HH:mm:ss به تعداد ثانیه از ابتدای روز */

    export function timeToSeconds(time: string): number {
        const parts = time.split(":");

        if (parts.length < 2 || parts.length > 3) {
            throw new Error(`قالب ساعت نامعتبر است: ${time}`);
        }

        const [hours, minutes, seconds = "0"] = parts;

        if (
            !/^\d{1,2}$/.test(hours) ||
            !/^\d{1,2}$/.test(minutes) ||
            !/^\d{1,2}$/.test(seconds)
        ) {
            throw new Error(`قالب ساعت نامعتبر است: ${time}`);
        }

        const h = Number(hours);
        const m = Number(minutes);
        const s = Number(seconds);

        if (h > 23 || m > 59 || s > 59) {
            throw new Error(`مقدار ساعت خارج از محدوده است: ${time}`);
        }

        return h * 3600 + m * 60 + s;
    }