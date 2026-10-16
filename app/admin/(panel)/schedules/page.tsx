
"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

type Doctor = {
    id: number;
    first_name: string;
    last_name: string;
    display_name: string;
    is_active: boolean;
    specialty_name: string;
};

type Schedule = {
    id: number;
    doctor_id: number;
    doctor_name: string;
    specialty_name: string;
    weekday: number;
    start_time: string;
    end_time: string;
    valid_from: string;
    valid_until: string | null;
    is_active: boolean;
};

type ApiError = { error?: string };

const weekdays = [
    { value: 6, label: "شنبه" },
    { value: 0, label: "یکشنبه" },
    { value: 1, label: "دوشنبه" },
    { value: 2, label: "سه‌شنبه" },
    { value: 3, label: "چهارشنبه" },
    { value: 4, label: "پنجشنبه" },
    { value: 5, label: "جمعه" },
];

function getTodayTehran() {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Tehran",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());

    const part = (type: string) =>
        parts.find((item) => item.type === type)?.value ?? "";

    return `${part("year")}-${part("month")}-${part("day")}`;
}

function toPersianDigits(value: string | number) {
    return String(value).replace(/\d/g, (digit) =>
        "۰۱۲۳۴۵۶۷۸۹"[Number(digit)],
    );
}

function getWeekdayLabel(value: number) {
    return weekdays.find((day) => day.value === value)?.label ?? "نامشخص";
}

export default function SchedulesPage() {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [doctorId, setDoctorId] = useState("");
    const [weekday, setWeekday] = useState("6");
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("13:00");
    const [validFrom, setValidFrom] = useState(getTodayTehran);
    const [validUntil, setValidUntil] = useState("");
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingId, setChangingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/admin/schedules", {
                cache: "no-store",
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    (data as ApiError).error ?? "دریافت برنامه‌ها انجام نشد.",
                );
            }

            setDoctors(data.doctors as Doctor[]);
            setSchedules(data.schedules as Schedule[]);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "خطا در دریافت اطلاعات.",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        async function fetchInitialData() {
            setLoading(true);
            setError("");

            try {
                const response = await fetch("/api/admin/schedules", {
                    method: "GET",
                    cache: "no-store",
                    signal: controller.signal,
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.error || "خطا در دریافت برنامه‌های حضور پزشکان",
                    );
                }

                setDoctors(result.doctors ?? []);
                setSchedules(result.schedules ?? []);
            } catch (error) {
                if (error instanceof Error && error.name === "AbortError") {
                    return;
                }

                setError(
                    error instanceof Error
                        ? error.message
                        : "خطای نامشخص در دریافت اطلاعات",
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void fetchInitialData();

        return () => {
            controller.abort();
        };
    }, []);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!doctorId) {
            setError("ابتدا پزشک را انتخاب کنید.");
            return;
        }

        if (startTime >= endTime) {
            setError("ساعت پایان باید بعد از ساعت شروع باشد.");
            return;
        }

        if (validUntil && validUntil < validFrom) {
            setError("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.");
            return;
        }

        setSaving(true);

        try {
            const response = await fetch("/api/admin/schedules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    doctorId: Number(doctorId),
                    weekday: Number(weekday),
                    startTime,
                    endTime,
                    validFrom,
                    validUntil: validUntil || null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    (data as ApiError).error ?? "ثبت برنامه انجام نشد.",
                );
            }

            setSuccess("برنامهٔ حضور پزشک با موفقیت ثبت شد.");
            await loadData();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "خطا در ثبت برنامه.",
            );
        } finally {
            setSaving(false);
        }
    }

    async function toggleSchedule(schedule: Schedule) {
        setError("");
        setSuccess("");
        setChangingId(schedule.id);

        try {
            const response = await fetch("/api/admin/schedules", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: schedule.id,
                    isActive: !schedule.is_active,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    (data as ApiError).error ?? "تغییر وضعیت برنامه انجام نشد.",
                );
            }

            setSuccess(
                schedule.is_active
                    ? "برنامه غیرفعال شد؛ سابقهٔ آن باقی ماند."
                    : "برنامه دوباره فعال شد.",
            );

            await loadData();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "خطا در تغییر وضعیت.",
            );
        } finally {
            setChangingId(null);
        }
    }

    const filteredSchedules = schedules.filter((schedule) => {
        const matchesSearch = [
            schedule.doctor_name,
            schedule.specialty_name,
            getWeekdayLabel(schedule.weekday),
        ]
            .join(" ")
            .toLowerCase()
            .includes(search.trim().toLowerCase());

        const matchesStatus =
            activeFilter === "all" ||
            (activeFilter === "active" && schedule.is_active) ||
            (activeFilter === "inactive" && !schedule.is_active);

        return matchesSearch && matchesStatus;
    });

    const activeCount = schedules.filter((item) => item.is_active).length;

    return (
        <main dir="rtl" className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
            <header className="space-y-2">
                <p className="text-sm font-medium text-blue-700">
                    مدیریت پزشکان
                </p>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                    برنامهٔ حضور پزشکان
                </h1>
                <p className="text-sm leading-7 text-slate-600">
                    ساعات حضور هفتگی و بازهٔ اعتبار هر برنامه را تعریف کنید.
                    پزشکان طبق برنامهٔ معتبر روز انتخاب‌شده در کیوسک نمایش داده می‌شوند.
                </p>
            </header>

            {error && (
                <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                    {error}
                </div>
            )}

            {success && (
                <div
                    role="status"
                    className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                >
                    {success}
                </div>
            )}

            <section className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">کل برنامه‌ها</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {toPersianDigits(schedules.length)}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">برنامه‌های فعال</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-700">
                        {toPersianDigits(activeCount)}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">پزشکان فعال</p>
                    <p className="mt-2 text-3xl font-bold text-blue-700">
                        {toPersianDigits(
                            doctors.filter((doctor) => doctor.is_active).length,
                        )}
                    </p>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="mb-5">
                    <h2 className="text-lg font-bold text-slate-900">
                        افزودن برنامهٔ هفتگی
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        برای یک پزشک می‌توانید در روزهای مختلف برنامه تعریف کنید.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="space-y-2">
            <span className="block text-sm font-medium text-slate-700">
              پزشک
            </span>
                        <select
                            required
                            value={doctorId}
                            onChange={(event) => setDoctorId(event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="">انتخاب پزشک</option>
                            {doctors
                                .filter((doctor) => doctor.is_active)
                                .map((doctor) => (
                                    <option key={doctor.id} value={doctor.id}>
                                        {doctor.display_name} — {doctor.specialty_name}
                                    </option>
                                ))}
                        </select>
                    </label>

                    <label className="space-y-2">
            <span className="block text-sm font-medium text-slate-700">
              روز هفته
            </span>
                        <select
                            value={weekday}
                            onChange={(event) => setWeekday(event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        >
                            {weekdays.map((day) => (
                                <option key={day.value} value={day.value}>
                                    {day.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="space-y-2">
              <span className="block text-sm font-medium text-slate-700">
                شروع حضور
              </span>
                            <input
                                required
                                type="time"
                                value={startTime}
                                onChange={(event) => setStartTime(event.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
                            />
                        </label>
                        <label className="space-y-2">
              <span className="block text-sm font-medium text-slate-700">
                پایان حضور
              </span>
                            <input
                                required
                                type="time"
                                value={endTime}
                                onChange={(event) => setEndTime(event.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
                            />
                        </label>
                    </div>

                    <label className="space-y-2">
            <span className="block text-sm font-medium text-slate-700">
              معتبر از تاریخ
            </span>
                        <input
                            required
                            type="date"
                            value={validFrom}
                            onChange={(event) => setValidFrom(event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
                        />
                    </label>

                    <label className="space-y-2">
            <span className="block text-sm font-medium text-slate-700">
              معتبر تا تاریخ (اختیاری)
            </span>
                        <input
                            type="date"
                            min={validFrom}
                            value={validUntil}
                            onChange={(event) => setValidUntil(event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
                        />
                        <span className="block text-xs leading-5 text-slate-500">
              اگر خالی باشد، برنامه تاریخ پایان ندارد.
            </span>
                    </label>

                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={saving || loading}
                            className="w-full rounded-xl bg-blue-700 px-5 py-3 font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? "در حال ثبت..." : "ثبت برنامه"}
                        </button>
                    </div>
                </form>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-bold text-slate-900">
                        فهرست برنامه‌ها
                    </h2>

                    <button
                        type="button"
                        onClick={() => void loadData()}
                        disabled={loading}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                        {loading ? "در حال دریافت..." : "به‌روزرسانی"}
                    </button>
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-2">
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="جست‌وجوی پزشک، تخصص یا روز..."
                        className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-600"
                    />

                    <select
                        value={activeFilter}
                        onChange={(event) => setActiveFilter(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
                    >
                        <option value="all">همهٔ برنامه‌ها</option>
                        <option value="active">فقط فعال</option>
                        <option value="inactive">فقط غیرفعال</option>
                    </select>
                </div>

                {loading ? (
                    <p className="p-8 text-center text-sm text-slate-500">
                        در حال دریافت برنامه‌ها...
                    </p>
                ) : filteredSchedules.length === 0 ? (
                    <p className="p-8 text-center text-sm text-slate-500">
                        برنامه‌ای برای نمایش پیدا نشد.
                    </p>
                ) : (
                    <>
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                    <th className="px-5 py-4 font-medium">پزشک و تخصص</th>
                                    <th className="px-5 py-4 font-medium">روز</th>
                                    <th className="px-5 py-4 font-medium">ساعات حضور</th>
                                    <th className="px-5 py-4 font-medium">بازهٔ اعتبار</th>
                                    <th className="px-5 py-4 font-medium">وضعیت</th>
                                    <th className="px-5 py-4 font-medium">عملیات</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                {filteredSchedules.map((schedule) => (
                                    <tr key={schedule.id} className="hover:bg-slate-50/70">
                                        <td className="px-5 py-4">
                                            <p className="font-semibold text-slate-900">
                                                {schedule.doctor_name}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {schedule.specialty_name}
                                            </p>
                                        </td>
                                        <td className="px-5 py-4">
                                            {getWeekdayLabel(schedule.weekday)}
                                        </td>
                                        <td className="px-5 py-4" dir="ltr">
                                            {schedule.start_time} – {schedule.end_time}
                                        </td>
                                        <td className="px-5 py-4" dir="ltr">
                                            <div>{schedule.valid_from}</div>
                                            <div className="mt-1 text-xs text-slate-500">
                                                تا {schedule.valid_until ?? "بدون تاریخ پایان"}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                        <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                schedule.is_active
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-600"
                            }`}
                        >
                          {schedule.is_active ? "فعال" : "غیرفعال"}
                        </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <button
                                                type="button"
                                                disabled={changingId === schedule.id}
                                                onClick={() => void toggleSchedule(schedule)}
                                                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                                            >
                                                {changingId === schedule.id
                                                    ? "در حال تغییر..."
                                                    : schedule.is_active
                                                        ? "غیرفعال‌کردن"
                                                        : "فعال‌کردن"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="space-y-3 p-4 md:hidden">
                            {filteredSchedules.map((schedule) => (
                                <article
                                    key={schedule.id}
                                    className="space-y-3 rounded-xl border border-slate-200 p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="font-bold text-slate-900">
                                                {schedule.doctor_name}
                                            </h3>
                                            <p className="mt-1 text-sm text-slate-500">
                                                {schedule.specialty_name}
                                            </p>
                                        </div>
                                        <span
                                            className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                                                schedule.is_active
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-slate-100 text-slate-600"
                                            }`}
                                        >
                      {schedule.is_active ? "فعال" : "غیرفعال"}
                    </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-xs text-slate-500">روز</p>
                                            <p className="mt-1 font-medium">
                                                {getWeekdayLabel(schedule.weekday)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">ساعات حضور</p>
                                            <p className="mt-1 font-medium" dir="ltr">
                                                {schedule.start_time} – {schedule.end_time}
                                            </p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs text-slate-500">بازهٔ اعتبار</p>
                                            <p className="mt-1" dir="ltr">
                                                {schedule.valid_from} – {schedule.valid_until ?? "بدون پایان"}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={changingId === schedule.id}
                                        onClick={() => void toggleSchedule(schedule)}
                                        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        {changingId === schedule.id
                                            ? "در حال تغییر..."
                                            : schedule.is_active
                                                ? "غیرفعال‌کردن برنامه"
                                                : "فعال‌کردن برنامه"}
                                    </button>
                                </article>
                            ))}
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}
