import net from "node:net";

import { describeNetworkError } from "@/lib/monitoring/tcp";
import type { PaperLevel, PrinterStatus } from "@/lib/monitoring/types";

/**
 * وضعیت چاپگر حرارتی شبکه‌ای با فرمان بلادرنگ ESC/POS (DLE EOT n).
 *
 * فرمان‌های ۱ تا ۴ (چاپگر، علت آفلاین، خطا، حسگر رول کاغذ) هر کدام یک بایت پاسخ می‌دهند:
 *  - بایت ثابت سالم: ۰x۱۲ (بیت‌های ۰ و ۷ صفر، بیت‌های ۱ و ۴ یک)
 *  - n=1: بیت ۳ = آفلاین
 *  - n=2: بیت ۲ = درب باز، بیت ۳ = دکمه‌ی feed، بیت ۵ = توقف به‌علت اتمام کاغذ، بیت ۶ = خطا
 *  - n=3: بیت ۳ = خطای کاتر، بیت ۵ = خطای غیرقابل‌بازیابی، بیت ۶ = خطای خودبازیاب
 *  - n=4: بیت‌های ۲ و ۳ = کاغذ رو به اتمام (near-end)، بیت‌های ۵ و ۶ = کاغذ تمام شده
 *
 * ⚠ این فرمان‌ها استاندارد Epson TM هستند و بیشتر چاپگرهای سازگار (Xprinter و ...) هم پاسخ می‌دهند،
 * ولی همه‌ی مدل‌ها/سیستم‌عامل‌های شبکه‌ای پاسخ نمی‌دهند. اگر پاسخ نیامد، «پشتیبانی نمی‌شود» گزارش
 * می‌شود نه «خراب». رول کاغذ فقط «رو به اتمام» و «تمام شده» را گزارش می‌کند، نه درصد.
 */

export const DLE_EOT_COMMANDS = Buffer.from([
    0x10, 0x04, 0x01, 0x10, 0x04, 0x02, 0x10, 0x04, 0x03, 0x10, 0x04, 0x04,
]);

/** بیت‌های ثابت پاسخ سالم: (b & 0x93) باید ۰x۱۲ باشد */
const hasValidShape = (byte: number): boolean => (byte & 0x93) === 0x12;

type ParsedStatus = Pick<
    PrinterStatus,
    "supported" | "online" | "paper" | "coverOpen" | "error"
>;

/** تحلیل خالص ۴ بایت پاسخ (قابل تست بدون سخت‌افزار) */
export function parsePrinterStatus(bytes: ArrayLike<number>): ParsedStatus {
    const unsupported: ParsedStatus = {
        supported: false,
        online: null,
        paper: "unknown",
        coverOpen: null,
        error: null,
    };

    if (bytes.length < 4) return unsupported;

    const [offlineByte, causeByte, errorByte, paperByte] = [bytes[0], bytes[1], bytes[2], bytes[3]];

    if (![offlineByte, causeByte, errorByte, paperByte].every(hasValidShape)) {
        return unsupported;
    }

    const offline = (offlineByte & 0x08) !== 0;
    const coverOpen = (causeByte & 0x04) !== 0;
    const paperEndStop = (causeByte & 0x20) !== 0;
    const generalError = (causeByte & 0x40) !== 0;
    const cutterError = (errorByte & 0x08) !== 0;
    const unrecoverable = (errorByte & 0x20) !== 0;
    const recoverable = (errorByte & 0x40) !== 0;
    const paperEnd = (paperByte & 0x60) !== 0 || paperEndStop;
    const nearEnd = (paperByte & 0x0c) !== 0;

    let paper: PaperLevel = "ok";
    if (paperEnd) paper = "end";
    else if (nearEnd) paper = "near_end";

    let error: string | null = null;
    if (cutterError) error = "خطای کاتر (تیغه‌ی برش)";
    else if (unrecoverable) error = "خطای غیرقابل‌بازیابی چاپگر";
    else if (recoverable) error = "خطای موقت چاپگر";
    else if (generalError && !coverOpen && !paperEnd) error = "چاپگر خطا گزارش کرده است";

    return { supported: true, online: !offline, paper, coverOpen, error };
}

/**
 * به چاپگر وصل می‌شود، چهار فرمان وضعیت را می‌فرستد و پاسخ را تحلیل می‌کند.
 * اتصال‌پذیر ولی بی‌پاسخ = reachable: true و supported: false.
 */
export function queryPrinterStatus(options: {
    host: string;
    port: number;
    /** سقف انتظار برای برقراری اتصال */
    connectTimeoutMs: number;
    /** سقف انتظار برای پاسخ پس از اتصال */
    responseTimeoutMs?: number;
}): Promise<PrinterStatus> {
    const { host, port, connectTimeoutMs, responseTimeoutMs = 1_000 } = options;

    return new Promise((resolve) => {
        const started = Date.now();
        const socket = net.connect({ host, port });
        const received: number[] = [];
        let connectedAt: number | null = null;
        let done = false;
        let responseTimer: ReturnType<typeof setTimeout> | null = null;

        const finish = (partial: Omit<PrinterStatus, "checkedAt">) => {
            if (done) return;
            done = true;
            if (responseTimer) clearTimeout(responseTimer);
            socket.destroy();
            resolve({ ...partial, checkedAt: new Date().toISOString() });
        };

        const finishWithBytes = () => {
            const parsed = parsePrinterStatus(received);
            finish({
                reachable: true,
                latencyMs: connectedAt === null ? null : connectedAt - started,
                ...parsed,
            });
        };

        socket.setTimeout(connectTimeoutMs, () =>
            finish({
                reachable: false,
                supported: false,
                online: null,
                paper: "unknown",
                coverOpen: null,
                error: describeNetworkError({ code: "TIMEOUT" }),
                latencyMs: null,
            }),
        );

        socket.once("connect", () => {
            connectedAt = Date.now();
            socket.setTimeout(0);
            socket.write(DLE_EOT_COMMANDS);
            responseTimer = setTimeout(finishWithBytes, responseTimeoutMs);
        });

        socket.on("data", (chunk) => {
            for (const byte of chunk) received.push(byte);
            if (received.length >= 4) finishWithBytes();
        });

        socket.once("error", (error) =>
            finish({
                reachable: false,
                supported: false,
                online: null,
                paper: "unknown",
                coverOpen: null,
                error: describeNetworkError(error),
                latencyMs: null,
            }),
        );
    });
}