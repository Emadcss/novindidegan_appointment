
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Specialty = {
    id: number;
    name: string;
    is_active: boolean;
};

type Doctor = {
    id: number;
    specialty_id: number;
    specialty_name?: string;
    first_name: string;
    last_name: string;
    display_name: string;
    requires_surgery_history: boolean;
    is_active: boolean;
    sort_order: number;
};

type DoctorForm = {
    first_name: string;
    last_name: string;
    display_name: string;
    specialty_id: string;
    requires_surgery_history: boolean;
    sort_order: string;
};

const emptyForm: DoctorForm = {
    first_name: "",
    last_name: "",
    display_name: "",
    specialty_id: "",
    requires_surgery_history: false,
    sort_order: "0",
};

export default function DoctorsPage() {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [form, setForm] = useState<DoctorForm>(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadData = useCallback(async (signal?: AbortSignal) => {
        try {
            const response = await fetch("/api/admin/doctors", {
                cache: "no-store",
                signal,
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "دریافت اطلاعات ناموفق بود.");
            }

            setDoctors(data.doctors);
            setSpecialties(data.specialties);
            setError("");
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            setError(
                err instanceof Error ? err.message : "خطا در دریافت اطلاعات.",
            );
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        const fetchDoctors = async () => {
            try {
                const response = await fetch("/api/admin/doctors", {
                    cache: "no-store",
                    signal: controller.signal,
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "دریافت اطلاعات ناموفق بود.",
                    );
                }

                setDoctors(data.doctors);
                setSpecialties(data.specialties);
                setError("");
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
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void fetchDoctors();

        return () => controller.abort();
    }, []);

    const visibleDoctors = useMemo(() => {
        const term = search.trim().toLocaleLowerCase("fa");

        return doctors.filter((doctor) => {
            const matchesSearch = [
                doctor.first_name,
                doctor.last_name,
                doctor.display_name,
                doctor.specialty_name ?? "",
            ].some((value) => value.toLocaleLowerCase("fa").includes(term));

            const matchesStatus =
                filter === "all" ||
                (filter === "active" && doctor.is_active) ||
                (filter === "inactive" && !doctor.is_active);

            return matchesSearch && matchesStatus;
        });
    }, [doctors, search, filter]);

    function startEditing(doctor: Doctor) {
        setEditingId(doctor.id);
        setForm({
            first_name: doctor.first_name,
            last_name: doctor.last_name,
            display_name: doctor.display_name,
            specialty_id: String(doctor.specialty_id),
            requires_surgery_history: doctor.requires_surgery_history,
            sort_order: String(doctor.sort_order),
        });
        setNotice("");
        setError("");
    }

    function resetForm() {
        setEditingId(null);
        setForm(emptyForm);
    }

    async function saveDoctor(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError("");
        setNotice("");

        try {
            const url = editingId
                ? `/api/admin/doctors/${editingId}`
                : "/api/admin/doctors";

            const response = await fetch(url, {
                method: editingId ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    specialty_id: Number(form.specialty_id),
                    sort_order: Number(form.sort_order),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "ذخیره اطلاعات ناموفق بود.");
            }

            resetForm();
            setNotice(editingId ? "اطلاعات پزشک ویرایش شد." : "پزشک جدید ثبت شد.");
            await loadData();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "خطا هنگام ذخیره اطلاعات.",
            );
        } finally {
            setSaving(false);
        }
    }

    async function toggleDoctor(doctor: Doctor) {
        const action = doctor.is_active ? "غیرفعال" : "فعال";

        if (!window.confirm(`${doctor.display_name} ${action} شود؟`)) return;

        setError("");
        setNotice("");

        try {
            const response = await fetch(`/api/admin/doctors/${doctor.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: !doctor.is_active }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "تغییر وضعیت انجام نشد.");
            }

            setNotice(`وضعیت ${doctor.display_name} تغییر کرد.`);
            await loadData();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "خطا در تغییر وضعیت پزشک.",
            );
        }
    }

    const inputClass =
        "mt-1 w-full rounded-xl border border-line-strong bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-brand">مدیریت اطلاعات</p>
                    <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
                        پزشکان
                    </h1>
                    <p className="mt-2 text-sm text-ink-muted">
                        ثبت، ویرایش و کنترل وضعیت پزشکان مرکز
                    </p>
                </div>

                <div className="rounded-2xl border border-line bg-white px-5 py-3 shadow-sm">
                    <p className="text-xs text-ink-muted">تعداد پزشکان</p>
                    <p className="mt-1 text-2xl font-bold text-brand">
                        {doctors.length.toLocaleString("fa-IR")}
                    </p>
                </div>
            </header>

            {error && (
                <div
                    role="alert"
                    className="rounded-xl border border-danger/20 bg-danger-soft p-3 text-sm text-danger"
                >
                    {error}
                </div>
            )}

            {notice && (
                <div
                    role="status"
                    className="rounded-xl border border-success/20 bg-success-soft p-3 text-sm text-success"
                >
                    {notice}
                </div>
            )}

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-ink">
                            {editingId ? "ویرایش پزشک" : "ثبت پزشک جدید"}
                        </h2>
                        <p className="mt-1 text-sm text-ink-muted">
                            فیلدهای ستاره‌دار الزامی هستند.
                        </p>
                    </div>

                    {editingId !== null && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="rounded-xl border border-line px-4 py-2 text-sm text-ink hover:bg-paper"
                        >
                            انصراف از ویرایش
                        </button>
                    )}
                </div>

                <form onSubmit={saveDoctor} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <label className="text-sm font-medium text-ink">
                            نام *
                            <input
                                required
                                maxLength={100}
                                className={inputClass}
                                value={form.first_name}
                                onChange={(e) =>
                                    setForm({ ...form, first_name: e.target.value })
                                }
                            />
                        </label>

                        <label className="text-sm font-medium text-ink">
                            نام خانوادگی *
                            <input
                                required
                                maxLength={100}
                                className={inputClass}
                                value={form.last_name}
                                onChange={(e) =>
                                    setForm({ ...form, last_name: e.target.value })
                                }
                            />
                        </label>

                        <label className="text-sm font-medium text-ink">
                            نام نمایشی *
                            <input
                                required
                                maxLength={200}
                                className={inputClass}
                                placeholder="مثلاً دکتر علی رضایی"
                                value={form.display_name}
                                onChange={(e) =>
                                    setForm({ ...form, display_name: e.target.value })
                                }
                            />
                        </label>

                        <label className="text-sm font-medium text-ink">
                            تخصص *
                            <select
                                required
                                className={inputClass}
                                value={form.specialty_id}
                                onChange={(e) =>
                                    setForm({ ...form, specialty_id: e.target.value })
                                }
                            >
                                <option value="">انتخاب تخصص</option>
                                {specialties
                                    .filter((specialty) => specialty.is_active)
                                    .map((specialty) => (
                                        <option key={specialty.id} value={specialty.id}>
                                            {specialty.name}
                                        </option>
                                    ))}
                            </select>
                        </label>

                        <label className="text-sm font-medium text-ink">
                            ترتیب نمایش
                            <input
                                type="number"
                                min={0}
                                step={1}
                                className={inputClass}
                                value={form.sort_order}
                                onChange={(e) =>
                                    setForm({ ...form, sort_order: e.target.value })
                                }
                            />
                        </label>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-paper p-4">
                        <input
                            type="checkbox"
                            className="mt-1 size-4 accent-brand"
                            checked={form.requires_surgery_history}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    requires_surgery_history: e.target.checked,
                                })
                            }
                        />
                        <span>
              <span className="block text-sm font-semibold text-ink">
                پرسش درباره سابقه جراحی
              </span>
              <span className="mt-1 block text-xs leading-6 text-ink-muted">
                در صورت نیاز، جریان نوبت‌دهی از بیمار درباره سابقه جراحی سؤال
                می‌کند.
              </span>
            </span>
                    </label>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-strong disabled:opacity-60"
                        >
                            {saving
                                ? "در حال ذخیره..."
                                : editingId
                                    ? "ذخیره تغییرات"
                                    : "ثبت پزشک"}
                        </button>

                        {editingId !== null && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="rounded-xl border border-line px-5 py-3 text-sm font-semibold text-ink hover:bg-paper"
                            >
                                لغو
                            </button>
                        )}
                    </div>
                </form>
            </section>

            <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div>
                        <h2 className="text-lg font-bold text-ink">فهرست پزشکان</h2>
                        <p className="mt-1 text-sm text-ink-muted">
                            {visibleDoctors.length.toLocaleString("fa-IR")} پزشک در این فهرست
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                            aria-label="جست‌وجوی پزشک"
                            placeholder="جست‌وجوی نام یا تخصص..."
                            className="min-w-0 rounded-xl border border-line-strong px-3 py-2 text-sm outline-none focus:border-brand sm:w-64"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        <select
                            aria-label="فیلتر وضعیت پزشک"
                            className="rounded-xl border border-line-strong bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option value="all">همه وضعیت‌ها</option>
                            <option value="active">فعال</option>
                            <option value="inactive">غیرفعال</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <p className="p-8 text-center text-sm text-ink-muted">
                        در حال دریافت اطلاعات...
                    </p>
                ) : visibleDoctors.length === 0 ? (
                    <div className="p-10 text-center">
                        <p className="font-semibold text-ink">پزشکی پیدا نشد</p>
                        <p className="mt-2 text-sm text-ink-muted">
                            عبارت جست‌وجو یا فیلتر وضعیت را تغییر دهید.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full min-w-[760px] text-right text-sm">
                                <thead className="bg-paper text-ink-muted">
                                <tr>
                                    <th className="px-5 py-4 font-semibold">پزشک</th>
                                    <th className="px-5 py-4 font-semibold">تخصص</th>
                                    <th className="px-5 py-4 font-semibold">سابقه جراحی</th>
                                    <th className="px-5 py-4 font-semibold">وضعیت</th>
                                    <th className="px-5 py-4 font-semibold">عملیات</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                {visibleDoctors.map((doctor) => (
                                    <tr key={doctor.id} className="hover:bg-paper/70">
                                        <td className="px-5 py-4">
                                            <p className="font-bold text-ink">
                                                {doctor.display_name}
                                            </p>
                                            <p className="mt-1 text-xs text-ink-muted">
                                                {doctor.first_name} {doctor.last_name}
                                            </p>
                                        </td>
                                        <td className="px-5 py-4">
                                            {doctor.specialty_name}
                                        </td>
                                        <td className="px-5 py-4">
                                            {doctor.requires_surgery_history ? "بله" : "خیر"}
                                        </td>
                                        <td className="px-5 py-4">
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                doctor.is_active
                                    ? "bg-success-soft text-success"
                                    : "bg-danger-soft text-danger"
                            }`}
                        >
                          {doctor.is_active ? "فعال" : "غیرفعال"}
                        </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => startEditing(doctor)}
                                                    className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-brand hover:bg-brand-soft"
                                                >
                                                    ویرایش
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void toggleDoctor(doctor)}
                                                    className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink hover:bg-paper"
                                                >
                                                    {doctor.is_active ? "غیرفعال‌کردن" : "فعال‌کردن"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid gap-3 p-3 md:hidden">
                            {visibleDoctors.map((doctor) => (
                                <article
                                    key={doctor.id}
                                    className="rounded-xl border border-line p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="font-bold text-ink">
                                                {doctor.display_name}
                                            </h3>
                                            <p className="mt-1 text-sm text-ink-muted">
                                                {doctor.specialty_name}
                                            </p>
                                        </div>
                                        <span
                                            className={`shrink-0 rounded-full px-2 py-1 text-xs ${
                                                doctor.is_active
                                                    ? "bg-success-soft text-success"
                                                    : "bg-danger-soft text-danger"
                                            }`}
                                        >
                      {doctor.is_active ? "فعال" : "غیرفعال"}
                    </span>
                                    </div>

                                    <p className="mt-3 text-xs text-ink-muted">
                                        پرسش سابقه جراحی:{" "}
                                        {doctor.requires_surgery_history ? "بله" : "خیر"}
                                    </p>

                                    <div className="mt-4 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => startEditing(doctor)}
                                            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-brand"
                                        >
                                            ویرایش
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void toggleDoctor(doctor)}
                                            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink"
                                        >
                                            {doctor.is_active ? "غیرفعال‌کردن" : "فعال‌کردن"}
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}
