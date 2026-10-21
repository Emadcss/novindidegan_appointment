import {
    addKioskEvent,
    getKiosk,
    listKiosks,
    listUnresolvedAlertsForKiosk,
    markAlertNotified,
    openAlert,
    recordHeartbeat,
    resolveAlert,
    saveEvaluation,
} from "@/lib/db/kiosk-repo";
import type { Alert, Kiosk } from "@/lib/db/kiosk-repo";
import { MONITOR } from "@/lib/monitoring/config";
import type { MonitorConfig } from "@/lib/monitoring/config";
import { evaluateKiosk, IMMEDIATE_CODES } from "@/lib/monitoring/evaluate";
import { sendNotification } from "@/lib/monitoring/notify";
import { queryPrinterStatus } from "@/lib/monitoring/printer-status";
import { tcpProbe } from "@/lib/monitoring/tcp";
import type {
    HeartbeatPayload,
    KioskState,
    MonitorIssue,
    NetworkProbe,
    PrinterStatus,
} from "@/lib/monitoring/types";

/**
 * حلقه‌ی پایش: هر چند ثانیه همه‌ی کیوسک‌ها را بررسی می‌کند (نبض، شبکه، چاپگر)،
 * وضعیت را ذخیره می‌کند و هشدار باز/بسته می‌کند. فقط روی «یک پروسه‌ی سرور» درست کار می‌کند.
 */

type Tracker = { seen: Map<string, number>; absent: Map<string, number> };

const globalForMonitor = globalThis as unknown as {
    __kioskMonitorTimer?: ReturnType<typeof setInterval>;
    __kioskMonitorTrackers?: Map<number, Tracker>;
    __kioskMonitorLastError?: number;
};

const trackers = (globalForMonitor.__kioskMonitorTrackers ??= new Map<number, Tracker>());

function trackerFor(kioskId: number): Tracker {
    let tracker = trackers.get(kioskId);
    if (!tracker) {
        tracker = { seen: new Map(), absent: new Map() };
        trackers.set(kioskId, tracker);
    }
    return tracker;
}

export function resetMonitorStateForTests(): void {
    trackers.clear();
}

function stateFromIssues(issues: MonitorIssue[]): KioskState {
    if (issues.some((item) => item.severity === "critical")) return "critical";
    if (issues.some((item) => item.severity === "warning")) return "warning";
    return "online";
}

async function announce(
    kind: "opened" | "resolved",
    alert: Alert,
    kiosk: Pick<Kiosk, "id" | "name">,
): Promise<void> {
    await addKioskEvent({
        kioskId: kiosk.id,
        type: kind === "opened" ? "alert_opened" : "alert_resolved",
        severity: kind === "opened" ? alert.severity : "info",
        message: kind === "opened" ? alert.message : `برطرف شد: ${alert.message}`,
    });

    const result = await sendNotification({
        kind,
        severity: alert.severity,
        kioskId: kiosk.id,
        kioskName: kiosk.name,
        code: alert.code,
        message: alert.message,
        occurredAt: new Date().toISOString(),
    });

    if (result.sent) {
        await markAlertNotified(alert.id, new Date().toISOString());
    } else if (!result.skipped) {
        await addKioskEvent({
            kioskId: kiosk.id,
            type: "notify_failed",
            severity: "warning",
            message: `ارسال اعلان انجام نشد: ${result.error ?? "نامشخص"}`,
        });
    }
}

/** هشدارهای حل‌نشده‌ی یک کیوسک را می‌بندد (برای کدهایی که شرطشان برقرار است یا همه) */
async function resolveAlerts(
    kiosk: Pick<Kiosk, "id" | "name">,
    shouldResolve: (alert: Alert) => boolean,
): Promise<void> {
    for (const alert of await listUnresolvedAlertsForKiosk(kiosk.id)) {
        if (!shouldResolve(alert)) continue;
        await resolveAlert(alert.id, new Date().toISOString());
        await announce("resolved", alert, kiosk);
    }
}

async function checkKiosk(
    kiosk: Kiosk,
    now: Date,
    config: MonitorConfig,
): Promise<void> {
    const previousState = kiosk.statusState;

    if (!kiosk.isActive) {
        if (previousState !== "disabled") {
            await saveEvaluation(kiosk.id, {
                state: "disabled",
                issues: [],
                checkedAt: now.toISOString(),
                networkLatencyMs: null,
                printer: null,
            });
        }
        await resolveAlerts(kiosk, () => true);
        trackers.delete(kiosk.id);
        return;
    }

    const hasTarget = Boolean(kiosk.ipAddress && kiosk.port);
    const hasPrinter = Boolean(kiosk.printerIp);

    const [network, printer]: [NetworkProbe | null, PrinterStatus | null] = await Promise.all([
        hasTarget
            ? tcpProbe(kiosk.ipAddress as string, kiosk.port as number, config.probeTimeoutMs)
            : Promise.resolve(null),
        hasPrinter
            ? queryPrinterStatus({
                host: kiosk.printerIp as string,
                port: kiosk.printerPort ?? config.defaultPrinterPort,
                connectTimeoutMs: config.probeTimeoutMs,
            })
            : Promise.resolve(null),
    ]);

    const { state, issues } = evaluateKiosk({
        isActive: kiosk.isActive,
        lastSeenAt: kiosk.lastSeenAt,
        lastHeartbeat: kiosk.lastHeartbeat,
        hasNetworkTarget: hasTarget,
        hasPrinter,
        now,
        network,
        printer,
        config,
    });

    // رویدادهای قطع و وصل (فقط بر اساس نبض، نه لرزش بررسی شبکه)
    if (state === "offline" && previousState !== "offline") {
        await addKioskEvent({
            kioskId: kiosk.id,
            type: "went_offline",
            severity: "critical",
            message: issues[0]?.message ?? "کیوسک قطع شد",
        });
    } else if (previousState === "offline" && state !== "offline") {
        await addKioskEvent({
            kioskId: kiosk.id,
            type: "came_online",
            severity: "info",
            message: "ارتباط کیوسک برقرار شد",
        });
    }

    // ضد لرزش: مشکل باید چند بار پشت سر هم دیده شود تا هشدار بسازد
    const tracker = trackerFor(kiosk.id);
    const present = new Set(
        issues.filter((item) => item.severity !== "info").map((item) => item.code),
    );

    for (const code of present) {
        tracker.seen.set(code, (tracker.seen.get(code) ?? 0) + 1);
        tracker.absent.delete(code);
    }
    for (const code of [...tracker.seen.keys()]) {
        if (!present.has(code)) tracker.seen.delete(code);
    }

    for (const item of issues) {
        if (item.severity === "info") continue;

        const confirmed =
            IMMEDIATE_CODES.has(item.code) ||
            (tracker.seen.get(item.code) ?? 0) >= config.confirmCycles;

        if (!confirmed) continue;

        const { alert, created } = await openAlert({
            kioskId: kiosk.id,
            code: item.code,
            severity: item.severity,
            message: item.message,
        });

        if (created) await announce("opened", alert, kiosk);
    }

    // بستن هشدارهایی که مشکلشان دیگر نیست (ضد لرزش در بسته‌شدن هم)
    await resolveAlerts(kiosk, (alert) => {
        if (present.has(alert.code)) {
            tracker.absent.delete(alert.code);
            return false;
        }

        const absentCount = (tracker.absent.get(alert.code) ?? 0) + 1;
        tracker.absent.set(alert.code, absentCount);

        return IMMEDIATE_CODES.has(alert.code) || absentCount >= config.resolveCycles;
    });

    await saveEvaluation(kiosk.id, {
        state,
        issues,
        checkedAt: now.toISOString(),
        networkLatencyMs: network?.latencyMs ?? null,
        printer,
    });
}

/** یک دور بررسی همه‌ی کیوسک‌ها (برای حلقه و تست) */
export async function runMonitorCycle(options?: {
    now?: Date;
    config?: MonitorConfig;
}): Promise<void> {
    const now = options?.now ?? new Date();
    const config = options?.config ?? MONITOR;

    const kiosks = await listKiosks();

    await Promise.all(
        kiosks.map((kiosk) =>
            checkKiosk(kiosk, now, config).catch((error: unknown) => {
                console.error(`پایش کیوسک ${kiosk.id} انجام نشد:`, error);
            }),
        ),
    );
}

/** بررسی فوری یک کیوسک (دکمه‌ی «همین حالا بررسی کن») */
export async function checkKioskNow(
    kioskId: number,
    options?: { now?: Date; config?: MonitorConfig },
): Promise<Kiosk | null> {
    const kiosk = await getKiosk(kioskId);
    if (!kiosk) return null;

    await checkKiosk(kiosk, options?.now ?? new Date(), options?.config ?? MONITOR);
    return getKiosk(kioskId);
}

/**
 * ثبت نبض کیوسک. اگر کیوسک قطع بود (یا اولین اتصالش است) همان لحظه وصل حساب می‌شود
 * و هشدارهای «قطع بودن» بسته می‌شوند؛ لازم نیست تا دور بعدی حلقه صبر کرد.
 */
export async function handleHeartbeat(
    kiosk: Kiosk,
    payload: HeartbeatPayload,
    now: Date = new Date(),
): Promise<void> {
    await recordHeartbeat(kiosk.id, now.toISOString(), payload);
    startMonitor();

    const wasOffline = kiosk.statusState === "offline";
    const firstTime = kiosk.statusState === "never_connected";

    if (!wasOffline && !firstTime) return;

    await addKioskEvent({
        kioskId: kiosk.id,
        type: firstTime ? "first_connection" : "came_online",
        severity: "info",
        message: firstTime ? "کیوسک برای اولین بار متصل شد" : "ارتباط کیوسک برقرار شد",
    });

    const remaining = kiosk.statusIssues.filter((item) => !IMMEDIATE_CODES.has(item.code));

    await saveEvaluation(kiosk.id, {
        state: stateFromIssues(remaining),
        issues: remaining,
        checkedAt: now.toISOString(),
        networkLatencyMs: kiosk.networkLatencyMs,
        printer: kiosk.printerStatus,
    });

    await resolveAlerts(kiosk, (alert) => IMMEDIATE_CODES.has(alert.code));
}

/** شروع حلقه‌ی پایش (یک‌بار؛ تکراری صدا زدنش بی‌اثر است) */
export function startMonitor(config: MonitorConfig = MONITOR): void {
    if (globalForMonitor.__kioskMonitorTimer) return;

    const tick = () => {
        runMonitorCycle({ config }).catch((error: unknown) => {
            // خطای دیتابیس را حداکثر دقیقه‌ای یک‌بار لاگ کن
            const last = globalForMonitor.__kioskMonitorLastError ?? 0;
            if (Date.now() - last > 60_000) {
                globalForMonitor.__kioskMonitorLastError = Date.now();
                console.error("حلقه‌ی پایش کیوسک‌ها:", error);
            }
        });
    };

    globalForMonitor.__kioskMonitorTimer = setInterval(tick, config.cycleMs);
    globalForMonitor.__kioskMonitorTimer.unref?.();

    // اولین بررسی کمی بعد از شروع سرور
    setTimeout(tick, 3_000).unref?.();
}

export function stopMonitor(): void {
    if (globalForMonitor.__kioskMonitorTimer) {
        clearInterval(globalForMonitor.__kioskMonitorTimer);
        globalForMonitor.__kioskMonitorTimer = undefined;
    }
}