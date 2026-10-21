/** آستانه‌ها و زمان‌بندی پایش (میلی‌ثانیه) */
export const MONITOR = {
    /** هر چند وقت یک‌بار همه‌ی کیوسک‌ها بررسی شوند */
    cycleMs: 20_000,
    /** کیوسک با چه تأخیری در نبض «قطع» حساب شود (۳ نبض ازدست‌رفته) */
    offlineAfterMs: 90_000,
    /** هر چند وقت یک‌بار کیوسک نبض می‌فرستد */
    heartbeatIntervalMs: 30_000,
    probeTimeoutMs: 2_500,
    /** مشکل باید در چند بررسی پشت سر هم دیده شود تا هشدار بسازد (ضد لرزش) */
    confirmCycles: 2,
    /** مشکل باید چند بررسی پشت سر هم نباشد تا هشدار بسته شود */
    resolveCycles: 2,
    /** خطاهای ثبت‌شده در مرورگر کیوسک (۵ دقیقه‌ی اخیر) که هشدار می‌دهد */
    clientErrorsThreshold: 5,
    /** اختلاف ساعت کیوسک و سرور که هشدار می‌دهد */
    clockDriftWarnMs: 60_000,
    /** پورت پیش‌فرض چاپگرهای شبکه‌ای (RAW / JetDirect) */
    defaultPrinterPort: 9100,
} as const;

export type MonitorConfig = typeof MONITOR;