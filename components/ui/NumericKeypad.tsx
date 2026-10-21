"use client";

import { BackspaceIcon } from "@/components/ui/Icons";
import { toPersianDigits } from "@/lib/utils/persian-digits";

type NumericKeypadProps = {
    value: string;
    onChange: (value: string) => void;
    maxLength: number;
    disabled?: boolean;
};

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

const KEY_BASE =
    "flex h-14 touch-manipulation items-center justify-center rounded-control border-2 sm:h-20 short:sm:h-14 " +
    "transition-[transform,background-color] duration-100 active:scale-95 active:bg-brand-soft " +
    "disabled:opacity-40 disabled:active:scale-100";

/**
 * صفحه‌کلید عددی.
 * ترتیب اعداد همیشه ۱-۲-۳ از چپ (dir=ltr)، ولی ارقام فارسی نمایش داده می‌شوند تا با فیلد یکی باشد.
 * دکمه‌ی «تأیید» عمداً بیرون از این کامپوننت و به‌صورت دکمه‌ی بزرگ جدا قرار می‌گیرد.
 */
export default function NumericKeypad({
    value,
    onChange,
    maxLength,
    disabled = false,
}: NumericKeypadProps) {
    const isFull = value.length >= maxLength;
    const isEmpty = value.length === 0;

    function press(digit: string) {
        if (disabled || isFull) return;
        onChange(value + digit);
    }

    return (
        <div dir="ltr" className="mx-auto grid w-full max-w-sm grid-cols-3 gap-2 sm:gap-3 short:sm:gap-2">
            {DIGITS.map((digit) => (
                <button
                    key={digit}
                    type="button"
                    disabled={disabled || isFull}
                    onClick={() => press(digit)}
                    className={`${KEY_BASE} border-line bg-surface text-3xl font-bold tabular-nums text-ink shadow-card sm:text-4xl short:sm:text-3xl`}
                >
                    {toPersianDigits(digit)}
                </button>
            ))}

            <button
                type="button"
                disabled={disabled || isEmpty}
                onClick={() => onChange("")}
                className={`${KEY_BASE} border-transparent bg-transparent text-sm font-bold text-ink-muted sm:text-hint`}
            >
                پاک کردن
            </button>

            <button
                type="button"
                disabled={disabled || isFull}
                onClick={() => press("0")}
                className={`${KEY_BASE} border-line bg-surface text-3xl font-bold tabular-nums text-ink shadow-card sm:text-4xl short:sm:text-3xl`}
            >
                {toPersianDigits("0")}
            </button>

            <button
                type="button"
                aria-label="حذف آخرین رقم"
                disabled={disabled || isEmpty}
                onClick={() => onChange(value.slice(0, -1))}
                className={`${KEY_BASE} border-line-strong bg-surface text-ink`}
            >
                <BackspaceIcon className="size-6 sm:size-8" />
            </button>
        </div>
    );
}
