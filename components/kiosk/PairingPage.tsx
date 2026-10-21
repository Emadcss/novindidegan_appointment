"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type PairResult =
    | { success: true; data: { kioskName: string } }
    | { success: false; message?: string };

async function requestPairing(code: string): Promise<PairResult> {
    const response = await fetch("/api/kiosk/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
    });

    return response.json() as Promise<PairResult>;
}

/**
 * صفحه‌ی جفت‌سازی کیوسک. مدیر در پنل کد را صادر می‌کند؛ روی خود کیوسک این صفحه را باز کنید:
 *   http://آدرس-سرور:3000/pair?code=XXXXXXXX
 * (یا بدون code و کد را وارد کنید). فقط یک‌بار لازم است.
 */
export default function PairingPage({ initialCode }: { initialCode: string }) {
    const [code, setCode] = useState(initialCode);
    const [state, setState] = useState<"idle" | "busy" | "done" | "error">(initialCode ? "busy" : "idle");
    const [message, setMessage] = useState("");

    const finishPairing = useCallback((result: PairResult) => {
        if (result.success) {
            setState("done");
            setMessage(`کیوسک «${result.data.kioskName}» با موفقیت جفت شد.`);
        } else {
            setState("error");
            setMessage(result.message ?? "جفت‌سازی انجام نشد");
        }
    }, []);

    const failPairing = useCallback(() => {
        setState("error");
        setMessage("ارتباط با سرور برقرار نشد");
    }, []);

    function submit(value: string) {
        setState("busy");
        void requestPairing(value).then(finishPairing).catch(failPairing);
    }

    useEffect(() => {
        if (!initialCode) return;

        window.history.replaceState(null, "", "/pair");
        void requestPairing(initialCode).then(finishPairing).catch(failPairing);
    }, [initialCode, finishPairing, failPairing]);

    return (
        <main className="select-text mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-5 p-4 text-center sm:gap-6 sm:p-8">
            <h1 className="text-2xl font-bold text-brand sm:text-heading">جفت‌سازی کیوسک</h1>

            {state === "done" ? (
                <>
                    <p className="rounded-card bg-success-soft p-5 text-lg font-bold text-success sm:p-6 sm:text-body">{message}</p>
                    <Link className="text-lg font-bold text-brand underline sm:text-title" href="/">
                        رفتن به صفحه‌ی کیوسک
                    </Link>
                </>
            ) : (
                <>
                    <p className="text-base text-ink-muted sm:text-body">کد جفت‌سازی را که مدیر از پنل ادمین گرفته وارد کنید.</p>

                    <input
                        dir="ltr"
                        value={code}
                        onChange={(event) => setCode(event.target.value.toUpperCase())}
                        placeholder="XXXX-XXXX"
                        className="w-full min-h-14 rounded-control border-2 border-line-strong bg-surface p-3 text-center text-xl tracking-widest sm:p-4 sm:text-title"
                    />

                    {state === "error" && (
                        <p role="alert" className="rounded-control bg-danger-soft p-4 font-bold text-danger">
                            {message}
                        </p>
                    )}

                    <button
                        type="button"
                        disabled={state === "busy" || code.trim().length < 8}
                        onClick={() => submit(code)}
                        className="min-h-14 rounded-control bg-brand px-5 text-lg font-bold text-white disabled:opacity-45 sm:min-h-16 sm:text-title"
                    >
                        {state === "busy" ? "در حال جفت‌سازی…" : "جفت کن"}
                    </button>
                </>
            )}
        </main>
    );
}
