"use client";

import { useEffect, useState } from "react";

type Specialty = {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
    isActive: boolean;
    sortOrder: number;
};

const empty = {
    name: "",
    slug: "",
    icon: "",
    isActive: true,
    sortOrder: 0,
};

export default function SpecialtiesPage() {
    const [items, setItems] = useState<Specialty[]>([]);
    const [form, setForm] = useState(empty);
    const [editId, setEditId] = useState<number | null>(null);
    const [msg, setMsg] = useState<string | null>(null);

    async function load() {
        const res = await fetch("/api/admin/specialties");
        const json = await res.json();
        if (json.success) setItems(json.data);
    }

    useEffect(() => {
        void load();
    }, []);

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setMsg(null);
        const res = await fetch("/api/admin/specialties", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: editId ?? undefined,
                name: form.name,
                slug: form.slug,
                icon: form.icon || null,
                isActive: form.isActive,
                sortOrder: Number(form.sortOrder),
            }),
        });
        const json = await res.json();
        if (!json.success) {
            setMsg(json.message);
            return;
        }
        setForm(empty);
        setEditId(null);
        setMsg("ذخیره شد");
        await load();
    }

    function startEdit(s: Specialty) {
        setEditId(s.id);
        setForm({
            name: s.name,
            slug: s.slug,
            icon: s.icon ?? "",
            isActive: s.isActive,
            sortOrder: s.sortOrder,
        });
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">تخصص‌ها</h1>
            {msg && <p className="text-sm text-blue-700">{msg}</p>}

            <form onSubmit={save} className="grid max-w-xl gap-3 rounded-xl bg-white p-5 shadow-sm">
                <h2 className="font-semibold">{editId ? "ویرایش" : "افزودن"}</h2>
                <input
                    className="rounded border px-3 py-2"
                    placeholder="نام"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                />
                <input
                    className="rounded border px-3 py-2"
                    placeholder="slug (انگلیسی)"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    required
                />
                <input
                    className="rounded border px-3 py-2"
                    placeholder="آیکون (اختیاری)"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                />
                <input
                    type="number"
                    className="rounded border px-3 py-2"
                    placeholder="ترتیب"
                    value={form.sortOrder}
                    onChange={(e) =>
                        setForm({ ...form, sortOrder: Number(e.target.value) })
                    }
                />
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    فعال
                </label>
                <div className="flex gap-2">
                    <button
                        type="submit"
                        className="rounded-lg bg-blue-700 px-4 py-2 text-white"
                    >
                        ذخیره
                    </button>
                    {editId && (
                        <button
                            type="button"
                            className="rounded-lg border px-4 py-2"
                            onClick={() => {
                                setEditId(null);
                                setForm(empty);
                            }}
                        >
                            انصراف
                        </button>
                    )}
                </div>
            </form>

            <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-right">
                    <tr>
                        <th className="p-3">نام</th>
                        <th className="p-3">slug</th>
                        <th className="p-3">فعال</th>
                        <th className="p-3">ترتیب</th>
                        <th className="p-3"></th>
                    </tr>
                    </thead>
                    <tbody>
                    {items.map((s) => (
                        <tr key={s.id} className="border-t">
                            <td className="p-3">{s.name}</td>
                            <td className="p-3">{s.slug}</td>
                            <td className="p-3">{s.isActive ? "بله" : "خیر"}</td>
                            <td className="p-3">{s.sortOrder}</td>
                            <td className="p-3">
                                <button
                                    type="button"
                                    className="text-blue-700"
                                    onClick={() => startEdit(s)}
                                >
                                    ویرایش
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}