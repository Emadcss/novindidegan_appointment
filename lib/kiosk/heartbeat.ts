import { KioskError } from "@/lib/kiosk/errors";
import type { HeartbeatPayload } from "@/lib/monitoring/types";

const text = (value: unknown, max: number): string | null =>
    typeof value === "string" && value !== "" ? value.slice(0, max) : null;

const finite = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

/** ورودی نبض را پاک‌سازی و محدود می‌کند (داده‌ی کیوسک قابل اعتماد نیست) */
export function parseHeartbeat(body: Record<string, unknown>, nowMs: number): HeartbeatPayload {
    const screen = (body.screen ?? null) as Record<string, unknown> | null;
    const width = finite(screen?.width);
    const height = finite(screen?.height);

    const clientTime = typeof body.clientTime === "string" ? Date.parse(body.clientTime) : NaN;
    const errors = finite(body.recentErrors);

    if (errors !== null && errors < 0) {
        throw new KioskError("VALIDATION", "داده‌ی نبض نامعتبر است");
    }

    return {
        step: text(body.step, 40) ?? "unknown",
        appVersion: text(body.appVersion, 40),
        uptimeSec: finite(body.uptimeSec) === null ? null : Math.max(0, Math.round(finite(body.uptimeSec) as number)),
        screen: width !== null && height !== null ? { width: Math.round(width), height: Math.round(height) } : null,
        online: typeof body.online === "boolean" ? body.online : null,
        recentErrors: errors === null ? 0 : Math.min(Math.round(errors), 9_999),
        clockDriftMs: Number.isNaN(clientTime) ? null : Math.round(clientTime - nowMs),
        userAgent: text(body.userAgent, 300),
    };
}