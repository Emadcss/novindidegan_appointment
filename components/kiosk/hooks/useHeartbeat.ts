"use client";

import { useEffect, useRef } from "react";

const INTERVAL_MS = 30_000;
const UNPAIRED_RETRY_MS = 5 * 60_000;
const ERROR_WINDOW_MS = 5 * 60_000;

/**
 * هر ۳۰ ثانیه به سرور «زنده‌ام» می‌گوید (و وضعیت مرورگر: صفحه‌ی فعلی، اندازه‌ی صفحه، تعداد خطاهای اخیر).
 * اگر این دستگاه جفت نشده باشد (۴۰۱) فقط هر ۵ دقیقه امتحان می‌کند. هیچ‌وقت کیوسک را مختل نمی‌کند.
 */
export function useHeartbeat(step: string): void {
    const stepRef = useRef(step);

    useEffect(() => {
        stepRef.current = step;
    });

    useEffect(() => {
        const startedAt = Date.now();
        const errors: number[] = [];
        let stopped = false;
        let timer: ReturnType<typeof setTimeout>;

        const recordError = () => {
            errors.push(Date.now());
        };
        window.addEventListener("error", recordError);
        window.addEventListener("unhandledrejection", recordError);

        const beat = async () => {
            if (stopped) return;

            const cutoff = Date.now() - ERROR_WINDOW_MS;
            while (errors.length && errors[0] < cutoff) errors.shift();

            let nextDelay = INTERVAL_MS;

            try {
                const response = await fetch("/api/kiosk/heartbeat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    cache: "no-store",
                    body: JSON.stringify({
                        step: stepRef.current,
                        appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
                        uptimeSec: Math.round((Date.now() - startedAt) / 1000),
                        screen: { width: window.innerWidth, height: window.innerHeight },
                        online: navigator.onLine,
                        recentErrors: errors.length,
                        clientTime: new Date().toISOString(),
                        userAgent: navigator.userAgent,
                    }),
                });

                if (response.status === 401) nextDelay = UNPAIRED_RETRY_MS;
            } catch {
                // قطع شبکه؛ دور بعد دوباره امتحان می‌شود
            }

            if (!stopped) timer = setTimeout(beat, nextDelay);
        };

        timer = setTimeout(beat, 2_000);

        return () => {
            stopped = true;
            clearTimeout(timer);
            window.removeEventListener("error", recordError);
            window.removeEventListener("unhandledrejection", recordError);
        };
    }, []);
}