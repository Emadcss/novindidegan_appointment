"use client";

import { useState } from "react";

import { buildQuery } from "@/components/admin/pages/AppointmentsPage";
import { DateRange, todayKey } from "@/components/admin/DateRange";
import type { Range } from "@/components/admin/DateRange";
import { fa, formatDuration } from "@/components/admin/format";
import { useFetch } from "@/components/admin/hooks";
import type { Counts } from "@/components/admin/types";
import { Badge, BarChart, Card, Empty, Loading, Stat, Table } from "@/components/admin/ui";
import { addDays, formatJalali } from "@/lib/utils/jalali";

type Summary = {
    range: Range;
    days: number;
    totals: Counts & { iranian: number; foreign: number };
    averagePerDay: number;
    peakHour: { hour: number; total: number } | null;
    busiestDay: { date: string; total: number } | null;
    noShowRate: number | null;
    byDay: { date: string; total: number }[];
    byHour: { hour: number; total: number }[];
    byDoctor: ({ doctorId: number; doctorName: string; specialtyName: string } & Counts)[];
    bySpecialty: { specialtyId: number; name: string; total: number }[];
    byKiosk: { kioskId: number | null; name: string; total: number }[];
};

type Uptime = {
    rows: ({ kioskId: number; name: string; measured: false } | { kioskId: number; name: string; measured: true; windowMs: number; offlineMs: number; outages: number; longestOutageMs: number; uptimePercent: number })[];
};

export default function ReportsPage() {
    const today = todayKey();
    const [range, setRange] = useState<Range>({ from: addDays(today, -6), to: today });
    const query = buildQuery(range);
    const summary = useFetch<Summary>(`/reports/summary?${query}`);
    const uptime = useFetch<Uptime>(`/reports/kiosk-uptime?${query}`);

    const data = summary.data;
    const byDay = data
        ? Array.from({ length: data.days }, (_, index) => {
            const date = addDays(range.from, index);
            return { label: formatJalali(date).slice(5), value: data.byDay.find((item) => item.date === date)?.total ?? 0 };
        })
        : [];
    const byHour = data ? Array.from({ length: 24 }, (_, hour) => ({ label: fa(hour), value: data.byHour.find((item) => item.hour === hour)?.total ?? 0 })) : [];

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold">گزارش‌ها</h1>
                <a href={`/api/admin/reports/export.csv?${query}`} className="rounded-lg border border-line-strong px-3 py-2 text-sm font-medium hover:bg-brand-soft">خروجی CSV نوبت‌های این بازه</a>
            </div>

            <Card><DateRange value={range} onChange={setRange} /></Card>

            {summary.loading ? <Loading /> : summary.error || !data ? <Empty>{summary.error}</Empty> : (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                        <Stat label="کل نوبت‌ها" value={fa(data.totals.total)} />
                        <Stat label="انجام‌شده" value={fa(data.totals.completed)} tone="green" />
                        <Stat label="لغو‌شده" value={fa(data.totals.cancelled)} tone="red" />
                        <Stat label="عدم مراجعه" value={fa(data.totals.noShow)} tone="amber" />
                        <Stat label="میانگین روزانه" value={fa(data.averagePerDay)} />
                        <Stat label="ساعت اوج" value={data.peakHour ? `${fa(data.peakHour.hour)}:۰۰` : "—"} />
                    </div>
                    <p className="text-xs text-ink-muted">
                        ایرانی: {fa(data.totals.iranian)} · غیرایرانی: {fa(data.totals.foreign)}
                        {data.noShowRate !== null && ` · نرخ عدم مراجعه: ${fa(data.noShowRate)}٪ (از نوبت‌های تعیین‌تکلیف‌شده)`}
                        {data.busiestDay && ` · شلوغ‌ترین روز: ${formatJalali(data.busiestDay.date)} (${fa(data.busiestDay.total)} نوبت)`}
                    </p>

                    <div className="grid gap-5 lg:grid-cols-2">
                        <Card title="نوبت‌ها به تفکیک روز"><BarChart items={byDay} formatValue={fa} /></Card>
                        <Card title="نوبت‌ها به تفکیک ساعت ثبت"><BarChart items={byHour} formatValue={fa} /></Card>
                    </div>

                    <Card title="به تفکیک پزشک">
                        {data.byDoctor.length === 0 ? <Empty>نوبتی نیست.</Empty> : (
                            <Table head={["پزشک", "تخصص", "کل", "در انتظار", "انجام‌شده", "لغو", "عدم مراجعه"]}>
                                {data.byDoctor.map((row) => (
                                    <tr key={row.doctorId}><td className="font-medium">{row.doctorName}</td><td>{row.specialtyName}</td><td className="font-bold">{fa(row.total)}</td><td>{fa(row.booked)}</td><td>{fa(row.completed)}</td><td>{fa(row.cancelled)}</td><td>{fa(row.noShow)}</td></tr>
                                ))}
                            </Table>
                        )}
                    </Card>

                    <div className="grid gap-5 lg:grid-cols-2">
                        <Card title="به تفکیک تخصص">
                            <Table head={["تخصص", "تعداد"]}>{data.bySpecialty.map((row) => <tr key={row.specialtyId}><td>{row.name}</td><td>{fa(row.total)}</td></tr>)}</Table>
                        </Card>
                        <Card title="به تفکیک کیوسک">
                            <Table head={["کیوسک", "تعداد"]}>{data.byKiosk.map((row) => <tr key={row.kioskId ?? "none"}><td>{row.name}</td><td>{fa(row.total)}</td></tr>)}</Table>
                        </Card>
                    </div>
                </>
            )}

            <Card title="دسترس‌پذیری کیوسک‌ها (آپ‌تایم) در همین بازه">
                {uptime.loading ? <Loading /> : !uptime.data || uptime.data.rows.length === 0 ? <Empty>کیوسکی تعریف نشده است.</Empty> : (
                    <Table head={["کیوسک", "آپ‌تایم", "تعداد قطعی", "مجموع قطعی", "طولانی‌ترین قطعی"]}>
                        {uptime.data.rows.map((row) => row.measured ? (
                            <tr key={row.kioskId}>
                                <td className="font-medium">{row.name}</td>
                                <td><Badge tone={row.uptimePercent >= 99 ? "green" : row.uptimePercent >= 95 ? "amber" : "red"}>{fa(row.uptimePercent)}٪</Badge></td>
                                <td>{fa(row.outages)}</td>
                                <td>{formatDuration(row.offlineMs)}</td>
                                <td>{formatDuration(row.longestOutageMs)}</td>
                            </tr>
                        ) : <tr key={row.kioskId}><td className="font-medium">{row.name}</td><td colSpan={4} className="text-ink-muted">در این بازه هنوز جفت/فعال نبوده است</td></tr>)}
                    </Table>
                )}
                <p className="mt-3 text-xs text-ink-muted">آپ‌تایم از رویدادهای قطع و وصل نبض محاسبه می‌شود و از زمان جفت‌سازی کیوسک شروع می‌شود.</p>
            </Card>
        </div>
    );
}