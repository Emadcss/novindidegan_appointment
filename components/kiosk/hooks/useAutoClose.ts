"use client";

import { useEffect, useRef } from "react";

/**
 * وقتی active است، بعد از ms میلی‌ثانیه onClose را صدا می‌زند
 * (مثلاً بستن خودکار صفحه‌ی نوبت، بدون انتظار برای دکمه).
 */
export function useAutoClose(active: boolean, ms: number, onClose: () => void) {
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        if (!active) return;

        const timer = window.setTimeout(() => onCloseRef.current(), ms);

        return () => window.clearTimeout(timer);
    }, [active, ms]);
}
