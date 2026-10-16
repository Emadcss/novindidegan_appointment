"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Specialty = { id: number; name: string };
type Doctor = {
    id: number;
    specialtyId: number;
    specialtyName: string;
    firstName: string;
    lastName: string;
    displayName: string;
    requiresSurgeryHistory: boolean;
    isActive: boolean;
    sortOrder: number;
};

const empty = {
    specialtyId: 0,
    firstName: "",
    lastName: "",
    displayName: "",
    requiresSurgeryHistory: false,
    isActive: true,
    sortOrder: 0,
};

export default function DoctorsPage() {
    const [items, setItems] = useState<Doctor[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [form, setForm] = useState(empty);
    const [editId, setEditId] = useState<number | null>(null);
    const [msg, setMsg] = useState<string | null>(null);

    async function load() {
        const [d, s] = await Promise.all([
            fetch("/api/admin/doctors").then((r) => r.json()),
            fetch("/api/admin/specialties").then((r) => r.json()),
        ]);
        if (d.success) setItems(d.data);
        if (s.success) setSpecialties(s.data);
    }

    useEffect(() => {
        void load();
    }, []);

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setMsg(null);
        const res = await fetch("/api/admin/doctors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: editId ?? undefined,
                ...form,
                specialtyId: Number(form.specialtyId),
            }),
        });
        const json = await res.json();
        if (!json.success) {
            setMsg(json.message);
            return;
        }
        setEditId(null);
        setForm(empty);
        setMsg("ذخیره شد");
        await load();
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">پزشکان</h1>
            {msg && <p className="text-sm text-blue-700">{msg}</p>}

            <form
                onSubmit={save}
                className="grid max-w-xl gap-3 rounded-xl bg-white p-5 shadow-sm"
            >
                <h2 className="font-semibold">{editId ? "ویرایش" : "افزودن"}</h2>
                <select
                    className="rounded border px-3 py-2"
                    value={form.specialtyId || ""}
                    onChange={(e) =>
                        setForm({ ...form, specialtyId: Number(e.target.value) })
                    }
                    required
                >
                    <option value="">انتخاب تخصص</option>
                    {specialties.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>
                <input
                    className="rounded border px-3 py-2"
                    placeholder="نام"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                />
                <input
                    className="rounded border px-3 py-2"
                    placeholder="نام خانوادگی"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                />
                <input
                    className="rounded border px-3 py-2"
                    placeholder="نام نمایشی"
                    value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    required
                />
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={form.requiresSurgeryHistory}
                        onChange={(e) =>
                            setForm({ ...form, requiresSurgeryHistory: e.target.checked })
                        }
                    />
                    نیاز به سؤال سابقه جراحی
                </label>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    فعال
                </label>
                <button
                    type="submit"
                    className="rounded-lg bg-blue-700 px-4 py-2 text-white"
                >
                    ذخیره
                </button>
            </form>

            <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-right">
                    <tr>
                        <th className="p-3">نام</th>
                        <th className="p-3">تخصص</th>
                        <th className="p-3">جراحی</th>
                        <th className="p-3">فعال</th>
                        <th className="p-3"></th>
                    </tr>
                    </thead>
                    <tbody>
                    {items.map((d) => (
                        <tr key={d.id} className="border-t">
                            <td className="p-3">{d.displayName}</td>
                            <td className="p-3">{d.specialtyName}</td>
                            <td className="p-3">
                                {d.requiresSurgeryHistory ? "بله" : "خیر"}
                            </td>
                            <td className="p-3">{d.isActive ? "بله" : "خیر"}</td>
                            <td className="p-3 space-x-2 space-x-reverse">
                                <button
                                    type="button"
                                    className="text-blue-700"
                                    onClick={() => {
                                        setEditId(d.id);
                                        setForm({
                                            specialtyId: d.specialtyId,
                                            firstName: d.firstName,
                                            lastName: d.lastName,
                                            displayName: d.displayName,
                                            requiresSurgeryHistory: d.requiresSurgeryHistory,
                                            isActive: d.isActive,
                                            sortOrder: d.sortOrder,
                                        });
                                    }}
                                >
                                    ویرایش
                                </button>
                                <Link
                                    href={`/admin/doctors/${d.id}/schedule`}
                                    className="text-slate-700 underline"
                                >
                                    برنامه
                                </Link>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}