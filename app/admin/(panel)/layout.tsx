import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";

const links = [
    { href: "/admin", label: "داشبورد" },
    { href: "/admin/specialties", label: "تخصص‌ها" },
    { href: "/admin/doctors", label: "پزشکان" },
    { href: "/admin/appointments", label: "نوبت‌های امروز" },
    { href: "/admin/kiosks", label: "کیوسک‌ها" },
];

export default async function PanelLayout({
                                              children,
                                          }: {
    children: React.ReactNode;
}) {
    const session = await getAdminSession();
    if (!session) redirect("/admin/login");

    return (
        <div className="flex min-h-screen">
            <aside className="w-56 shrink-0 border-l border-slate-200 bg-white p-4">
                <div className="mb-6 text-sm text-slate-500">نوین دیدگان · ادمین</div>
                <nav className="flex flex-col gap-2">
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
                <form action="/api/admin/logout" method="post" className="mt-8">
                    {/* بهتر با client fetch */}
                </form>
                <button
                    formAction={async () => {
                        "use server";
                        const { clearAdminSession } = await import("@/lib/admin/session");
                        await clearAdminSession();
                        redirect("/admin/login");
                    }}
                    className="mt-8 text-sm text-red-600"
                >
                    خروج
                </button>
            </aside>
            <main className="flex-1 p-6">{children}</main>
        </div>
    );
}