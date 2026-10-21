import type { MonitorConfig } from "@/lib/monitoring/config";
import type {
    HeartbeatPayload,
    KioskState,
    MonitorIssue,
    NetworkProbe,
    PrinterStatus,
} from "@/lib/monitoring/types";

/** کدهای مشکل. مشکل‌هایی که از «بی‌نبضی» می‌آیند، خودشان مدت انتظار دارند و بدون ضد لرزش هشدار می‌دهند. */
export const IMMEDIATE_CODES = new Set([
    "HEARTBEAT_MISSING",
    "APP_NOT_RESPONDING",
    "NETWORK_UNREACHABLE",
]);

export type EvaluationInput = {
    isActive: boolean;
    lastSeenAt: string | null;
    lastHeartbeat: HeartbeatPayload | null;
    hasNetworkTarget: boolean;
    hasPrinter: boolean;
    now: Date;
    network: NetworkProbe | null;
    printer: PrinterStatus | null;
    config: Pick<MonitorConfig, "offlineAfterMs" | "clientErrorsThreshold" | "clockDriftWarnMs">;
};

const issue = (
    code: string,
    severity: MonitorIssue["severity"],
    message: string,
): MonitorIssue => ({ code, severity, message });

/**
 * ارزیابی خالص سلامت یک کیوسک از روی نبض، بررسی شبکه و وضعیت چاپگر.
 *
 * جدول تشخیص وقتی نبض قطع است:
 *   شبکه‌ی کیوسک پاسخ می‌دهد  → «برنامه/مرورگر پاسخ نمی‌دهد»  (دستگاه روشن است)
 *   شبکه‌ی کیوسک پاسخ نمی‌دهد → «کیوسک روی شبکه نیست»          (خاموش یا قطع کابل)
 *   بررسی شبکه تعریف نشده     → «ارتباط با سرور قطع است»
 */
export function evaluateKiosk(input: EvaluationInput): {
    state: KioskState;
    issues: MonitorIssue[];
} {
    if (!input.isActive) return { state: "disabled", issues: [] };

    const issues: MonitorIssue[] = [];
    const { config, network, printer, lastHeartbeat } = input;

    const ageMs =
        input.lastSeenAt === null ? null : input.now.getTime() - new Date(input.lastSeenAt).getTime();
    const heartbeatStale = ageMs !== null && ageMs > config.offlineAfterMs;

    if (heartbeatStale) {
        if (input.hasNetworkTarget && network?.ok) {
            issues.push(
                issue(
                    "APP_NOT_RESPONDING",
                    "critical",
                    "کیوسک روشن و روی شبکه است ولی برنامه‌ی آن (مرورگر) به سرور نبض نمی‌فرستد",
                ),
            );
        } else if (input.hasNetworkTarget && network && !network.ok) {
            issues.push(
                issue(
                    "NETWORK_UNREACHABLE",
                    "critical",
                    `کیوسک روی شبکه در دسترس نیست (خاموش است یا اتصال شبکه‌اش قطع است): ${network.error ?? ""}`.trim(),
                ),
            );
        } else {
            issues.push(issue("HEARTBEAT_MISSING", "critical", "ارتباط کیوسک با سرور قطع است"));
        }
    } else if (ageMs !== null) {
        if (input.hasNetworkTarget && network && !network.ok) {
            issues.push(
                issue(
                    "NETWORK_PROBE_FAILED",
                    "warning",
                    "برنامه‌ی کیوسک فعال است ولی پورت تعریف‌شده‌ی آن از سرور پاسخ نمی‌دهد (بررسی فایروال یا نشانی)",
                ),
            );
        }

        if (lastHeartbeat) {
            if (lastHeartbeat.recentErrors >= config.clientErrorsThreshold) {
                issues.push(
                    issue(
                        "CLIENT_ERRORS",
                        "warning",
                        `مرورگر کیوسک در ۵ دقیقه‌ی اخیر ${lastHeartbeat.recentErrors} خطا ثبت کرده است`,
                    ),
                );
            }
            if (
                lastHeartbeat.clockDriftMs !== null &&
                Math.abs(lastHeartbeat.clockDriftMs) > config.clockDriftWarnMs
            ) {
                issues.push(
                    issue(
                        "CLOCK_DRIFT",
                        "warning",
                        `ساعت کیوسک ${Math.round(Math.abs(lastHeartbeat.clockDriftMs) / 1000)} ثانیه با سرور اختلاف دارد`,
                    ),
                );
            }
            if (lastHeartbeat.online === false) {
                issues.push(
                    issue("BROWSER_OFFLINE", "warning", "مرورگر کیوسک خود را بدون اینترنت/شبکه می‌داند"),
                );
            }
        }
    }

    if (input.hasPrinter && printer) {
        if (!printer.reachable) {
            issues.push(
                issue(
                    "PRINTER_UNREACHABLE",
                    "critical",
                    `چاپگر در دسترس نیست (خاموش یا قطع شبکه): ${printer.error ?? ""}`.trim(),
                ),
            );
        } else if (!printer.supported) {
            issues.push(
                issue(
                    "PRINTER_STATUS_UNSUPPORTED",
                    "info",
                    "چاپگر روشن است ولی به پرسش وضعیت (کاغذ و خطا) پاسخ نمی‌دهد؛ مدل آن ممکن است این قابلیت را نداشته باشد",
                ),
            );
        } else {
            if (printer.paper === "end") {
                issues.push(issue("PRINTER_PAPER_END", "critical", "رول کاغذ چاپگر تمام شده است"));
            } else if (printer.paper === "near_end") {
                issues.push(
                    issue("PRINTER_PAPER_NEAR_END", "warning", "رول کاغذ چاپگر رو به اتمام است؛ رول جدید آماده کنید"),
                );
            }
            if (printer.coverOpen) {
                issues.push(issue("PRINTER_COVER_OPEN", "critical", "درب چاپگر باز است"));
            }
            if (printer.error) {
                issues.push(issue("PRINTER_ERROR", "critical", printer.error));
            }
            if (printer.online === false && !printer.coverOpen && printer.paper !== "end") {
                issues.push(issue("PRINTER_OFFLINE", "critical", "چاپگر آفلاین است"));
            }
        }
    }

    let state: KioskState;
    if (input.lastSeenAt === null) state = "never_connected";
    else if (heartbeatStale) state = "offline";
    else if (issues.some((item) => item.severity === "critical")) state = "critical";
    else if (issues.some((item) => item.severity === "warning")) state = "warning";
    else state = "online";

    return { state, issues };
}