import { toPersianDigits } from "@/lib/utils/persian-digits";
import { formatJalali } from "@/lib/utils/jalali";

export const fa = (value: string | number): string => toPersianDigits(value);

export function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(iso: string): string {
    const date = new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Tehran" });
    return `${formatJalali(date)} ${formatTime(iso)}`;
}

/** «۳۰ ثانیه پیش»، «۲ دقیقه پیش»، «۵ ساعت پیش»، «۳ روز پیش» */
export function relativeTime(iso: string | null, now: number): string {
    if (!iso) return "—";

    const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
    if (seconds < 5) return "همین الان";
    if (seconds < 60) return `${fa(seconds)} ثانیه پیش`;
    if (seconds < 3600) return `${fa(Math.round(seconds / 60))} دقیقه پیش`;
    if (seconds < 86_400) return `${fa(Math.round(seconds / 3600))} ساعت پیش`;
    return `${fa(Math.round(seconds / 86_400))} روز پیش`;
}

export function formatDuration(ms: number): string {
    const minutes = Math.round(ms / 60_000);
    if (minutes < 1) return "کمتر از ۱ دقیقه";
    if (minutes < 60) return `${fa(minutes)} دقیقه`;
    const hours = Math.floor(minutes / 60);
    return `${fa(hours)} ساعت${minutes % 60 ? ` و ${fa(minutes % 60)} دقیقه` : ""}`;
}

export const STATUS_LABELS: Record<string, string> = {
    booked: "در انتظار",
    completed: "انجام‌شده",
    cancelled: "لغو‌شده",
    no_show: "عدم مراجعه",
};

export const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

export const EVENT_LABELS: Record<string, string> = {
    went_offline: "قطع شد",
    came_online: "وصل شد",
    first_connection: "اولین اتصال",
    alert_opened: "هشدار",
    alert_resolved: "برطرف شد",
    paired: "جفت شد",
    revoked: "جفت‌سازی باطل شد",
    pairing_code: "کد جفت‌سازی",
    notify_failed: "خطای اعلان",
};