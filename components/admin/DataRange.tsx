"use client";

import { useEffect, useState } from "react";

import { Btn, Input } from "@/components/admin/ui";
import { addDays, formatJalali, parseJalaliInput, startOfJalaliMonth } from "@/lib/utils/jalali";
import { getTehranDateKey } from "@/lib/time/tehran-time";

export type Range = { from: string; to: string };

export const todayKey = (): string => getTehranDateKey(new Date());

/** انتخاب بازه‌ی تاریخ شمسی: دو کادر متنی + دکمه‌های آماده */
export function DateRange({ value, onChange }: { value: Range; onChange: (range: Range) => void }) {
    const [from, setFrom] = useState(formatJalali(value.from));
    const [to, setTo] = useState(formatJalali(value.to));

    useEffect(() => {
        setFrom(formatJalali(value.from));
        setTo(formatJalali(value.to));
    }, [value.from, value.to]);

    const fromIso = parseJalaliInput(from);
    const toIso = parseJalaliInput(to);
    const valid = fromIso !== null && toIso !== null && fromIso <= toIso;

    function commit() {
        if (valid) onChange({ from: fromIso as string, to: toIso as string });
    }

    const today = todayKey();
    const presets: [string, Range][] = [
        ["امروز", { from: today, to: today }],
        ["دیروز", { from: addDays(today, -1), to: addDays(today, -1) }],
        ["۷ روز اخیر", { from: addDays(today, -6), to: today }],
        ["۳۰ روز اخیر", { from: addDays(today, -29), to: today }],
        ["این ماه", { from: startOfJalaliMonth(today), to: today }],
    ];

    return (
        <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-ink-muted">
                از تاریخ (شمسی)
                <Input
                    dir="ltr"
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                    onBlur={commit}
                    onKeyDown={(event) => event.key === "Enter" && commit()}
                    className={`w-32 text-center ${fromIso === null ? "border-danger" : ""}`}
                    aria-label="از تاریخ"
                />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-muted">
                تا تاریخ
                <Input
                    dir="ltr"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    onBlur={commit}
                    onKeyDown={(event) => event.key === "Enter" && commit()}
                    className={`w-32 text-center ${toIso === null || !valid ? "border-danger" : ""}`}
                    aria-label="تا تاریخ"
                />
            </label>
            <div className="flex flex-wrap gap-1.5">
                {presets.map(([label, range]) => (
                    <Btn key={label} small variant="ghost" onClick={() => onChange(range)}>
                        {label}
                    </Btn>
                ))}
            </div>
        </div>
    );
}