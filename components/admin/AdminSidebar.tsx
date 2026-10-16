
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navigation = [
    {
        title: "داشبورد",
        href: "/admin",
        icon: "▦",
    },
    {
        title: "پزشکان",
        href: "/admin/doctors",
        icon: "♙",
    },
    {
        title: "تخصص‌ها",
        href: "/admin/specialties",
        icon: "✳",
    },
    {
        title: "برنامه حضور",
        href: "/admin/schedules",
        icon: "◷",
    },
    {
        title: "نوبت‌ها",
        href: "/admin/appointments",
        icon: "▤",
    },
    {
        title: "کیوسک‌ها",
        href: "/admin/kiosks",
        icon: "▣",
    },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const [loggingOut, setLoggingOut] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [error, setError] = useState("");

    async function handleLogout() {
        if (loggingOut) return;

        setLoggingOut(true);
        setError("");

        try {
            const response = await fetch("/api/admin/auth/logout", {
                method: "POST",
                credentials: "same-origin",
            });

            if (!response.ok) {
                setError("خروج انجام نشد. دوباره تلاش کنید.");
                return;
            }

            router.replace("/admin/login");
            router.refresh();
        } catch {
            setError("ارتباط با سرور برقرار نشد.");
        } finally {
            setLoggingOut(false);
        }
    }

    return (
        <>
            <div className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
                <Link href="/admin" className="font-bold text-slate-900">
                    نوین دیدگان
                </Link>

                <button
                    type="button"
                    onClick={() => setMobileOpen((open) => !open)}
                    aria-label="باز و بسته کردن منو"
                    aria-expanded={mobileOpen}
                    className="rounded-xl border border-slate-200 px-4 py-2"
                >
                    {mobileOpen ? "بستن" : "منو"}
                </button>
            </div>

            {mobileOpen && (
                <button
                    type="button"
                    aria-label="بستن منو"
                    onClick={() => setMobileOpen(false)}
                    className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
                />
            )}

            <aside
                className={`fixed inset-y-0 right-0 z-40 flex w-72 flex-col border-l border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
                    mobileOpen ? "translate-x-0" : "translate-x-full"
                }`}
            >
                <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="border-b border-slate-100 px-6 py-6"
                >
                    <p className="text-xl font-bold text-slate-900">
                        نوین دیدگان
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                        سامانه مدیریت کلینیک
                    </p>
                </Link>

                <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                    <p className="mb-3 px-3 text-xs font-semibold tracking-wide text-slate-400">
                        مدیریت کلینیک
                    </p>

                    {navigation.map((item) => {
                        const active =
                            item.href === "/admin"
                                ? pathname === "/admin"
                                : pathname === item.href ||
                                pathname.startsWith(`${item.href}/`);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                aria-current={active ? "page" : undefined}
                                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                                    active
                                        ? "bg-sky-50 text-sky-800"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                            >
                                <span
                                    aria-hidden="true"
                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-lg"
                                >
                                    {item.icon}
                                </span>

                                {item.title}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-slate-100 p-4">
                    {error && (
                        <p role="alert" className="mb-3 text-sm text-red-600">
                            {error}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full rounded-xl px-4 py-3 text-right text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                    >
                        {loggingOut ? "در حال خروج..." : "خروج از حساب ←"}
                    </button>
                </div>
            </aside>
        </>
    );
}
