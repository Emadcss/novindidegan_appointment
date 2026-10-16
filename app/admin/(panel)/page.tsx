import { getDashboardStats } from "@/lib/db/admin-repositories";

export default async function AdminDashboardPage() {
    const stats = await getDashboardStats();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">داشبورد</h1>
                <p className="text-sm text-slate-500">تاریخ کاری: {stats.day}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <Card title="نوبت‌های امروز" value={stats.bookedToday} />
                <Card title="پزشکان فعال" value={stats.activeDoctors} />
                <Card title="کیوسک‌ها" value={stats.kiosks.length} />
            </div>

            <section className="rounded-xl bg-white p-5 shadow-sm">
                <h2 className="font-semibold">نوبت به‌ازای پزشک</h2>
                <ul className="mt-3 divide-y divide-slate-100">
                    {stats.byDoctor.length === 0 && (
                        <li className="py-2 text-sm text-slate-500">نوبتی نیست</li>
                    )}
                    {stats.byDoctor.map((r) => (
                        <li key={r.name} className="flex justify-between py-2 text-sm">
                            <span>{r.name}</span>
                            <span className="font-bold">{r.count}</span>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="rounded-xl bg-white p-5 shadow-sm">
                <h2 className="font-semibold">کیوسک‌ها</h2>
                <ul className="mt-3 divide-y divide-slate-100">
                    {stats.kiosks.map((k) => (
                        <li key={k.id} className="flex justify-between py-2 text-sm">
              <span>
                {k.code} — {k.name}
                  {!k.isActive && (
                      <span className="mr-2 text-red-600"> (غیرفعال)</span>
                  )}
              </span>
                            <span className="text-slate-500">
                چاپگر: {k.printerStatus}
                                {!k.lastSeenAt ? " · بدون سیگنال" : ""}
              </span>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}

function Card({ title, value }: { title: string; value: number }) {
    return (
        <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">{title}</div>
            <div className="mt-2 text-3xl font-bold">{value}</div>
        </div>
    );
}