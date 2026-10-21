"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { api } from "@/components/admin/api";
import { todayKey } from "@/components/admin/DateRange";
import { WEEKDAYS, fa } from "@/components/admin/format";
import { useFetch } from "@/components/admin/hooks";
import type { DoctorRow, ExceptionRow, ScheduleRow, SpecialtyRow, User } from "@/components/admin/types";
import { Badge, Btn, Card, Empty, Field, Input, Loading, Notice, Select, Table } from "@/components/admin/ui";
import { formatJalali, parseJalaliInput } from "@/lib/utils/jalali";

type Catalog = { today: string; specialties: SpecialtyRow[]; doctors: DoctorRow[]; schedules: ScheduleRow[]; exceptions: ExceptionRow[] };
type Range = { weekday: number; startTime: string; endTime: string };

function ScheduleEditor({ doctor, schedules, onSaved }: { doctor: DoctorRow; schedules: ScheduleRow[]; onSaved: () => void }) {
    const initial = (): Range[] => schedules.filter((row) => row.doctorId === doctor.id).map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime }));
    const [ranges, setRanges] = useState<Range[]>(initial);
    const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

    useEffect(() => setRanges(initial()), [doctor.id, schedules]); // eslint-disable-line react-hooks/exhaustive-deps

    const update = (index: number, patch: Partial<Range>) => setRanges(ranges.map((range, i) => (i === index ? { ...range, ...patch } : range)));

    async function save() {
        setMessage(null);
        try {
            await api.put(`/doctors/${doctor.id}/schedule`, { ranges });
            setMessage({ tone: "success", text: "برنامه‌ی هفتگی ذخیره شد و همین حالا اثر می‌کند" });
            onSaved();
        } catch (caught) {
            setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "خطا" });
        }
    }

    return (
        <div className="flex flex-col gap-2">
            {WEEKDAYS.map((name, weekday) => {
                const rows = ranges.map((range, index) => ({ range, index })).filter((item) => item.range.weekday === weekday);
                return (
                    <div key={name} className="flex flex-wrap items-center gap-2 rounded-lg bg-paper px-3 py-2">
                        <span className="w-20 text-sm font-medium">{name}</span>
                        {rows.length === 0 && <span className="text-xs text-ink-muted">تعطیل</span>}
                        {rows.map(({ range, index }) => (
                            <span key={index} className="flex items-center gap-1" dir="ltr">
                                <Input type="time" aria-label={`${name} شروع`} value={range.startTime} onChange={(e) => update(index, { startTime: e.target.value })} className="w-28 py-1" />
                                <span>–</span>
                                <Input type="time" aria-label={`${name} پایان`} value={range.endTime} onChange={(e) => update(index, { endTime: e.target.value })} className="w-28 py-1" />
                                <button type="button" aria-label="حذف بازه" className="px-1 text-danger" onClick={() => setRanges(ranges.filter((_, i) => i !== index))}>✕</button>
                            </span>
                        ))}
                        <Btn small variant="ghost" onClick={() => setRanges([...ranges, { weekday, startTime: "09:00", endTime: "13:00" }])}>+ بازه</Btn>
                    </div>
                );
            })}
            {message && <Notice tone={message.tone}>{message.text}</Notice>}
            <div><Btn variant="primary" onClick={() => void save()}>ذخیره‌ی برنامه‌ی هفتگی</Btn></div>
        </div>
    );
}

function Exceptions({ doctor, exceptions, onChanged }: { doctor: DoctorRow; exceptions: ExceptionRow[]; onChanged: () => void }) {
    const [date, setDate] = useState(formatJalali(todayKey()));
    const [type, setType] = useState<"disabled" | "override">("disabled");
    const [start, setStart] = useState("09:00");
    const [end, setEnd] = useState("12:00");
    const [reason, setReason] = useState("");
    const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

    async function run(action: () => Promise<unknown>, success: string) {
        setMessage(null);
        try {
            await action();
            setMessage({ tone: "success", text: success });
            onChanged();
        } catch (caught) {
            setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "خطا" });
        }
    }

    function add(event: FormEvent) {
        event.preventDefault();
        const iso = parseJalaliInput(date);
        if (!iso) return setMessage({ tone: "error", text: "تاریخ شمسی معتبر نیست (مثلاً ۱۴۰۵/۰۷/۲۴)" });
        void run(() => api.post(`/doctors/${doctor.id}/exceptions`, { date: iso, type, startTime: type === "override" ? start : undefined, endTime: type === "override" ? end : undefined, reason: reason || undefined }), "استثنا ثبت شد");
    }

    const mine = exceptions.filter((item) => item.doctorId === doctor.id);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <Btn variant="danger" onClick={() => void run(() => api.post(`/doctors/${doctor.id}/absent-today`), "پزشک برای امروز غایب شد؛ دیگر در کیوسک دیده نمی‌شود")}>غیبت امروز</Btn>
                <span className="text-xs text-ink-muted">نوبت‌هایی که قبلاً گرفته شده‌اند حفظ می‌شوند؛ فقط نوبت‌گیری تازه بسته می‌شود.</span>
            </div>

            <form onSubmit={add} className="grid gap-3 rounded-lg bg-paper p-3 md:grid-cols-5">
                <Field label="تاریخ (شمسی)"><Input dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} aria-label="تاریخ استثنا" /></Field>
                <Field label="نوع">
                    <Select value={type} onChange={(e) => setType(e.target.value as "disabled" | "override")}>
                        <option value="disabled">غیبت کامل آن روز</option>
                        <option value="override">ساعت حضور متفاوت</option>
                    </Select>
                </Field>
                {type === "override" ? (
                    <>
                        <Field label="از ساعت"><Input type="time" dir="ltr" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
                        <Field label="تا ساعت"><Input type="time" dir="ltr" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
                    </>
                ) : <><span /><span /></>}
                <Field label="علت (اختیاری)"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
                <div className="md:col-span-5"><Btn variant="primary" type="submit">ثبت استثنا</Btn></div>
            </form>

            {message && <Notice tone={message.tone}>{message.text}</Notice>}

            {mine.length === 0 ? <p className="text-sm text-ink-muted">استثنای آینده‌ای ثبت نشده است.</p> : (
                <Table head={["تاریخ", "نوع", "علت", ""]}>
                    {mine.map((item) => (
                        <tr key={item.id}>
                            <td>{formatJalali(item.date)}</td>
                            <td>{item.type === "disabled" ? <Badge tone="red">غیبت</Badge> : <Badge tone="amber">{fa(item.startTime ?? "")} تا {fa(item.endTime ?? "")}</Badge>}</td>
                            <td>{item.reason ?? "—"}</td>
                            <td><Btn small variant="ghost" onClick={() => void run(() => api.del(`/exceptions/${item.id}`), "استثنا حذف شد")}>حذف</Btn></td>
                        </tr>
                    ))}
                </Table>
            )}
        </div>
    );
}

export default function DoctorsPage({ user }: { user: User }) {
    const isAdmin = user.role === "admin";
    const { data, loading, error, reload } = useFetch<Catalog>("/catalog");
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
    const [specialtyName, setSpecialtyName] = useState("");
    const [form, setForm] = useState({ specialtyId: "", firstName: "", lastName: "", requiresSurgeryHistory: false });

    async function run(action: () => Promise<unknown>, success?: string) {
        setMessage(null);
        try {
            await action();
            if (success) setMessage({ tone: "success", text: success });
            reload();
        } catch (caught) {
            setMessage({ tone: "error", text: caught instanceof Error ? caught.message : "خطا" });
        }
    }

    if (loading) return <Loading />;
    if (error || !data) return <Empty>{error}</Empty>;

    const specialtyById = new Map(data.specialties.map((item) => [item.id, item]));
    const selected = data.doctors.find((doctor) => doctor.id === selectedId) ?? null;

    return (
        <div className="flex flex-col gap-5">
            <h1 className="text-2xl font-bold">پزشکان و برنامه‌ی حضور</h1>
            {message && <Notice tone={message.tone}>{message.text}</Notice>}

            <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
                <div className="flex flex-col gap-5">
                    <Card title="پزشکان">
                        <Table head={["پزشک", "تخصص", "وضعیت", ""]}>
                            {data.doctors.map((doctor) => (
                                <tr key={doctor.id} className={selectedId === doctor.id ? "bg-brand-soft" : ""}>
                                    <td className="font-medium">{doctor.displayName}{doctor.requiresSurgeryHistory && <span className="mr-1 text-xs text-ink-muted"> (سؤال جراحی)</span>}</td>
                                    <td>{specialtyById.get(doctor.specialtyId)?.name}</td>
                                    <td>{doctor.isActive ? <Badge tone="green">فعال</Badge> : <Badge>غیرفعال</Badge>}</td>
                                    <td className="whitespace-nowrap">
                                        <Btn small onClick={() => setSelectedId(doctor.id)}>برنامه</Btn>{" "}
                                        {isAdmin && <Btn small variant="ghost" onClick={() => void run(() => api.patch(`/doctors/${doctor.id}`, { isActive: !doctor.isActive }))}>{doctor.isActive ? "غیرفعال" : "فعال"}</Btn>}
                                    </td>
                                </tr>
                            ))}
                        </Table>
                    </Card>

                    {isAdmin && (
                        <Card title="افزودن پزشک">
                            <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => {
                                event.preventDefault();
                                void run(async () => { await api.post("/doctors", { ...form, specialtyId: Number(form.specialtyId) }); setForm({ specialtyId: "", firstName: "", lastName: "", requiresSurgeryHistory: false }); }, "پزشک اضافه شد؛ برنامه‌ی هفتگی‌اش را تنظیم کنید");
                            }}>
                                <Field label="تخصص">
                                    <Select value={form.specialtyId} onChange={(e) => setForm({ ...form, specialtyId: e.target.value })} aria-label="تخصص پزشک جدید">
                                        <option value="">انتخاب…</option>
                                        {data.specialties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                    </Select>
                                </Field>
                                <Field label="نام"><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} aria-label="نام پزشک" /></Field>
                                <Field label="نام خانوادگی"><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} aria-label="نام خانوادگی پزشک" /></Field>
                                <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" checked={form.requiresSurgeryHistory} onChange={(e) => setForm({ ...form, requiresSurgeryHistory: e.target.checked })} /> سؤال «سابقه‌ی جراحی» پرسیده شود</label>
                                <div className="md:col-span-2"><Btn variant="primary" type="submit" disabled={!form.specialtyId || !form.firstName || !form.lastName}>افزودن پزشک</Btn></div>
                            </form>
                        </Card>
                    )}

                    <Card title="تخصص‌ها">
                        <ul className="flex flex-col gap-2 text-sm">
                            {data.specialties.map((item) => (
                                <li key={item.id} className="flex items-center justify-between rounded-lg bg-paper px-3 py-2">
                                    <span>{item.name} {!item.isActive && <Badge>غیرفعال</Badge>}</span>
                                    {isAdmin && <Btn small variant="ghost" onClick={() => void run(() => api.patch(`/specialties/${item.id}`, { isActive: !item.isActive }))}>{item.isActive ? "غیرفعال" : "فعال"}</Btn>}
                                </li>
                            ))}
                        </ul>
                        {isAdmin && (
                            <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); void run(async () => { await api.post("/specialties", { name: specialtyName }); setSpecialtyName(""); }, "تخصص اضافه شد"); }}>
                                <Input placeholder="نام تخصص جدید" value={specialtyName} onChange={(e) => setSpecialtyName(e.target.value)} aria-label="نام تخصص جدید" />
                                <Btn variant="primary" type="submit" disabled={specialtyName.trim().length < 2}>افزودن</Btn>
                            </form>
                        )}
                    </Card>
                </div>

                <div className="flex flex-col gap-5">
                    {!selected ? <Card><Empty>برای دیدن یا تغییر ساعت حضور، روی «برنامه»ی یک پزشک بزنید.</Empty></Card> : (
                        <>
                            <Card title={`برنامه‌ی هفتگی — ${selected.displayName}`}>
                                {isAdmin ? <ScheduleEditor doctor={selected} schedules={data.schedules} onSaved={reload} /> : (
                                    <ul className="text-sm">{WEEKDAYS.map((name, weekday) => { const list = data.schedules.filter((row) => row.doctorId === selected.id && row.weekday === weekday); return <li key={name} className="flex gap-3 py-1"><span className="w-20">{name}</span><span>{list.length ? list.map((row) => `${fa(row.startTime)}–${fa(row.endTime)}`).join("، ") : "تعطیل"}</span></li>; })}</ul>
                                )}
                            </Card>
                            <Card title="غیبت و استثنا">
                                {isAdmin ? <Exceptions doctor={selected} exceptions={data.exceptions} onChanged={reload} /> : <p className="text-sm text-ink-muted">فقط مدیر می‌تواند استثنا ثبت کند.</p>}
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}