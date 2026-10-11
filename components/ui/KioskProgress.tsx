"use client";

import { toPersianDigits } from "@/lib/utils/persian-digits";

export type ProgressItem = {
    id: string;
    label: string;
};

type KioskProgressProps = {
    items: ProgressItem[];
    activeIndex: number;
};

export default function  KioskProgress({
                                           items,
                                           activeIndex,
                                       }: KioskProgressProps) {
    if (items.length <= 1) return null;

    return (
        <nav
            aria-label="مراحل دریافت نوبت"
            dir="rtl"
            className="mx-auto mb-8 w-full max-w-4xl px-2"
        >
            <ol className="flex w-full items-start">
                {items.map((item, index) => {
                    const completed = index < activeIndex;
                    const active = index === activeIndex;

                    return (
                        <li
                            key={item.id}
                            aria-current={active ? "step" : undefined}
                            className="relative flex min-w-0 flex-1 flex-col items-center"
                        >
                            {/* اتصال مراحل */}
                            {index > 0 && (
                                <span
                                    aria-hidden="true"
                                    className={`absolute left-1/2 top-5 z-0 h-0.5 w-full ${
                                        index <= activeIndex
                                            ? `bg-emerald-400/80`
                                            : "bg-white/20"
                                    }`}
                                />
                            )}

                            {/* شماره یا تیک مرحله */}
                            <span
                                className={[
                                    "relative z-10 flex h-10 w-10 shrink-0",
                                    "items-center justify-center rounded-full border-2",
                                    "text-sm font-bold transition-colors duration-200",
                                    completed
                                        ? "border-emerald-400 bg-emerald-500 text-white"
                                        : active
                                            ? "border-lightblue bg-lightblue text-white shadow-lg shadow-lightblue/25"
                                            : "border-white/25 bg-slate-900/30 text-white/45",
                                ].join(" ")}
                            >
                                {completed ? (
                                    <svg
                                        viewBox="0 0 24 24"
                                        className="h-5 w-5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="m5 12 4 4L19 6" />
                                    </svg>
                                ) : (
                                   toPersianDigits(index + 1)
                                )}
                            </span>

                            {/* عنوان مرحله */}
                            <span
                                className={[
                                    "mt-2 min-h-10 max-w-full px-1 text-center",
                                    "text-[11px] leading-5 sm:text-sm",
                                    active
                                        ? "font-bold text-white"
                                        : completed
                                            ? "text-emerald-200"
                                            : "text-white/45"
                                ].join(" ")}
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