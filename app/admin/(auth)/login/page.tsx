"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("admin");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            const json = await res.json();
            if (!json.success) {
                setError(json.message ?? "ورود ناموفق");
                return;
            }
            router.replace("/admin");
            router.refresh();
        } catch {
            setError("ارتباط با سرور برقرار نشد");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            className="flex min-h-screen items-center justify-center bg-slate-100 p-4"
            dir="rtl"
        >
            <form
                onSubmit={onSubmit}
                className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow"
            >
                <h1 className="text-xl font-bold text-slate-900">ورود پنل ادمین</h1>
                <p className="text-sm text-slate-500">کلینیک نوین دیدگان</p>

                <label className="block text-sm">
                    نام کاربری
                    <input
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                    />
                </label>

                <label className="block text-sm">
                    رمز عبور
                    <input
                        type="password"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                    />
                </label>

                {error && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-blue-700 py-2.5 font-semibold text-white disabled:opacity-50"
                >
                    {loading ? "در حال ورود..." : "ورود"}
                </button>
            </form>
        </div>
    );
}