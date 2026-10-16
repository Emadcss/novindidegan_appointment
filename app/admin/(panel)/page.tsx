
import Link from "next/link";

import { query } from "@/lib/db/connection";

type StatCardProps = {
    title: string;
    value: string;
    description: string;
};

function StatCard({ title, value, description }: StatCardProps) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {value}
            </p>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
        </article>
    );
}

export default async function AdminDashboardPage() {
    const [doctors, specialties, appointments, kiosks] = await Promise.all([
        query(
            "SELECT COUNT(*) AS total FROM doctors WHERE is_active = TRUE",
        ),
        query(
            "SELECT COUNT(*) AS total FROM specialties WHERE is_active = TRUE",
        ),
        query(
            `SELECT COUNT(*) AS total
             FROM appointments
             WHERE appointment_date = CURRENT_DATE
               AND status = 'booked'`,
        ),
        query(
            "SELECT COUNT(*) AS total FROM kiosks WHERE is_active = TRUE",
        ),
    ]);

    const formatCount = (value: unknown) =>
        new Intl.NumberFormat("fa-IR").format(Number(value ?? 0));

    const cards: StatCardProps[] = [
        {
            title: "پزشکان فعال",
            value: formatCount(doctors[0]?.total),
            description: "پزشکان فعال ثبت‌شده در سیستم",
        },
        {
            title: "تخصص‌های فعال",
            value: formatCount(specialties[0]?.total),
            description: "تخصص‌های قابل استفاده در کیوسک",
        },
        {
            title: "نوبت‌های امروز",
            value: formatCount(appointments[0]?.total),
            description: "نوبت‌های رزروشده با وضعیت فعال",
        },
        {
            title: "کیوسک‌های فعال",
            value: formatCount(kiosks[0]?.total),
            description: "کیوسک‌های فعال ثبت‌شده در سیستم",
        },
    ];

    const sections = [
        {
            title: "مدیریت پزشکان",
            description: "اطلاعات پزشکان و وضعیت فعالیت آن‌ها",
            href: "/admin/doctors",
        },
        {
            title: "مدیریت تخصص‌ها",
            description: "تعریف تخصص‌ها و تنظیم وضعیت نمایش در کیوسک",
            href: "/admin/specialties",
        },
        {
            title: "برنامه حضور پزشکان",
            description: "برنامه هفتگی، استثناها و تغییرات موقت یا دائمی",
            href: "/admin/schedules",
        },
        {
            title: "مدیریت نوبت‌ها",
            description: "بررسی نوبت‌های ثبت‌شده و وضعیت آن‌ها",
            href: "/admin/appointments",
        },
        {
            title: "مدیریت کیوسک‌ها",
            description: "مشاهده و مدیریت کیوسک‌های ثبت‌شده",
            href: "/admin/kiosks",
        },
    ];

    return (
        <div className="space-y-8">
            <section>
                <h1 className="text-2xl font-bold">داشبورد مدیریت</h1>
                <p className="mt-2 text-slate-500">
                    نمای کلی عملکرد سیستم نوبت‌دهی کلینیک
                </p>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <StatCard key={card.title} {...card} />
                ))}
            </section>

            <section>
                <h2 className="mb-4 text-xl font-bold">بخش‌های مدیریتی</h2>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {sections.map((section) => (
                        <Link
                            key={section.href}
                            href={section.href}
                            className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-sky-300 hover:shadow-md"
                        >
                            <h3 className="font-bold transition group-hover:text-sky-700">
                                {section.title}
                            </h3>

                            <p className="mt-2 text-sm leading-7 text-slate-500">
                                {section.description}
                            </p>

                            <span className="mt-4 inline-block text-sm font-semibold text-sky-700">
                                ورود به بخش ←
                            </span>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}
