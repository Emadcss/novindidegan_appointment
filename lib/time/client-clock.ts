let anchorServerMs: number | null = null;
let anchorPerformanceMs: number | null = null;
let synced = false;

export async function syncServerTime(): Promise<void> {
    const startedAt = performance.now();

    const response = await fetch("/api/kiosk/server-time", {
        cache: "no-store",
    });

    const receivedAt = performance.now();

    if (!response.ok) {
        throw new Error("همگام سازی ساعت سرور ناموفق بود");
    }

    const json = await response.json();

    if (!json?.success || typeof json?.date?.serverTime !== "string") {
        throw new Error("پاسخ ساعت سرور معتبر نیست");
    }

    const serverMs = new Date(json.data.serverTime).getTime();

    if (!Number.isFinite(serverMs)) {
        throw new Error("رمان دریافتی از سرور معتبر نیست");
    }

    // زمان دریافت پاسخ را با تقریب نیمه راه درخواست و پاسخ هم‌تراز می‌کنیم.
    const midpoint = startedAt + (receivedAt - startedAt) / 2;

    anchorServerMs = serverMs;
    anchorPerformanceMs = midpoint;
    synced = true;
}

export function getServerNow(): Date {
    if (anchorServerMs === null || anchorPerformanceMs === null) {
        throw new Error("ساعت کلاینت هنوز با سرور همگام نشده است");
    }

    const elapsed = performance.now() - anchorPerformanceMs;

    return new Date(anchorServerMs + elapsed);
}

export function isServerTimeSynced(): boolean {
    return synced;
}