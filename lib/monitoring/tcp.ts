import net from "node:net";

import type { NetworkProbe } from "@/lib/monitoring/types";

/** پیام فارسی برای خطاهای شبکه */
export function describeNetworkError(error: unknown): string {
    const code = (error as { code?: string })?.code;

    switch (code) {
        case "ECONNREFUSED":
            return "اتصال رد شد (دستگاه روشن است ولی پورت بسته است)";
        case "EHOSTUNREACH":
        case "ENETUNREACH":
            return "مسیری به دستگاه نیست (خاموش یا خارج از شبکه)";
        case "ETIMEDOUT":
        case "TIMEOUT":
            return "پاسخی نیامد (زمان انتظار تمام شد)";
        case "ENOTFOUND":
            return "نشانی پیدا نشد";
        default:
            return error instanceof Error ? error.message : "خطای نامشخص شبکه";
    }
}

/** فقط تلاش برای اتصال TCP؛ برای سنجش در دسترس بودن دستگاه روی یک پورت */
export function tcpProbe(host: string, port: number, timeoutMs: number): Promise<NetworkProbe> {
    return new Promise((resolve) => {
        const started = Date.now();
        const socket = net.connect({ host, port });
        let done = false;

        const finish = (result: NetworkProbe) => {
            if (done) return;
            done = true;
            socket.destroy();
            resolve(result);
        };

        socket.setTimeout(timeoutMs, () =>
            finish({ ok: false, latencyMs: null, error: describeNetworkError({ code: "TIMEOUT" }) }),
        );
        socket.once("connect", () =>
            finish({ ok: true, latencyMs: Date.now() - started, error: null }),
        );
        socket.once("error", (error) =>
            finish({ ok: false, latencyMs: null, error: describeNetworkError(error) }),
        );
    });
}