import { useState } from "react";

import { api } from "@/components/admin/api";
import { useMonitoring } from "@/components/admin/AdminApp";
import { DateRange, todayKey } from "@/components/admin/DateRange";
import type { Range } from "@/components/admin/DateRange";
import { STATUS_LABELS, fa } from "@/components/admin/format";
import { useFetch } from "@/components/admin/hooks";
import type { AppointmentView, DoctorRow, User } from "@/components/admin/types";
import { Badge, Btn, Card, Empty, Field, Input, Loading, Notice, Select, Table } from "@/components/admin/ui";
import { formatJalali } from "@/lib/utils/jalali";

type Listing = { total: number; page: number; pageSize: number; rows: AppointmentView[] };

const STATUS_TONE: Record<string, "blue" | "green" | "amber" | "red"> = { booked: "blue", completed: "green", cancelled: "red", no_show: "amber" };
const PAGE_SIZE = 50;

export function buildQuery(params: Record<string, string | number | undefined>): string {
    return Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== "")
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join("&");
}

export default function AppointmentsPage({ user }: { user: User }) {
    const isAdmin = user.role === "admin";
    const { data: monitoring } = useMonitoring();
    const catalog = useFetch<{ doctors: DoctorRow[] }>("/catalog");
    const [range, setRange] = useState<Range>({ from: todayKey(), to: todayKey() });
    const [doctorId, setDoctorId] = useState("");
    const [kioskId, setKioskId] = useState("");
    const [status, setStatus] = useState("");
    const [number, setNumber] = useState("");
    const [page, setPage] = useState(1);
    const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
    const [revealed, setRevealed] = useState<Record<number, string>>({});

    const query = buildQuery({ ...range, doctorId, kioskId, status, number, page, pageSize: PAGE_SIZE });
    const listing = useFetch<Listing>(`/reports/appointments?${query}`, { refreshMs: 20_000 });
    const exportUrl = `/api/admin/reports/export.csv?${buildQuery({ ...range, doctorId, kioskId, status, number })}`;

    async function changeStatus(id: number, next: string) {
        setMessage(null);
        try {
            await api.patch(`/appointments/${id}`, { status: next });
            setMessage({ tone: "success", text: "وضعیت نوبت به‌روز شد" });
            listing.reload();
        } catch (caught) {
            setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "خطا" });
        }
    }

    async function reveal(id: number) {
        try {
            const result = await api.post<{ value: string | null }>(`/appointments/${id}/reveal`);
            setRevealed((current) => ({ ...current, [id]: result.value ?? "—" }));
        } catch (caught) {
            setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "خطا" });
        }
    }

    const reset = <T,>(setter: (value: T) => void) => (value: T) => { setter(value); setPage(1); };
    const pages = listing.data ? Math.max(1, Math.ceil(listing.data.total / PAGE_SIZE)) : 1;

    return (
        <div className="flex flex-col gap-5">
            <h1 className="text-2xl font-bold">نوبت‌ها</h1>

            <Card>
                <div className="flex flex-col gap-4">
                    <DateRange value={range} onChange={(next) => { setRange(next); setPage(1); }} />
                    <div className="grid gap-3 md:grid-cols-4">
                        <Field label="پزشک">
                            <Select value={doctorId} onChange={(e) => reset(setDoctorId)(e.target.value)}>
                                <option value="">همه</option>
                                {catalog.data?.doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.displayName}</option>)}
                            </Select>
                        </Field>
                        <Field label="کیوسک">
                            <Select value={kioskId} onChange={(e) => reset(setKioskId)(e.target.value)}>
                                <option value="">همه</option>
                                {monitoring?.kiosks.map((kiosk) => <option key={kiosk.id} value={kiosk.id}>{kiosk.name}</option>)}
                            </Select>
                        </Field>
                        <Field label="وضعیت">
                            <Select value={status} onChange={(e) => reset(setStatus)(e.target.value)}>
                                <option value="">همه</option>
                                {Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                            </Select>
                        </Field>
                        <Field label="شماره‌ی نوبت">
                            <Input dir="ltr" inputMode="numeric" value={number} onChange={(e) => reset(setNumber)(e.target.value.replace(/\D/g, ""))} />
                        </Field>
                    </div>
                </div>
            </Card>

            {message && <Notice tone={message.tone}>{message.text}</Notice>}

            <Card
                title={listing.data ? `${fa(listing.data.total)} نوبت` : "نوبت‌ها"}
                actions={<a href={exportUrl} className="rounded-lg border border-line-strong px-3 py-1 text-xs font-medium hover:bg-brand-soft">خروجی CSV</a>}
            >
                {listing.loading ? <Loading /> : listing.error ? <Empty>{listing.error}</Empty> : listing.data?.rows.length === 0 ? <Empty>نوبتی در این بازه نیست.</Empty> : (
                    <Table head={["تاریخ", "ساعت", "شماره", "پزشک", "تخصص", "وضعیت", "بیمار", "کیوسک"]}>
                        {listing.data?.rows.map((row) => (
                            <tr key={row.id}>
                                <td>{formatJalali(row.date)}</td>
                                <td>{fa(row.time)}</td>
                                <td className="font-bold">{fa(row.number)}</td>
                                <td>{row.doctorName}</td>
                                <td>{row.specialtyName}</td>
                                <td>
                                    {isAdmin ? (
                                        <Select value={row.status} aria-label={`وضعیت نوبت ${row.number}`} onChange={(e) => void changeStatus(row.id, e.target.value)} className="w-32 py-1">
                                            {Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                        </Select>
                                    ) : <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABELS[row.status]}</Badge>}
                                </td>
                                <td dir="ltr" className="text-right">
                                    <span className="text-xs text-ink-muted">{row.identityKind} </span>
                                    {revealed[row.id] ?? row.identityMasked}
                                    {isAdmin && revealed[row.id] === undefined && <button type="button" className="mr-2 text-xs text-brand" onClick={() => void reveal(row.id)}>نمایش</button>}
                                </td>
                                <td>{row.kioskName ?? "—"}</td>
                            </tr>
                        ))}
                    </Table>
                )}
                {pages > 1 && (
                    <div className="mt-3 flex items-center justify-center gap-3 text-sm">
                        <Btn small disabled={page <= 1} onClick={() => setPage(page - 1)}>قبلی</Btn>
                        <span>صفحه {fa(page)} از {fa(pages)}</span>
                        <Btn small disabled={page >= pages} onClick={() => setPage(page + 1)}>بعدی</Btn>
                    </div>
                )}
                <p className="mt-3 text-xs text-ink-muted">کد ملی و موبایل پنهان‌شده نمایش داده می‌شود. «نمایش» هویت کامل را نشان می‌دهد و در گزارش فعالیت‌ها ثبت می‌شود.</p>
            </Card>
        </div>
    );
}