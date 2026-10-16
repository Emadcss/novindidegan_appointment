
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (loading) return;

        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/admin/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "same-origin",
                body: JSON.stringify({ username, password }),
            });

            const data: { error?: string; ok?: boolean } =
                await response.json();

            if (!response.ok) {
                setError(data.error ?? "ورود انجام نشد.");
                return;
            }

            router.replace("/admin");
            router.refresh();
        } catch {
            setError("ارتباط با سرور برقرار نشد. دوباره تلاش کنید.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main
            dir="rtl"
            className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10"
        >
            <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-3xl text-sky-700">
                        ◉
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900">
                        ورود مدیر
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        پنل مدیریت کلینیک فوق تخصصی نوین دیدگان
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label
                            htmlFor="username"
                            className="mb-2 block text-sm font-semibold"
                        >
                            نام کاربری
                        </label>

                        <input
                            id="username"
                            name="username"
                            autoComplete="username"
                            value={username}
                            onChange={(event) =>
                                setUsername(event.target.value)
                            }
                            required
                            maxLength={100}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-sky-600 focus:ring-4 focus:ring-sky-100"
                            placeholder="نام کاربری مدیر"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-semibold"
                        >
                            رمز عبور
                        </label>

                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            required
                            maxLength={1024}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-sky-600 focus:ring-4 focus:ring-sky-100"
                            placeholder="رمز عبور"
                        />
                    </div>

                    {error && (
                        <p
                            role="alert"
                            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-sky-700 px-4 py-3 font-bold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "در حال بررسی..." : "ورود به پنل"}
                    </button>
                </form>

                <p className="mt-6 text-center text-xs text-slate-400">
                    دسترسی ویژه مدیران کلینیک
                </p>
            </section>
        </main>
    );
}
