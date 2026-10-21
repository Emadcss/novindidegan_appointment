"use client";

import { useEffect, useState } from "react";

/**
 * صفحه‌ی جفت‌سازی کیوسک. مدیر در پنل کد را صادر می‌کند؛ روی خود کیوسک این صفحه را باز کنید:
 *   http://آدرس-سرور:3000/pair?code=XXXXXXXX
 * (یا بدون code و کد را وارد کنید). فقط یک‌بار لازم است.
 */
export default function PairPage() {
    const [code, setCode] = useState("");
    const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
    const [message, setMessage] = useState("");

    async function submit(value: string) {
        setState("busy");
        try {
            const response = await fetch("/api/kiosk/pair", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: value }),
            });
            const result = await response.json();

            if (result.success) {
                setState("done");
                setMessage(`کیوسک «${result.data.kioskName}» با موفقیت جفت شد.`);
            } else {
                setState("error");
                setMessage(result.message ?? "جفت‌سازی انجام نشد");
            }
        } catch {
            setState("error");
            setMessage("ارتباط با سرور برقرار نشد");
        }
    }

    useEffect(() => {
        const fromUrl = new URLSearchParams(window.location.search).get("code");

        if (fromUrl) {
            setCode(fromUrl);
            void submit(fromUrl);
            window.history.replaceState(null, "", "/pair");
        }
        // فقط یک‌بار هنگام باز شدن صفحه
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <main className="select-text mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 p-8 text-center">
            <h1 className="text-heading font-bold text-brand">جفت‌سازی کیوسک</h1>

            {state === "done" ? (
                <>
                    <p className="rounded-card bg-success-soft p-6 text-body font-bold text-success">{message}</p>
                    <a className="text-title font-bold text-brand underline" href="/">
                        رفتن به صفحه‌ی کیوسک
                    </a>
                </>
            ) : (
                <>
                    <p className="text-body text-ink-muted">کد جفت‌سازی را که مدیر از پنل ادمین گرفته وارد کنید.</p>

                    <input
                        dir="ltr"
                        value={code}
                        onChange={(event) => setCode(event.target.value.toUpperCase())}
                        placeholder="XXXX-XXXX"
                        className="rounded-control border-2 border-line-strong bg-surface p-4 text-center text-title tracking-widest"
                    />

                    {state === "error" && (
                        <p role="alert" className="rounded-control bg-danger-soft p-4 font-bold text-danger">
                            {message}
                        </p>
                    )}

                    <button
                        type="button"
                        disabled={state === "busy" || code.trim().length < 8}
                        onClick={() => void submit(code)}
                        className="min-h-16 rounded-control bg-brand text-title font-bold text-white disabled:opacity-45"
                    >
                        {state === "busy" ? "در حال جفت‌سازی…" : "جفت کن"}
                    </button>
                </>
            )}
        </main>
    );
}
