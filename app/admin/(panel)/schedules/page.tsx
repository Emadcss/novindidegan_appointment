
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Doctor = {
    id: number;
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

type Shift = {
    startTime: string;
    endTime: string;
};

type ApiError = { error?: string };

const weekdays = [
    { value: 0, label: "شنبه" },
    { value: 1, label: "یکشنبه" },
    { value: 2, label: "دوشنبه" },
    { value: 3, label: "سه‌شنبه" },
    { value: 4, label: "چهارشنبه" },
    { value: 5, label: "پنجشنبه" },
    { value: 6, label: "جمعه" },
];

const defaultDays = [0, 1, 2, 3, 4, 5];
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

function fa(value: string | number) {
    return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function weekdayLabel(value: number) {
    return weekdays.find((day) => day.value === value)?.label ?? "نامشخص";
}

function hasOverlap(a: Shift, b: Shift) {
    return a.startTime < b.endTime && b.startTime < a.endTime;
}

function normalizeTime(value: string) {
    const digits = value
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
        .replace(/\D/g, "")
        .slice(0, 4);

    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function createInitialShifts(): Record<number, Shift[]> {
    return Object.fromEntries(
        defaultDays.map((day) => [
            day,
            [{ startTime: "09:00", endTime: "13:00" }],
        ]),
    );
}

export default function SchedulesPage() {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [doctorId, setDoctorId] = useState("");
    const [selectedDays, setSelectedDays] = useState<number[]>(defaultDays);
    const [shiftsByDay, setShiftsByDay] =
        useState<Record<number, Shift[]>>(createInitialShifts);

    const [commonStart, setCommonStart] = useState("09:00");
    const [commonEnd, setCommonEnd] = useState("13:00");
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState("all");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [changingId, setChangingId] = useState<number | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadData = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);

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
            setError("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "خطا در دریافت اطلاعات.");
        } finally {
            if (showLoading) setLoading(false);
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

    function toggleDay(day: number) {
        const isSelected = selectedDays.includes(day);

        setSelectedDays((current) =>
            isSelected
                ? current.filter((item) => item !== day)
                : [...current, day],
        );

        if (!isSelected) {
            setShiftsByDay((current) => ({
                ...current,
                [day]: current[day] ?? [
                    { startTime: commonStart, endTime: commonEnd },
                ],
            }));
        }

        setError("");
        setSuccess("");
    }

    function updateShift(
        day: number,
        index: number,
        field: keyof Shift,
        value: string,
    ) {
        setShiftsByDay((current) => ({
            ...current,
            [day]: (current[day] ?? []).map((shift, i) =>
                i === index ? { ...shift, [field]: value } : shift,
            ),
        }));
        setError("");
        setSuccess("");
    }

    function addShift(day: number) {
        setShiftsByDay((current) => ({
            ...current,
            [day]: [
                ...(current[day] ?? []),
                { startTime: commonStart, endTime: commonEnd },
            ],
        }));
        setError("");
        setSuccess("");
    }

    function removeShift(day: number, index: number) {
        setShiftsByDay((current) => ({
            ...current,
            [day]: (current[day] ?? []).filter((_, i) => i !== index),
        }));
        setError("");
        setSuccess("");
    }

    function applyCommonHours() {
        if (selectedDays.length === 0) {
            setError("ابتدا حداقل یک روز را انتخاب کنید.");
            return;
        }

        if (
            !timePattern.test(commonStart) ||
            !timePattern.test(commonEnd) ||
            commonStart >= commonEnd
        ) {
            setError("ساعت مشترک معتبر نیست؛ پایان باید بعد از شروع باشد.");
            return;
        }

        setShiftsByDay((current) => {
            const next = { ...current };

            for (const day of selectedDays) {
                const existing = [...(next[day] ?? [])];
                const commonShift = {
                    startTime: commonStart,
                    endTime: commonEnd,
                };

                if (existing.length === 0) {
                    existing.push(commonShift);
                } else {
                    // فقط شیفت اول تغییر می‌کند؛ شیفت‌های دیگر حفظ می‌شوند.
                    existing[0] = commonShift;
                }

                next[day] = existing;
            }

            return next;
        });

        setError("");
        setSuccess(
            "ساعت شیفت اول روزهای انتخاب‌شده تنظیم شد. برای ثبت نهایی، دکمه ثبت برنامه را بزنید.",
        );
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!doctorId) {
            setError("ابتدا پزشک را انتخاب کنید.");
            return;
        }

        if (selectedDays.length === 0) {
            setError("حداقل یک روز هفته را انتخاب کنید.");
            return;
        }

        const shifts = selectedDays.flatMap((weekday) =>
            (shiftsByDay[weekday] ?? []).map((shift) => ({
                weekday,
                startTime: shift.startTime.trim(),
                endTime: shift.endTime.trim(),
            })),
        );

        if (shifts.length === 0) {
            setError("برای روزهای انتخاب‌شده حداقل یک شیفت تعریف کنید.");
            return;
        }

        for (const shift of shifts) {
            if (
                !timePattern.test(shift.startTime) ||
                !timePattern.test(shift.endTime) ||
                shift.startTime >= shift.endTime
            ) {
                setError(
                    `ساعت شروع و پایان شیفت روز ${weekdayLabel(shift.weekday)} معتبر نیست.`,
                );
                return;
            }
        }

        for (const day of selectedDays) {
            const dayShifts = shiftsByDay[day] ?? [];

            for (let i = 0; i < dayShifts.length; i++) {
                for (let j = i + 1; j < dayShifts.length; j++) {
                    if (hasOverlap(dayShifts[i], dayShifts[j])) {
                        setError(
                            `شیفت‌های روز ${weekdayLabel(day)} با یکدیگر هم‌پوشانی دارند.`,
                        );
                        return;
                    }
                }
            }
        }

        setSaving(true);

        try {
            const response = await fetch("/api/admin/schedules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ doctorId: Number(doctorId), shifts }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error((data as ApiError).error ?? "ثبت برنامه انجام نشد.");
            }

            setSuccess(`برنامه با ${fa(shifts.length)} شیفت ثبت شد.`);
            await loadData(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "خطا در ثبت برنامه.");
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
                    ? "این شیفت غیرفعال شد."
                    : "این شیفت فعال شد.",
            );
            await loadData(false);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "خطا در تغییر وضعیت برنامه.",
            );
        } finally {
            setChangingId(null);
        }
    }

    const filteredSchedules = useMemo(() => {
        const term = search.trim().toLocaleLowerCase();

        return schedules.filter((schedule) => {
            const searchable = [
                schedule.doctor_name,
                schedule.specialty_name,
                weekdayLabel(schedule.weekday),
            ]
                .join(" ")
                .toLocaleLowerCase();

            const matchesSearch = searchable.includes(term);
            const matchesStatus =
                activeFilter === "all" ||
                (activeFilter === "active" && schedule.is_active) ||
                (activeFilter === "inactive" && !schedule.is_active);

            return matchesSearch && matchesStatus;
        });
    }, [schedules, search, activeFilter]);

    const groupedSchedules = useMemo(() => {
        const groups = new Map<
            number,
            { doctorName: string; specialtyName: string; schedules: Schedule[] }
        >();

        for (const schedule of filteredSchedules) {
            const group = groups.get(schedule.doctor_id);

            if (group) {
                group.schedules.push(schedule);
            } else {
                groups.set(schedule.doctor_id, {
                    doctorName: schedule.doctor_name,
                    specialtyName: schedule.specialty_name,
                    schedules: [schedule],
                });
            }
        }

        return [...groups.entries()]
            .map(([id, group]) => ({
                id,
                ...group,
                schedules: [...group.schedules].sort(
                    (a, b) =>
                        weekdays.findIndex((day) => day.value === a.weekday) -
                        weekdays.findIndex((day) => day.value === b.weekday) ||
                        a.start_time.localeCompare(b.start_time),
                ),
            }))
            .sort((a, b) => a.doctorName.localeCompare(b.doctorName, "fa"));
    }, [filteredSchedules]);

    const activeCount = schedules.filter((schedule) => schedule.is_active).length;

    return (
        <main dir="rtl" className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
            <header className="space-y-2">
                <p className="text-sm font-medium text-blue-700">مدیریت پزشکان</p>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                    برنامه هفتگی حضور پزشکان
                </h1>
                <p className="text-sm leading-7 text-slate-600">
                    برنامه تکرارشونده حضور پزشکان را ثبت کنید. غیبت یا تغییر ساعت در یک
                    تاریخ مشخص باید در بخش استثناهای تقویمی مدیریت شود.
                </p>
            </header>

            {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {error}
                </div>
            )}

            {success && (
                <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    {success}
                </div>
            )}

            <section className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border bg-white p-5">
                    <p className="text-sm text-slate-500">کل شیفت‌ها</p>
                    <p className="mt-2 text-3xl font-bold">{fa(schedules.length)}</p>
                </div>
                <div className="rounded-2xl border bg-white p-5">
                    <p className="text-sm text-slate-500">شیفت‌های فعال</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-700">{fa(activeCount)}</p>
                </div>
                <div className="rounded-2xl border bg-white p-5">
                    <p className="text-sm text-slate-500">پزشکان فعال</p>
                    <p className="mt-2 text-3xl font-bold text-blue-700">
                        {fa(doctors.filter((doctor) => doctor.is_active).length)}
                    </p>
                </div>
            </section>

            <section className="space-y-6 rounded-2xl border bg-white p-5 sm:p-6">
                <div>
                    <h2 className="text-lg font-bold">تعریف برنامه هفتگی</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        یک پزشک و روزهای حضور را انتخاب کنید؛ برای هر روز می‌توانید چند شیفت بسازید.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <label className="block max-w-xl space-y-2">
                        <span className="block text-sm font-medium">پزشک</span>
                        <select
                            required
                            value={doctorId}
                            onChange={(event) => setDoctorId(event.target.value)}
                            className={inputClass}
                        >
                            <option value="">انتخاب پزشک</option>
                            {doctors.filter((doctor) => doctor.is_active).map((doctor) => (
                                <option key={doctor.id} value={doctor.id}>
                                    {doctor.display_name} — {doctor.specialty_name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="space-y-3">
                        <p className="text-sm font-medium">روزهای حضور</p>
                        <div className="flex flex-wrap gap-2">
                            {weekdays.map((day) => {
                                const selected = selectedDays.includes(day.value);

                                return (
                                    <button
                                        key={day.value}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => toggleDay(day.value)}
                                        className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                                            selected
                                                ? "border-blue-700 bg-blue-700 text-white"
                                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                        }`}
                                    >
                                        {day.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <section className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:p-5">
                        <div>
                            <h3 className="font-bold">ساعت مشترک</h3>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                                این ساعت فقط شیفت اول هر روز انتخاب‌شده را جایگزین می‌کند؛ شیفت‌های بعدی حفظ می‌شوند.
                                بعد از اعمال ساعت، دکمه «ثبت برنامه» را نیز بزنید.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="space-y-2">
                                <span className="block text-sm">ساعت شروع (۲۴ساعته)</span>
                                <input
                                    type="text"
                                    dir="ltr"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    maxLength={5}
                                    placeholder="09:00"
                                    value={commonStart}
                                    onChange={(event) => setCommonStart(normalizeTime(event.target.value))}
                                    className={inputClass}
                                />
                            </label>

                            <label className="space-y-2">
                                <span className="block text-sm">ساعت پایان (۲۴ساعته)</span>
                                <input
                                    type="text"
                                    dir="ltr"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    maxLength={5}
                                    placeholder="13:00"
                                    value={commonEnd}
                                    onChange={(event) => setCommonEnd(normalizeTime(event.target.value))}
                                    className={inputClass}
                                />
                            </label>
                        </div>

                        <button
                            type="button"
                            onClick={applyCommonHours}
                            className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 sm:w-auto"
                        >
                            اعمال ساعت برای روزهای انتخاب‌شده
                        </button>
                    </section>

                    <div className="space-y-4">
                        {selectedDays.length === 0 ? (
                            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                                برای ادامه، حداقل یک روز هفته انتخاب کنید.
                            </p>
                        ) : (
                            weekdays.filter((day) => selectedDays.includes(day.value)).map((day) => {
                                const dayShifts = shiftsByDay[day.value] ?? [];

                                return (
                                    <section key={day.value} className="space-y-4 rounded-2xl border p-4 sm:p-5">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <h3 className="font-bold">{day.label}</h3>
                                            <button
                                                type="button"
                                                onClick={() => addShift(day.value)}
                                                className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                                            >
                                                + افزودن شیفت
                                            </button>
                                        </div>

                                        {dayShifts.length === 0 && (
                                            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                                                هنوز شیفتی برای این روز تعریف نشده است.
                                            </p>
                                        )}

                                        <div className="space-y-3">
                                            {dayShifts.map((shift, index) => (
                                                <div key={index} className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                                                    <label className="space-y-2">
                            <span className="block text-sm text-slate-700">
                              شروع شیفت {fa(index + 1)}
                            </span>
                                                        <input
                                                            type="text"
                                                            dir="ltr"
                                                            inputMode="numeric"
                                                            autoComplete="off"
                                                            maxLength={5}
                                                            placeholder="09:00"
                                                            value={shift.startTime}
                                                            onChange={(event) => updateShift(day.value, index, "startTime", normalizeTime(event.target.value))}
                                                            className={inputClass}
                                                        />
                                                    </label>

                                                    <label className="space-y-2">
                                                        <span className="block text-sm text-slate-700">پایان شیفت</span>
                                                        <input
                                                            type="text"
                                                            dir="ltr"
                                                            inputMode="numeric"
                                                            autoComplete="off"
                                                            maxLength={5}
                                                            placeholder="13:00"
                                                            value={shift.endTime}
                                                            onChange={(event) => updateShift(day.value, index, "endTime", normalizeTime(event.target.value))}
                                                            className={inputClass}
                                                        />
                                                    </label>

                                                    <button
                                                        type="button"
                                                        onClick={() => removeShift(day.value, index)}
                                                        className="rounded-lg border border-red-200 px-3 py-3 text-sm text-red-700 hover:bg-red-50"
                                                    >
                                                        حذف شیفت
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                );
                            })
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full rounded-xl bg-emerald-700 px-5 py-4 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                        {saving ? "در حال ثبت..." : "ثبت برنامه هفتگی"}
                    </button>
                </form>
            </section>

            <section className="overflow-hidden rounded-2xl border bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
                    <div>
                        <h2 className="text-lg font-bold">برنامه پزشکان</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            برای مشاهده شیفت‌های هر پزشک، نام او را باز کنید.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void loadData()}
                        disabled={loading}
                        className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
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
                        className={inputClass}
                    />
                    <select
                        value={activeFilter}
                        onChange={(event) => setActiveFilter(event.target.value)}
                        className={inputClass}
                    >
                        <option value="all">همه شیفت‌ها</option>
                        <option value="active">فقط فعال</option>
                        <option value="inactive">فقط غیرفعال</option>
                    </select>
                </div>

                {loading ? (
                    <p className="p-8 text-center text-sm text-slate-500">در حال دریافت شیفت‌ها...</p>
                ) : groupedSchedules.length === 0 ? (
                    <p className="p-8 text-center text-sm text-slate-500">شیفتی برای نمایش پیدا نشد.</p>
                ) : (
                    <div className="space-y-3 p-4 pt-0">
                        {groupedSchedules.map((group) => {
                            const activeShifts = group.schedules.filter((item) => item.is_active).length;

                            return (
                                <details key={group.id} className="overflow-hidden rounded-xl border border-slate-200">
                                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 hover:bg-slate-100">
                                        <div>
                                            <p className="font-bold text-slate-900">{group.doctorName}</p>
                                            <p className="mt-1 text-sm text-slate-500">{group.specialtyName}</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800">
                        {fa(group.schedules.length)} شیفت
                      </span>
                                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                        {fa(activeShifts)} فعال
                      </span>
                                            <span aria-hidden="true" className="text-slate-500">⌄</span>
                                        </div>
                                    </summary>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-right text-sm">
                                            <thead className="bg-white text-slate-500">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">روز</th>
                                                <th className="px-4 py-3 font-medium">ساعت حضور</th>
                                                <th className="px-4 py-3 font-medium">شروع اعتبار</th>
                                                <th className="px-4 py-3 font-medium">وضعیت</th>
                                                <th className="px-4 py-3 font-medium">عملیات</th>
                                            </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                            {group.schedules.map((schedule) => (
                                                <tr key={schedule.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3">{weekdayLabel(schedule.weekday)}</td>
                                                    <td className="px-4 py-3 font-medium" dir="ltr">
                                                        {schedule.start_time} – {schedule.end_time}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs" dir="ltr">
                                                        {schedule.valid_from}
                                                        {schedule.valid_until ? ` — ${schedule.valid_until}` : ""}
                                                    </td>
                                                    <td className="px-4 py-3">
                              <span className={`rounded-full px-3 py-1 text-xs ${
                                  schedule.is_active
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-slate-100 text-slate-600"
                              }`}>
                                {schedule.is_active ? "فعال" : "غیرفعال"}
                              </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            type="button"
                                                            disabled={changingId === schedule.id}
                                                            onClick={() => void toggleSchedule(schedule)}
                                                            className="rounded-lg border px-3 py-2 text-xs hover:bg-slate-100 disabled:opacity-50"
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
                                </details>
                            );
                        })}
                    </div>
                )}
            </section>
        </main>
    );
}
