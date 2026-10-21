"use client";

import { fa, relativeTime } from "@/components/admin/format";
import { useFetch, useNow } from "@/components/admin/hooks";
import type { AlertView, Counts } from "@/components/admin/types";
import { Badge, BarChart, Card, Empty, Loading, SEVERITY_LABEL, SEVERITY_TONE, Stat, StateBadge, Table } from "@/components/admin/ui";
import { formatJalali } from "@/lib/utils/jalali";
import { STATE_LABELS } from "@/lib/monitoring/types";
import type { KioskState } from "@/lib/monitoring/types";

type Dashboard = {
    today: string;
    todayTotals: Counts & { iranian: number; foreign: number };
    week: { date: string; total: number }[];
    doctors: { doctorId: number; name: string; presentNow: boolean; lastNumber: number; booked: number; completed: number }[];
    kioskCounts: Record<string, number>;
    kioskTotal: number;
    alertCounts: { critical: number; warning: number };
    latestAlerts: AlertView[];
};

export default function DashboardPage({ onNavigate }: { onNavigate: (page: "monitoring" | "appointments" | "reports") => void }) {
    const { data, loading, error } = useFetch<Dashboard>("/dashboard", { refreshMs: 30_000 });
    const now = useNow(10_000);

    if (loading) return <Loading />;
    if (error || !data) return <Empty>{error ?? "داده‌ای نیست"}</Empty>;

    const unhealthy = data.kioskTotal - (data.kioskCounts.online ?? 0) - (data.kioskCounts.disabled ?? 0);

    return (
        <div className="flex flex-col gap-5">
            <h1 className="text-2xl font-bold">داشبورد — امروز {formatJalali(data.today)}</h1>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <Stat label="نوبت‌های امروز" value={fa(data.todayTotals.total)} />
                <Stat label="در انتظار" value={fa(data.todayTotals.booked)} tone="blue" />
                <Stat label="انجام‌شده" value={fa(data.todayTotals.completed)} tone="green" />
                <Stat label="لغو / عدم مراجعه" value={fa(data.todayTotals.cancelled + data.todayTotals.noShow)} tone="amber" />
                <button type="button" onClick={() => onNavigate("monitoring")} className="text-right">
                    <Stat
                        label="کیوسک‌های دارای مشکل"
                        value={`${fa(unhealthy)} از ${fa(data.kioskTotal)}`}
                        tone={unhealthy > 0 ? "red" : "green"}
                    />
                </button>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                <Card title="نوبت‌های ۷ روز اخیر" actions={<button type="button" className="text-xs text-brand" onClick={() => onNavigate("reports")}>گزارش کامل</button>}>
                    <BarChart items={data.week.map((item) => ({ label: formatJalali(item.date).slice(5), value: item.total }))} formatValue={fa} />
                </Card>

                <Card title="وضعیت کیوسک‌ها" actions={<button type="button" className="text-xs text-brand" onClick={() => onNavigate("monitoring")}>پایش</button>}>
                    {data.kioskTotal === 0 ? (
                        <Empty>هنوز کیوسکی تعریف نشده است.</Empty>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {(Object.keys(STATE_LABELS) as KioskState[]).filter((key) => data.kioskCounts[key]).map((key) => (
                                <span key={key} className="flex items-center gap-2 rounded-lg bg-paper px-3 py-2 text-sm">
                                    <StateBadge state={key} /> {fa(data.kioskCounts[key])}
                                </span>
                            ))}
                        </div>
                    )}
                    <h3 className="mb-2 mt-5 text-sm font-bold">آخرین هشدارها</h3>
                    {data.latestAlerts.length === 0 ? (
                        <p className="text-sm text-success">هشدار بازی وجود ندارد.</p>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {data.latestAlerts.map((alert) => (
                                <li key={alert.id} className="flex items-start gap-2 text-sm">
                                    <Badge tone={SEVERITY_TONE[alert.severity]}>{SEVERITY_LABEL[alert.severity]}</Badge>
                                    <span><b>{alert.kioskName}</b>: {alert.message} <span className="text-xs text-ink-muted">({relativeTime(alert.openedAt, now)})</span></span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            <Card title="پزشکان و صف امروز" actions={<button type="button" className="text-xs text-brand" onClick={() => onNavigate("appointments")}>نوبت‌ها</button>}>
                <Table head={["پزشک", "حضور", "آخرین شماره", "در انتظار", "انجام‌شده"]}>
                    {data.doctors.map((doctor) => (
                        <tr key={doctor.doctorId}>
                            <td className="font-medium">{doctor.name}</td>
                            <td>{doctor.presentNow ? <Badge tone="green">حاضر</Badge> : <Badge>غایب / خارج از ساعت</Badge>}</td>
                            <td>{fa(doctor.lastNumber)}</td>
                            <td>{fa(doctor.booked)}</td>
                            <td>{fa(doctor.completed)}</td>
                        </tr>
                    ))}
                </Table>
            </Card>
        </div>
    );
}