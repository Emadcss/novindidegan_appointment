import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, clearAdminSession } from "@/lib/admin/session";

const links = [
    { href: "/admin", label: "داشبورد" },
    { href: "/admin/specialties", label: "تخصص‌ها" },
    { href: "/admin/doctors", label: "پزشکان" },
    { href: "/admin/appointments", label: "نوبت‌های امروز" },
    { href: "/admin/kiosks", label: "کیوسک‌ها" },
];

export default async function AdminPanelLayout({
                                                   children,
                                               }: {
    children: React.ReactNode;
}) {
    const session = await getAdminSession();
    if (!session) redirect("/admin/login");

    async function logout() {
        "use server";
        await clearAdminSession();
        redirect("/admin/login");
    }

    return (
        <div className="flex min-h-screen bg-slate-100 text-slate-900" dir="rtl">
            <aside className="flex w-56 shrink-0 flex-col border-l border-slate-200 bg-white p-4">
                <div className="mb-1 text-xs text-slate-400">نوین دیدگان</div>
                <div className="mb-6 text-sm font-semibold">پنل مدیریت</div>
                <div className="mb-4 text-xs text-slate-500">{session.username}</div>
                <nav className="flex flex-1 flex-col gap-1">
                    {links.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className="rounded-lg px-3 py-2 text-sm hover:bg-slate-100"
                        >
                            {l.label}
                        </Link>
                    ))}
                </nav>
                <form action={logout}>
                    <button
                        type="submit"
                        className="w-full rounded-lg px-3 py-2 text-right text-sm text-red-600 hover:bg-red-50"
                    >
                        خروج
                    </button>
                </form>
            </aside>
            <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
    );
}