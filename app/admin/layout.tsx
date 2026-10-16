import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";

export default async function AdminLayout({
                                              children,
                                          }: {
    children: React.ReactNode;
}) {
    // لاگین را از این layout مستثنی کن با segment جدا
    return (
        <div className="min-h-screen bg-slate-100 text-slate-900" dir="rtl">
            {children}
        </div>
    );
}