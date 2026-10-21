"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseIdleTimeoutOptions = {
    /** فقط وقتی true است تایمر کار می‌کند (روی صفحه‌ی شروع غیرفعال است) */
    active: boolean;
    /** با تغییر این مقدار (مثلاً مرحله) تایمر دوباره از اول شروع می‌شود */
    resetKey: unknown;
    /** پایان بی‌فعالیتی: باید جلسه را ریست کند */
    onTimeout: () => void;
    timeoutMs: number;
    warnBeforeMs: number;
};

/**
 * بی‌فعالیتی را می‌سنجد: warnBeforeMs پیش از پایان هشدار می‌دهد و در timeoutMs
 * onTimeout را صدا می‌زند. وقتی هشدار روی صفحه است، فقط continueSession جلسه را
 * ادامه می‌دهد (تا لمس بستن به دکمه‌ی زیرین نشت نکند).
 */
export function useIdleTimeout({
    active,
    resetKey,
    onTimeout,
    timeoutMs,
    warnBeforeMs,
}: UseIdleTimeoutOptions) {
    const [warning, setWarning] = useState(false);

    const warningRef = useRef(false);
    const rearmRef = useRef<() => void>(() => {});
    const onTimeoutRef = useRef(onTimeout);

    useEffect(() => {
        onTimeoutRef.current = onTimeout;
    });

    useEffect(() => {
        if (!active) return;

        let warnTimer = 0;
        let resetTimer = 0;

        const arm = () => {
            window.clearTimeout(warnTimer);
            window.clearTimeout(resetTimer);

            warnTimer = window.setTimeout(() => {
                warningRef.current = true;
                setWarning(true);
            }, timeoutMs - warnBeforeMs);

            resetTimer = window.setTimeout(() => {
                onTimeoutRef.current();
            }, timeoutMs);
        };

        const handleActivity = () => {
            if (warningRef.current) return;
            arm();
        };

        rearmRef.current = arm;
        arm();

        window.addEventListener("pointerdown", handleActivity);
        window.addEventListener("touchstart", handleActivity);
        window.addEventListener("keydown", handleActivity);

        return () => {
            window.clearTimeout(warnTimer);
            window.clearTimeout(resetTimer);
            window.removeEventListener("pointerdown", handleActivity);
            window.removeEventListener("touchstart", handleActivity);
            window.removeEventListener("keydown", handleActivity);
            rearmRef.current = () => {};
        };
    }, [active, resetKey, timeoutMs, warnBeforeMs]);

    /** هشدار را می‌بندد (هنگام ریست جلسه صدا زده شود) */
    const dismissWarning = useCallback(() => {
        warningRef.current = false;
        setWarning(false);
    }, []);

    /** «ادامه می‌دهم»: هشدار بسته و تایمر از اول شروع می‌شود */
    const continueSession = useCallback(() => {
        dismissWarning();
        rearmRef.current();
    }, [dismissWarning]);

    return { warning, continueSession, dismissWarning };
}
