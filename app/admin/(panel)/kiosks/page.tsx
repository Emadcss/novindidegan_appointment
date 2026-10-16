"use client";

import { useEffect, useState } from "react";

type Kiosk = {
    id: number;
    code: string;
    name: string;
    ipAddress: string | null;
    port: number | null;
    locationNote: string | null;
    isActive: boolean;
    printerStatus: string;
    lastSeenAt: string | null;
};

const empty = {
    code: "",
    name: "",
    ipAddress: "",
    port: 3000,
    locationNote: "",
    isActive: true,
    printerStatus: "unknown",
};

export default function KiosksPage() {
    const [items, setItems] = useState<Kiosk[]>([]);
    const [form, setForm] = useState(empty);
    const [editId, setEditId] = useState<number | null>(null);
    const [msg, setMsg] = useState<string | null>(null);

    async function load() {
        const res = await fetch("/api/admin/kiosks");
        const json = await res.json();
        if (json.success) setItems(json.data);
    }

    useEffect(() => {
        void load();
    }, []);

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setMsg(null);
        const res = await fetch("/api/admin/kiosks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: editId ?? undefined,
                code: form.code,
                name: form.name,
                ipAddress: form.ipAddress || null,
                port: form.port,
                locationNote: form.locationNote || null,
                isActive: form.isActive,
                printerStatus: form.printerStatus,
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
            <h1 className="text-2xl font-bold">کیوسک‌ها</h1>
            {msg && <p className="text-sm text-blue-700">{msg}</p>}

            <form
                onSubmit={save}
                className="grid max-w-xl gap-3 rounded-xl bg-white p-5 shadow-sm"
            >
                <input
                    className="rounded border px-3 py-2"
                    placeholder="کد (K1)"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    required
                />
                <input
                    className="rounded border px-3 py-2"
                    placeholder="نام"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                />
                <input
                    className="rounded border px-3 py-2"
                    placeholder="IP"
                    value={form.ipAddress}
                    onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
                />
                <input
                    type="number"
                    className="rounded border px-3 py-2"
                    placeholder="پورت"
                    value={form.port}
                    onChange={(e) =>
                        setForm({ ...form, port: Number(e.target.value) })
                    }
                />
                <input
                    className="rounded border px-3 py-2"
                    placeholder="محل"
                    value={form.locationNote}
                    onChange={(e) =>
                        setForm({ ...form, locationNote: e.target.value })
                    }
                />
                <select
                    className="rounded border px-3 py-2"
                    value={form.printerStatus}
                    onChange={(e) =>
                        setForm({ ...form, printerStatus: e.target.value })
                    }
                >
                    <option value="unknown">unknown</option>
                    <option value="ok">ok</option>
                    <option value="paper_low">paper_low</option>
                    <option value="offline">offline</option>
                </select>
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
                        <th className="p-3">کد</th>
                        <th className="p-3">نام</th>
                        <th className="p-3">IP</th>
                        <th className="p-3">چاپگر</th>
                        <th className="p-3">فعال</th>
                        <th className="p-3"></th>
                    </tr>
                    </thead>
                    <tbody>
                    {items.map((k) => (
                        <tr key={k.id} className="border-t">
                            <td className="p-3">{k.code}</td>
                            <td className="p-3">{k.name}</td>
                            <td className="p-3">
                                {k.ipAddress}:{k.port}
                            </td>
                            <td className="p-3">{k.printerStatus}</td>
                            <td className="p-3">{k.isActive ? "بله" : "خیر"}</td>
                            <td className="p-3">
                                <button
                                    type="button"
                                    className="text-blue-700"
                                    onClick={() => {
                                        setEditId(k.id);
                                        setForm({
                                            code: k.code,
                                            name: k.name,
                                            ipAddress: k.ipAddress ?? "",
                                            port: k.port ?? 3000,
                                            locationNote: k.locationNote ?? "",
                                            isActive: k.isActive,
                                            printerStatus: k.printerStatus,
                                        });
                                    }}
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