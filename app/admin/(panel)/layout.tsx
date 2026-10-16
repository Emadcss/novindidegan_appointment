
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { verifyAdminSession } from "@/lib/admin/session";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminPanelLayout({
                                                   children,
                                               }: {
    children: ReactNode;
}) {
    const cookieStore = await cookies();
    const token = cookieStore.get("novin_admin_session")?.value;
    const session = verifyAdminSession(token);

    if (!session) {
        redirect("/admin/login");
    }

    return (
        <div
            dir="rtl"
            className="min-h-screen bg-slate-50 text-slate-900"
        >
            <AdminSidebar />

            <div className="min-h-screen pt-16 lg:mr-72 lg:pt-0">
                <header className="hidden h-20 items-center justify-between border-b border-slate-200 bg-white px-8 lg:flex">
                    <div>
                        <p className="font-bold">پنل مدیریت</p>
                        <p className="mt-1 text-sm text-slate-500">
                            مدیریت عملیات کلینیک
                        </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-4 py-2 text-sm">
                        مدیر: <span className="font-bold">{session.username}</span>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
