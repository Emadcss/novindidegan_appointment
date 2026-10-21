"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/components/admin/api";

/** دریافت داده از API با به‌روزرسانی خودکار اختیاری */
export function useFetch<T>(path: string | null, options?: { refreshMs?: number }) {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(path !== null);
    const [tick, setTick] = useState(0);
    const refreshMs = options?.refreshMs;

    useEffect(() => {
        if (path === null) return;

        let cancelled = false;

        async function load() {
            try {
                const result = await api.get<T>(path as string);
                if (!cancelled) {
                    setData(result);
                    setError(null);
                }
            } catch (caught) {
                if (!cancelled) setError(caught instanceof Error ? caught.message : "خطا");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void load();
        const timer = refreshMs ? setInterval(load, refreshMs) : undefined;

        return () => {
            cancelled = true;
            if (timer) clearInterval(timer);
        };
    }, [path, tick, refreshMs]);

    const reload = useCallback(() => setTick((value) => value + 1), []);

    return { data, error, loading, reload };
}

/** زمان فعلی که هر چند ثانیه عوض می‌شود (برای «۳۰ ثانیه پیش») */
export function useNow(intervalMs = 5_000): number {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(timer);
    }, [intervalMs]);

    return now;
}
