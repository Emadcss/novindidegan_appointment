"use client";

import { useEffect, useRef, useState } from "react";

import Button from "@/components/ui/Button";
import Screen from "@/components/ui/Screen";
import StatusPanel from "@/components/ui/StatusPanel";
import { lookupPreviousAppointmentApi } from "@/lib/kiosk/api-client";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import type { PreviousAppointmentLookupResult } from "@/types/kiosk";

type PreviousAppointmentLookupProps = {
    nationality: "iranian" | "foreign";
    identifier: string;
    onFound: (result: PreviousAppointmentLookupResult) => void;
    onNotFound: () => void;
    onBack: () => void;
    onCancel: () => void;
};

/**
 * صفحه‌ی نمایشگر عمومی است؛ کد ملی/موبایل کامل نمایش داده نمی‌شود.
 * مثال: ۰۰۱•••••۷۸
 */
function maskIdentifier(value: string): string {
    if (value.length <= 5) return value;

    return `${value.slice(0, 3)}${"•".repeat(value.length - 5)}${value.slice(-2)}`;
}

export default function PreviousAppointmentLookup({
    nationality,
    identifier,
    onFound,
    onNotFound,
    onBack,
    onCancel,
}: PreviousAppointmentLookupProps) {
    const identifierLabel = nationality === "iranian" ? "کد ملی" : "شماره موبایل";

    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);

    // callbackها در ref نگه داشته می‌شوند تا تغییر آن‌ها جستجو را دوباره اجرا نکند
    const onFoundRef = useRef(onFound);
    const onNotFoundRef = useRef(onNotFound);

    useEffect(() => {
        onFoundRef.current = onFound;
        onNotFoundRef.current = onNotFound;
    });

    useEffect(() => {
        let cancelled = false;

        async function lookup() {
            setError(null);

            const response = await lookupPreviousAppointmentApi({
                nationality,
                nationalId: nationality === "iranian" ? identifier : null,
                mobile: nationality === "foreign" ? identifier : null,
            });

            // کاربر از صفحه رفته (بازگشت، انصراف یا ریست)
            if (cancelled) return;

            if (!response.success || !response.data) {
                setError(response.message ?? "جستجوی نوبت انجام نشد");
                return;
            }

            if (response.data.found) {
                onFoundRef.current(response.data);
            } else {
                onNotFoundRef.current();
            }
        }

        void lookup();

        return () => {
            cancelled = true;
        };
    }, [nationality, identifier, attempt]);

    return (
        <Screen
            title="جستجوی نوبت قبلی"
            hint={`نوبت شما با ${identifierLabel} زیر جستجو می‌شود`}
            onBack={onBack}
            onCancel={onCancel}
        >
            <div className="mx-auto w-full max-w-xl rounded-card bg-surface px-8 py-6 text-center shadow-card">
                <p className="text-hint text-ink-muted">{identifierLabel}</p>
                <p dir="ltr" className="mt-1 text-heading font-bold tabular-nums tracking-widest text-ink">
                    {toPersianDigits(maskIdentifier(identifier))}
                </p>
            </div>

            {!error && <StatusPanel tone="loading" title="در حال جستجوی نوبت…" />}

            {error && (
                <StatusPanel
                    tone="error"
                    title="جستجوی نوبت انجام نشد"
                    description={`${error}. دوباره تلاش کنید یا به پذیرش مراجعه کنید.`}
                >
                    <Button onClick={() => setAttempt((value) => value + 1)}>تلاش دوباره</Button>
                </StatusPanel>
            )}
        </Screen>
    );
}
