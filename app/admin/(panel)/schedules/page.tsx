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

type Shift = {
    startTime: string;
    endTime: string;
};

type ApiError = {
    error?: string;
};

const weekdays = [
    { value: 6, label: "شنبه" },
    { value: 0, label: "یکشنبه" },
    { value: 1, label: "دوشنبه" },
    { value: 2, label: "سه‌شنبه" },
    { value: 3, label: "چهارشنبه" },
    { value: 4, label: "پنجشنبه" },
    { value: 5, label: "جمعه" },
];

const defaultSelectedDays = [6, 0, 1, 2, 3, 4];

const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white p-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

function toPersianDigits(value: string | number) {
    return String(value).replace(/\d/g, (digit) =>
        "۰۱۲۳۴۵۶۷۸۹"[Number(digit)],
    );
}

function getWeekdayLabel(value: number) {
    return weekdays.find((day) => day.value === value)?.label ?? "نامشخص";
}

function hasOverlap(a: Shift, b: Shift) {
    return a.startTime < b.endTime && b.startTime < a.endTime;
}

function createInitialShifts(): Record<number, Shift[]> {
    return Object.fromEntries(
        defaultSelectedDays.map((day) => [
            day,
            [{ startTime: "09:00", endTime: "13:00" }],
        ]),
    );
}

export default function SchedulesPage() {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);

    const [doctorId, setDoctorId] = useState("");
    const [selectedDays, setSelectedDays] =
        useState<number[]>(defaultSelectedDays);
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
        setError("");

        try {
            const response = await fetch("/api/admin/schedules", {
                cache: "no-store",
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    (data as ApiError).error ??
                    "دریافت برنامه‌های پزشکان انجام نشد.",
                );
            }

            setDoctors(data.doctors as Doctor[]);
            setSchedules(data.schedules as Schedule[]);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "خطا در دریافت اطلاعات.",
            );
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        async function fetchInitialData() {
            try {
                const response = await fetch("/api/admin/schedules", {
                    cache: "no-store",
                    signal: controller.signal,
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        (data as ApiError).error ??
                        "دریافت برنامه‌های پزشکان انجام نشد.",
                    );
                }

                setDoctors(data.doctors as Doctor[]);
                setSchedules(data.schedules as Schedule[]);
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") {
                    return;
                }

                setError(
                    err instanceof Error
                        ? err.message
                        : "خطا در دریافت اطلاعات.",
                );
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        void fetchInitialData();
        return () => controller.abort();
    }, []);

    function toggleDay(day: number) {
        setSelectedDays((current) => {
            if (current.includes(day)) {
                return current.filter((item) => item !== day);
            }

            setShiftsByDay((previous) => ({
                ...previous,
                [day]:
                    previous[day] ?? [
                        {
                            startTime: commonStart,
                            endTime: commonEnd,
                        },
                    ],
            }));

            return [...current, day];
        });

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
            [day]: (current[day] ?? []).map((shift, shiftIndex) =>
                shiftIndex === index
                    ? { ...shift, [field]: value }
                    : shift,
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
                {
                    startTime: commonStart,
                    endTime: commonEnd,
                },
            ],
        }));

        setError("");
        setSuccess("");
    }

    function removeShift(day: number, index: number) {
        setShiftsByDay((current) => ({
            ...current,
            [day]: (current[day] ?? []).filter(
                (_, shiftIndex) => shiftIndex !== index,
            ),
        }));

        setError("");
        setSuccess("");
    }

    function applyCommonHours() {
        if (selectedDays.length === 0) {
            setError("ابتدا حداقل یک روز هفته را انتخاب کنید.");
            setSuccess("");
            return;
        }

        if (commonStart >= commonEnd) {
            setError("ساعت پایان باید بعد از ساعت شروع باشد.");
            setSuccess("");
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
                    // فقط شیفت اول جایگزین می‌شود؛ شیفت‌های بعدی باقی می‌مانند.
                    existing[0] = commonShift;
                }

                next[day] = existing;
            }

            return next;
        });

        setError("");
        setSuccess(
            "ساعت شیفت اول برای تمام روزهای انتخاب‌شده اعمال شد. شیفت‌های بعدی تغییر نکردند.",
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
                ...shift,
            })),
        );

        if (shifts.length === 0) {
            setError("برای روزهای انتخاب‌شده حداقل یک شیفت تعریف کنید.");
            return;
        }

        for (const shift of shifts) {
            const validStart = /^([01]\d|2[0-3]):[0-5]\d$/.test(
                shift.startTime,
            );
            const validEnd = /^([01]\d|2[0-3]):[0-5]\d$/.test(
                shift.endTime,
            );

            if (!validStart || !validEnd || shift.startTime >= shift.endTime) {
                setError(
                    "ساعت شروع و پایان همه شیفت‌ها را بررسی کنید؛ پایان باید بعد از شروع باشد.",
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
                            `شیفت‌های روز ${getWeekdayLabel(day)} با هم هم‌پوشانی دارند.`,
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
                body: JSON.stringify({
                    doctorId: Number(doctorId),
                    shifts,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    (data as ApiError).error ?? "ثبت برنامه انجام نشد.",
                );
            }

            setSuccess(
                `برنامه هفتگی با ${toPersianDigits(shifts.length)} شیفت ثبت شد.`,
            );

            await loadData(false);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "خطا در ثبت برنامه.",
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
                    (data as ApiError).error ??
                    "تغییر وضعیت برنامه انجام نشد.",
                );
            }

            setSuccess(
                schedule.is_active
                    ? "این شیفت غیرفعال شد."
                    : "این شیفت دوباره فعال شد.",
            );

            await loadData(false);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "خطا در تغییر وضعیت برنامه.",
            );
        } finally {
            setChangingId(null);
        }
    }

    const filteredSchedules = schedules.filter((schedule) => {
        const searchText = [
            schedule.doctor_name,
            schedule.specialty_name,
            getWeekdayLabel(schedule.weekday),
        ]
            .join(" ")
            .toLowerCase();

        const matchesSearch = searchText.includes(
            search.trim().toLowerCase(),
        );

        const matchesStatus =
            activeFilter === "all" ||
            (activeFilter === "active" && schedule.is_active) ||
            (activeFilter === "inactive" && !schedule.is_active);

        return matchesSearch && matchesStatus;
    });

    const activeCount = schedules.filter(
        (schedule) => schedule.is_active,
    ).length;

    return (
        <main
            dir="rtl"
            className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6"
        >
            <header className="space-y-2">
                <p className="text-sm font-medium text-blue-700">
                    مدیریت پزشکان
                </p>

                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                    برنامه هفتگی حضور پزشکان
                </h1>

                <p className="text-sm leading-7 text-slate-600">
                    برنامه تکرارشونده پزشک را بر اساس روزهای هفته تعریف کنید.
                    مرخصی، لغو حضور و تغییر ساعت در یک تاریخ مشخص باید در بخش
                    استثناهای تقویمی مدیریت شود.
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
                    <p className="text-sm text-slate-500">کل شیفت‌ها</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {toPersianDigits(schedules.length)}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <p className="text-sm text-slate-500">شیفت‌های فعال</p>
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

            <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">
                        تعریف برنامه هفتگی
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        یک پزشک را انتخاب کنید، روزهای حضور را مشخص کنید و برای
                        هر روز یک یا چند شیفت بسازید.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <label className="block max-w-xl space-y-2">
                        <span className="block text-sm font-medium text-slate-700">
                            پزشک
                        </span>

                        <select
                            required
                            value={doctorId}
                            onChange={(event) => setDoctorId(event.target.value)}
                            className={inputClass}
                        >
                            <option value="">انتخاب پزشک</option>

                            {doctors
                                .filter((doctor) => doctor.is_active)
                                .map((doctor) => (
                                    <option key={doctor.id} value={doctor.id}>
                                        {doctor.display_name} —{" "}
                                        {doctor.specialty_name}
                                    </option>
                                ))}
                        </select>
                    </label>

                    <div className="space-y-3">
                        <p className="text-sm font-medium text-slate-700">
                            روزهای حضور
                        </p>

                        <div className="flex flex-wrap gap-2">
                            {weekdays.map((day) => {
                                const selected = selectedDays.includes(day.value);

                                return (
                                    <button
                                        key={day.value}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => toggleDay(day.value)}
                                        className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
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
                            <h3 className="font-bold text-slate-900">
                                ساعت مشترک
                            </h3>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                                اگر ساعت حضور در همه روزهای انتخاب‌شده یکسان
                                است، آن را فقط یک بار وارد کنید. این دکمه شیفت
                                اول هر روز را تنظیم می‌کند و شیفت‌های بعدی را
                                نگه می‌دارد.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="space-y-2">
                                <span className="block text-sm text-slate-700">
                                    ساعت شروع
                                </span>
                                <input
                                    type="time"
                                    required
                                    value={commonStart}
                                    onChange={(event) =>
                                        setCommonStart(event.target.value)
                                    }
                                    className={inputClass}
                                />
                            </label>

                            <label className="space-y-2">
                                <span className="block text-sm text-slate-700">
                                    ساعت پایان
                                </span>
                                <input
                                    type="time"
                                    required
                                    value={commonEnd}
                                    onChange={(event) =>
                                        setCommonEnd(event.target.value)
                                    }
                                    className={inputClass}
                                />
                            </label>
                        </div>

                        <button
                            type="button"
                            onClick={applyCommonHours}
                            className="w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 sm:w-auto"
                        >
                            اعمال ساعت برای همه روزهای انتخاب‌شده
                        </button>
                    </section>

                    <div className="space-y-4">
                        {selectedDays.length === 0 ? (
                            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                                برای ادامه، حداقل یک روز هفته انتخاب کنید.
                            </p>
                        ) : (
                            weekdays
                                .filter((day) =>
                                    selectedDays.includes(day.value),
                                )
                                .map((day) => {
                                    const dayShifts =
                                        shiftsByDay[day.value] ?? [];

                                    return (
                                        <section
                                            key={day.value}
                                            className="space-y-4 rounded-2xl border border-slate-200 p-4 sm:p-5"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <h3 className="font-bold text-slate-900">
                                                    {day.label}
                                                </h3>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        addShift(day.value)
                                                    }
                                                    className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                                                >
                                                    + افزودن شیفت
                                                </button>
                                            </div>

                                            {dayShifts.length === 0 && (
                                                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                                                    هنوز شیفتی برای این روز
                                                    تعریف نشده است.
                                                </p>
                                            )}

                                            <div className="space-y-4">
                                                {dayShifts.map(
                                                    (shift, index) => (
                                                        <div
                                                            key={index}
                                                            className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                                                        >
                                                            <label className="space-y-2">
                                                                <span className="block text-sm text-slate-600">
                                                                    شروع شیفت{" "}
                                                                    {toPersianDigits(
                                                                        index + 1,
                                                                    )}
                                                                </span>

                                                                <input
                                                                    type="time"
                                                                    required
                                                                    value={
                                                                        shift.startTime
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        updateShift(
                                                                            day.value,
                                                                            index,
                                                                            "startTime",
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className={
                                                                        inputClass
                                                                    }
                                                                />
                                                            </label>

                                                            <label className="space-y-2">
                                                                <span className="block text-sm text-slate-600">
                                                                    پایان شیفت{" "}
                                                                    {toPersianDigits(
                                                                        index + 1,
                                                                    )}
                                                                </span>

                                                                <input
                                                                    type="time"
                                                                    required
                                                                    value={
                                                                        shift.endTime
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        updateShift(
                                                                            day.value,
                                                                            index,
                                                                            "endTime",
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className={
                                                                        inputClass
                                                                    }
                                                                />
                                                            </label>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    removeShift(
                                                                        day.value,
                                                                        index,
                                                                    )
                                                                }
                                                                className="rounded-xl border border-red-200 px-4 py-3 text-sm text-red-700 hover:bg-red-50"
                                                            >
                                                                حذف شیفت
                                                            </button>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </section>
                                    );
                                })
                        )}
                    </div>

                    <div className="flex justify-end border-t border-slate-100 pt-5">
                        <button
                            type="submit"
                            disabled={saving || loading}
                            className="w-full rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                            {saving
                                ? "در حال ثبت برنامه..."
                                : "ثبت برنامه هفتگی"}
                        </button>
                    </div>
                </form>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            فهرست شیفت‌ها
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            غیرفعال‌کردن شیفت، سابقه آن را حذف نمی‌کند.
                        </p>
                    </div>

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
                        className={inputClass}
                    />

                    <select
                        value={activeFilter}
                        onChange={(event) =>
                            setActiveFilter(event.target.value)
                        }
                        className={inputClass}
                    >
                        <option value="all">همه شیفت‌ها</option>
                        <option value="active">فقط فعال</option>
                        <option value="inactive">فقط غیرفعال</option>
                    </select>
                </div>

                {loading ? (
                    <p className="p-8 text-center text-sm text-slate-500">
                        در حال دریافت شیفت‌ها...
                    </p>
                ) : filteredSchedules.length === 0 ? (
                    <p className="p-8 text-center text-sm text-slate-500">
                        شیفتی برای نمایش پیدا نشد.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                            <tr>
                                <th className="px-5 py-4 font-medium">
                                    پزشک و تخصص
                                </th>
                                <th className="px-5 py-4 font-medium">
                                    روز
                                </th>
                                <th className="px-5 py-4 font-medium">
                                    ساعات حضور
                                </th>
                                <th className="px-5 py-4 font-medium">
                                    شروع اعتبار
                                </th>
                                <th className="px-5 py-4 font-medium">
                                    وضعیت
                                </th>
                                <th className="px-5 py-4 font-medium">
                                    عملیات
                                </th>
                            </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                            {filteredSchedules.map((schedule) => (
                                <tr
                                    key={schedule.id}
                                    className="hover:bg-slate-50/70"
                                >
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

                                    <td
                                        className="px-5 py-4 font-medium"
                                        dir="ltr"
                                    >
                                        {schedule.start_time} –{" "}
                                        {schedule.end_time}
                                    </td>

                                    <td
                                        className="px-5 py-4 text-xs"
                                        dir="ltr"
                                    >
                                        {schedule.valid_from}
                                    </td>

                                    <td className="px-5 py-4">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs ${
                                                    schedule.is_active
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-slate-100 text-slate-600"
                                                }`}
                                            >
                                                {schedule.is_active
                                                    ? "فعال"
                                                    : "غیرفعال"}
                                            </span>
                                    </td>

                                    <td className="px-5 py-4">
                                        <button
                                            type="button"
                                            disabled={
                                                changingId === schedule.id
                                            }
                                            onClick={() =>
                                                void toggleSchedule(schedule)
                                            }
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
                )}
            </section>
        </main>
    );
}