// lib/persian-date.ts

type DateInput = string | number | Date | null | undefined;

function toValidDate(value: DateInput): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/** تاریخ کامل با روز هفته → سه‌شنبه ۲۵ شهریور ۱۴۰۵ */
export function formatPersianDateFull(value: DateInput): string {
    const date = toValidDate(value);
    if (!date) return "";

    const parts =  new Intl.DateTimeFormat("fa-IR", {
        calendar: "persian",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).formatToParts(date);

    const weekday= parts.find((p) => p.type === "weekday")?.value ?? "";
    const day=parts.find((p) => p.type === "day")?.value ?? "";
    const month=parts.find((p) => p.type === "month")?.value ?? "";
    const year=parts.find((p) => p.type === "year")?.value ?? "";

    return `${weekday}، ${day} ${month} ${year}`;
}

/** تاریخ عددی → ۱۴۰۵/۰۶/۲۵ */
export function formatPersianDate(value: DateInput): string {
    const date = toValidDate(value);
    if (!date) return "";

    return new Intl.DateTimeFormat("fa-IR", {
        calendar: "persian",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

/** ساعت با ثانیه (برای ساعت زنده هدر) → ۱۴:۳۰:۴۵ */
export function formatPersianTimeWithSeconds(value: DateInput): string {
    const date = toValidDate(value);
    if (!date) return "";

    return new Intl.DateTimeFormat("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(date);
}

/** ساعت بدون ثانیه → ۱۴:۳۰ */
export function formatPersianTime(value: DateInput): string {
    const date = toValidDate(value);
    if (!date) return "";

    return new Intl.DateTimeFormat("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);
}

/** تاریخ + ساعت (مناسب قبض) */
export function formatPersianDateTime(value: DateInput): string {
    const date = toValidDate(value);
    if (!date) return "";

    return `${formatPersianDateFull(date)} - ${formatPersianTime(date)}`;
}