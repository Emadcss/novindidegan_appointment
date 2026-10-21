import type { Severity   } from "@/lib/monitoring/types";

export type NotificationPayload = {
    kind: "opened" | "resolved";
    severity: Severity;
    kioskId: number;
    kioskName: string;
    code: string;
    message: string;
    occurredAt: string;
};

export function formatNotificationText(payload: NotificationPayload): string {
    const icon =
        payload.kind === "resolved"
            ? "✅"
            : payload.severity === "critical"
                ? "🔴"
                : payload.severity === "warning"
                    ? "🟠"
                    : "ℹ️";
    const suffix = payload.kind === "resolved" ? " (برطرف شد)" : "";

    return `${icon} کیوسک «${payload.kioskName}»: ${payload.message}${suffix}`;
}

/**
 * ارسال اعلان به webhook (متغیر ALERT_WEBHOOK_URL). بدنه‌ی JSON شامل فیلد text است و جزئیات.
 * با Slack/Mattermost و بیشتر پل‌های پیام‌رسان که فیلد text می‌خواهند سازگار است.
 * هیچ‌وقت خطا پرتاب نمی‌کند؛ نتیجه برگردانده می‌شود.
 */
export async function sendNotification(
    payload: NotificationPayload,
): Promise<{ sent: boolean; skipped: boolean; error?: string }> {
    const url = process.env.ALERT_WEBHOOK_URL?.trim();

    if (!url) return { sent: false, skipped: true };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: formatNotificationText(payload), ...payload }),
            signal: AbortSignal.timeout(5_000),
        });

        if (!response.ok) {
            return { sent: false, skipped: false, error: `HTTP ${response.status}` };
        }

        return { sent: true, skipped: false };
    } catch (error) {
        return {
            sent: false,
            skipped: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}