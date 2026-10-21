/** انواع مشترک پایش (بدون وابستگی به دیتابیس) */

export type KioskState =
    | "disabled"
    | "never_connected"
    | "online"
    | "warning"
    | "critical"
    | "offline";

export type Severity = "critical" | "warning" | "info";

export type MonitorIssue = {
    code: string;
    severity: Severity;
    message: string;
};

export type PaperLevel = "ok" | "near_end" | "end" | "unknown";

export type PrinterStatus = {
    /** اتصال TCP به چاپگر برقرار شد؟ */
    reachable: boolean;
    /** چاپگر به پرسش وضعیت (ESC/POS) پاسخ داد؟ */
    supported: boolean;
    online: boolean | null;
    paper: PaperLevel;
    coverOpen: boolean | null;
    /** پیام خطا (مثلاً خطای کاتر) یا null */
    error: string | null;
    latencyMs: number | null;
    checkedAt: string;
};

export type NetworkProbe = {
    ok: boolean;
    latencyMs: number | null;
    error: string | null;
};

/** داده‌ای که کیوسک در هر نبض می‌فرستد */
export type HeartbeatPayload = {
    step: string;
    appVersion: string | null;
    uptimeSec: number | null;
    screen: { width: number; height: number } | null;
    online: boolean | null;
    recentErrors: number;
    /** اختلاف ساعت کیوسک با سرور (میلی‌ثانیه، مثبت = ساعت کیوسک جلوتر) */
    clockDriftMs: number | null;
    userAgent: string | null;
};

export const STATE_LABELS: Record<KioskState, string> = {
    disabled: "غیرفعال",
    never_connected: "هنوز متصل نشده",
    online: "سالم",
    warning: "هشدار",
    critical: "مشکل جدی",
    offline: "قطع",
};