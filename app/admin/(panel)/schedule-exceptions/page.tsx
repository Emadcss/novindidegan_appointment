"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DatePicker from "react-multi-date-picker";
import type DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";

type Doctor = { id: number; display_name: string; specialty_name: string; is_active: boolean };
type ExceptionType = "disabled" | "override";
type ScheduleException = {
    id: number;
    doctor_id: number;
    doctor_name: string;
    specialty_name: string;
    date: string;
    type: ExceptionType;
    start_time: string | null;
    end_time: string | null;
    reason: string | null;
    is_active: boolean;
};
type ApiResponse = { error?: string; doctors?: Doctor[]; exceptions?: ScheduleException[] };

const inputClass = "w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100";
const faDigits = (value: string | number) => String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

function toGregorianKey(date: DateObject | null): string {
    return date ? date.convert(gregorian, gregorian_en).format("YYYY-MM-DD") : "";
}

function formatPersianDate(dateKey: string): string {
    const date = new Date(`${dateKey}T12:00:00Z`);
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        timeZone: "Asia/Tehran", year: "numeric", month: "long", day: "numeric",
    }).format(date);
}

export default function ScheduleExceptionsPage() {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
    const [doctorId, setDoctorId] = useState("");
    const [selectedDate, setSelectedDate] = useState<DateObject | null>(null);
    const [type, setType] = useState<ExceptionType>("disabled");
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("13:00");
    const [reason, setReason] = useState("");
    const [search, setSearch] = useState("");
    const [showInactive, setShowInactive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingId, setChangingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/admin/schedule-exceptions", { cache: "no-store" });
            const data = (await response.json()) as ApiResponse;
            if (!response.ok) throw new Error(data.error || "دریافت اطلاعات انجام نشد.");
            setDoctors(data.doctors ?? []);
            setExceptions(data.exceptions ?? []);
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "خطا در دریافت اطلاعات.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadData(); }, [loadData]);

    const visibleExceptions = useMemo(() => {
        const term = search.trim().toLocaleLowerCase("fa");
        return exceptions.filter((item) => {
            const matchesText = [item.doctor_name, item.specialty_name, item.reason ?? "", formatPersianDate(item.date)]
                .some((value) => value.toLocaleLowerCase("fa").includes(term));
            return matchesText && (showInactive || item.is_active);
        });
    }, [exceptions, search, showInactive]);

    async function submitException(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setSuccess("");
        const date = toGregorianKey(selectedDate);
        if (!doctorId || !date) {
            setError("پزشک و تاریخ را انتخاب کنید.");
            return;
        }
        if (type === "override" && (!startTime || !endTime || startTime >= endTime)) {
            setError("در برنامه جایگزین، ساعت پایان باید بعد از شروع باشد.");
            return;
        }
        setSaving(true);
        try {
            const response = await fetch("/api/admin/schedule-exceptions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    doctorId: Number(doctorId), date, type,
                    startTime: type === "override" ? startTime : null,
                    endTime: type === "override" ? endTime : null,
                    reason: reason.trim(),
                }),
            });
            const data = (await response.json()) as ApiResponse;
            if (!response.ok) throw new Error(data.error || "ثبت استثنا انجام نشد.");
            setSuccess(type === "disabled" ? "غیبت پزشک برای این تاریخ ثبت شد؛ کیوسک او را برای این روز نمایش نمی‌دهد." : "برنامه جایگزین این تاریخ ثبت شد.");
            setReason("");
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "خطا در ثبت استثنا.");
        } finally {
            setSaving(false);
        }
    }

    async function toggleException(item: ScheduleException) {
        setError(""); setSuccess(""); setChangingId(item.id);
        try {
            const response = await fetch("/api/admin/schedule-exceptions", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: item.id, isActive: !item.is_active }),
            });
            const data = (await response.json()) as ApiResponse;
            if (!response.ok) throw new Error(data.error || "تغییر وضعیت انجام نشد.");
            setSuccess(item.is_active ? "استثنا غیرفعال شد و برنامه هفتگی دوباره ملاک است." : "استثنا فعال شد.");
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "خطا در تغییر وضعیت.");
        } finally {
            setChangingId(null);
        }
    }

    return (
        <main dir="rtl" className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
            <header className="space-y-2">
                <p className="text-sm font-medium text-sky-700">مدیریت برنامه پزشکان</p>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">استثناهای تقویمی</h1>
                <p className="text-sm leading-7 text-slate-600">برای یک تاریخ مشخص، حضور پزشک را لغو کنید یا ساعت متفاوتی تعریف کنید. تاریخ در تقویم شمسی انتخاب می‌شود و در دیتابیس به‌صورت تاریخ میلادی استاندارد ذخیره خواهد شد.</p>
            </header>

            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
            {success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-800">{success}</div>}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-bold text-slate-900">ثبت تغییر برنامه</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">اگر برای یک پزشک و تاریخ استثنای فعالی وجود داشته باشد، ثبت جدید آن را به‌روزرسانی می‌کند؛ رکورد تکراری فعال ساخته نمی‌شود.</p>
                <form onSubmit={submitException} className="mt-5 space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                            <span className="block text-sm font-medium text-slate-700">پزشک</span>
                            <select className={inputClass} required value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>
                                <option value="">انتخاب پزشک</option>
                                {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.display_name} — {doctor.specialty_name}{doctor.is_active ? "" : " (غیرفعال)"}</option>)}
                            </select>
                        </label>
                        <div className="space-y-2">
                            <span className="block text-sm font-medium text-slate-700">تاریخ (شمسی)</span>
                            <DatePicker
                                value={selectedDate}
                                onChange={(value) => setSelectedDate(value && !Array.isArray(value) ? value : null)}
                                calendar={persian}
                                locale={persian_fa}
                                calendarPosition="bottom-right"
                                minDate={new Date()}
                                format="YYYY/MM/DD"
                                inputClass={inputClass}
                                placeholder="انتخاب تاریخ شمسی"
                            />
                            {selectedDate && <p className="text-xs text-slate-500">تاریخ ذخیره‌شونده: {toGregorianKey(selectedDate)}</p>}
                        </div>
                    </div>

                    <fieldset className="space-y-3">
                        <legend className="text-sm font-medium text-slate-700">نوع تغییر</legend>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${type === "disabled" ? "border-red-300 bg-red-50" : "border-slate-200"}`}>
                                <input type="radio" name="exceptionType" value="disabled" checked={type === "disabled"} onChange={() => setType("disabled")} className="mt-1" />
                                <span><strong className="block text-sm text-slate-900">غیبت / لغو حضور</strong><span className="mt-1 block text-sm leading-6 text-slate-600">پزشک در این تاریخ برای دریافت نوبت در کیوسک در دسترس نیست.</span></span>
                            </label>
                            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${type === "override" ? "border-sky-300 bg-sky-50" : "border-slate-200"}`}>
                                <input type="radio" name="exceptionType" value="override" checked={type === "override"} onChange={() => setType("override")} className="mt-1" />
                                <span><strong className="block text-sm text-slate-900">برنامه جایگزین</strong><span className="mt-1 block text-sm leading-6 text-slate-600">ساعت‌های این تاریخ جایگزین برنامه هفتگی می‌شوند.</span></span>
                            </label>
                        </div>
                    </fieldset>

                    {type === "override" && <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2"><span className="block text-sm text-slate-700">ساعت شروع</span><input className={inputClass} type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
                        <label className="space-y-2"><span className="block text-sm text-slate-700">ساعت پایان</span><input className={inputClass} type="time" required value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
                    </div>}

                    <label className="block space-y-2"><span className="block text-sm font-medium text-slate-700">علت / توضیحات (اختیاری)</span><textarea className={inputClass} rows={2} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="مثلاً مرخصی، جلسه، شرایط اضطراری..." /><span className="block text-left text-xs text-slate-400">{faDigits(reason.length)} / ۳۰۰</span></label>
                    <button type="submit" disabled={saving} className="w-full rounded-xl bg-sky-700 px-5 py-3 font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">{saving ? "در حال ثبت..." : "ثبت استثنای تقویم"}</button>
                </form>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">فهرست استثناها</h2><p className="mt-1 text-sm text-slate-500">تاریخ‌های گذشته تا ۳۰ روز قبل و تمام تاریخ‌های آینده نمایش داده می‌شوند.</p></div><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />نمایش موارد غیرفعال</label></div>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجو بر اساس پزشک، تخصص، تاریخ یا علت" /><button type="button" onClick={() => void loadData()} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">به‌روزرسانی</button></div>
                {loading ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">در حال دریافت اطلاعات...</p> : visibleExceptions.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">موردی برای نمایش وجود ندارد.</p> : <div className="space-y-3">{visibleExceptions.map((item) => <article key={item.id} className={`rounded-xl border p-4 ${item.is_active ? "border-slate-200" : "border-slate-100 bg-slate-50 opacity-75"}`}>
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="space-y-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900">{item.doctor_name}</h3><span className="text-xs text-slate-500">{item.specialty_name}</span><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${!item.is_active ? "bg-slate-200 text-slate-600" : item.type === "disabled" ? "bg-red-100 text-red-700" : "bg-sky-100 text-sky-800"}`}>{!item.is_active ? "غیرفعال" : item.type === "disabled" ? "لغو حضور" : "برنامه جایگزین"}</span></div><p className="text-sm font-semibold text-slate-700">{formatPersianDate(item.date)}</p>{item.type === "override" && <p className="text-sm text-slate-600">ساعت حضور: {faDigits(item.start_time ?? "—")} تا {faDigits(item.end_time ?? "—")}</p>}{item.reason && <p className="text-sm leading-6 text-slate-500">علت: {item.reason}</p>}</div><button type="button" disabled={changingId === item.id} onClick={() => void toggleException(item)} className={`rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${item.is_active ? "border-red-200 text-red-700 hover:bg-red-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>{changingId === item.id ? "در حال تغییر..." : item.is_active ? "غیرفعال‌کردن" : "فعال‌کردن مجدد"}</button></div>
                </article>)}</div>}
            </section>
        </main>
    );
}
