"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const WEEKDAYS = [
    "شنبه",
    "یکشنبه",
    "دوشنبه",
    "سه‌شنبه",
    "چهارشنبه",
    "پنجشنبه",
    "جمعه",
];

type Schedule = {
    id: number;
    weekday: number;
    startTime: string;
    endTime: string;
    validFrom: string;
    validUntil: string | null;
    isActive: boolean;
};

export default function DoctorSchedulePage() {
    const params = useParams();
    const doctorId = String(params.id);
    const [items, setItems] = useState<Schedule[]>([]);
    const [form, setForm] = useState({
        weekday: 0,
        startTime: "08:00",
        endTime: "14:00",
        validFrom: "2026-01-01",
        validUntil: "",
        isActive: true,
    });
    const [msg, setMsg] = useState<string | null>(null);

    async function load() {
        const res = await fetch(`/api/admin/doctors/${doctorId}/schedules`);
        const json = await res.json();
        if (json.success) setItems(json.data);
    }

    useEffect(() => {
        void load();
    }, [doctorId]);

    async function save(e: React.FormEvent) {
        e.preventDefault();
        setMsg(null);
        const res = await fetch(`/api/admin/doctors/${doctorId}/schedules`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...form,
                validUntil: form.validUntil || null,
            }),
        });
        const json = await res.json();
        if (!json.success) {
            setMsg(json.message);
            return;
        }
        setMsg("ذخیره شد");
        await load();
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/doctors" className="text-sm text-blue-700">
                    ← بازگشت
                </Link>
                <h1 className="text-2xl font-bold">برنامه حضور پزشک #{doctorId}</h1>
            </div>
            {msg && <p className="text-sm text-blue-700">{msg}</p>}

            <form
                onSubmit={save}
                className="grid max-w-xl gap-3 rounded-xl bg-white p-5 shadow-sm"
            >
                <select
                    className="rounded border px-3 py-2"
                    value={form.weekday}
                    onChange={(e) =>
                        setForm({ ...form, weekday: Number(e.target.value) })
                    }
                >
                    {WEEKDAYS.map((label, i) => (
                        <option key={i} value={i}>
                            {label}
                        </option>
                    ))}
                </select>
                <div className="flex gap-2">
                    <input
                        className="w-full rounded border px-3 py-2"
                        value={form.startTime}
                        onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                        placeholder="شروع HH:MM"
                        required
                    />
                    <input
                        className="w-full rounded border px-3 py-2"
                        value={form.endTime}
                        onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                        placeholder="پایان HH:MM"
                        required
                    />
                </div>
                <input
                    className="rounded border px-3 py-2"
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                    placeholder="validFrom YYYY-MM-DD"
                    required
                />
                <input
                    className="rounded border px-3 py-2"
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                    placeholder="validUntil (خالی = نامحدود)"
                />
                <button
                    type="submit"
                    className="rounded-lg bg-blue-700 px-4 py-2 text-white"
                >
                    افزودن بازه
                </button>
            </form>

            <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-right">
                    <tr>
                        <th className="p-3">روز</th>
                        <th className="p-3">از</th>
                        <th className="p-3">تا</th>
                        <th className="p-3">اعتبار</th>
                        <th className="p-3">فعال</th>
                    </tr>
                    </thead>
                    <tbody>
                    {items.map((s) => (
                        <tr key={s.id} className="border-t">
                            <td className="p-3">{WEEKDAYS[s.weekday]}</td>
                            <td className="p-3">{s.startTime}</td>
                            <td className="p-3">{s.endTime}</td>
                            <td className="p-3">
                                {s.validFrom} → {s.validUntil ?? "∞"}
                            </td>
                            <td className="p-3">{s.isActive ? "بله" : "خیر"}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}