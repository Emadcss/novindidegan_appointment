"use client";

import { CheckIcon } from "@/components/ui/Icons";
import { toPersianDigits } from "@/lib/utils/persian-digits";

export type ProgressItem = {
    id: string;
    label: string;
};

type KioskProgressProps = {
    items: ProgressItem[];
    activeIndex: number;
};

/**
 * نوار مراحل: ✓ انجام‌شده (سبز) · پر = مرحله‌ی فعلی (آبی) · توخالی = مرحله‌ی بعد.
 * رنگ هرگز تنها حامل معنا نیست؛ تیک، پر بودن و برچسب هم هست.
 */
export default function KioskProgress({ items, activeIndex }: KioskProgressProps) {
    if (items.length <= 1) return null;

    return (
        <nav aria-label="مراحل دریافت نوبت" className="mx-auto mb-4 w-full max-w-4xl sm:mb-8 short:sm:mb-3">
            <p className="sr-only">
                مرحله {toPersianDigits(activeIndex + 1)} از {toPersianDigits(items.length)}
            </p>

            <ol className="flex w-full items-start">
                {items.map((item, index) => {
                    const completed = index < activeIndex;
                    const active = index === activeIndex;
                    const isLast = index === items.length - 1;

                    return (
                        <li
                            key={item.id}
                            aria-current={active ? "step" : undefined}
                            className="relative flex min-w-0 flex-1 flex-col items-center gap-1 sm:gap-2 short:sm:gap-1"
                        >
                            {/* خط اتصال به مرحله‌ی بعد (در RTL مرحله‌ی بعد سمت چپ است) */}
                            {!isLast && (
                                <span
                                    aria-hidden="true"
                                    className={`absolute right-1/2 top-4 h-1 w-full -translate-y-1/2 rounded-full sm:top-6 short:sm:top-[18px] ${
                                        completed ? "bg-success" : "bg-line"
                                    }`}
                                />
                            )}

                            <span
                                className={[
                                    "relative z-10 flex size-8 items-center justify-center rounded-full sm:size-12 short:sm:size-9",
                                    "text-sm font-bold transition-colors duration-200 sm:text-body short:sm:text-hint",
                                    completed
                                        ? "bg-success text-white"
                                        : active
                                            ? "bg-brand text-white ring-4 ring-brand-soft"
                                            : "border-2 border-line-strong bg-surface text-ink-muted",
                                ].join(" ")}
                            >
                                {completed ? <CheckIcon className="size-6" /> : toPersianDigits(index + 1)}
                            </span>

                            <span
                                className={`max-w-full px-0.5 text-center text-[0.65rem] leading-tight sm:px-1 sm:text-hint ${
                                    active
                                        ? "font-bold text-ink"
                                        : completed
                                            ? "font-medium text-success"
                                            : "text-ink-muted"
                                }`}
                            >
                                {item.label}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
