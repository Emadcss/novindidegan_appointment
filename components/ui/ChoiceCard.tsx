import type { ReactNode } from "react";

type ChoiceCardProps = {
    title: string;
    description?: string;
    icon?: ReactNode;
    onClick: () => void;
    /** featured: گزینه‌ی پیشنهادی صفحه (حداکثر یکی) */
    variant?: "default" | "featured";
    /** compact: برای فهرست‌های چندتایی مثل تخصص و پزشک */
    size?: "regular" | "compact" | "compact-square";
};

export default function ChoiceCard({
    title,
    description,
    icon,
    onClick,
    variant = "default",
    size = "regular",
}: ChoiceCardProps) {
    const featured = variant === "featured";

    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "flex w-full touch-manipulation flex-col items-center justify-center gap-4",
                "rounded-card border-2 text-center transition-[transform,background-color,border-color] duration-150",
                "active:scale-[0.98]",
                size === "compact-square"
                    ? "aspect-square min-h-0 gap-2 p-2 sm:aspect-auto sm:min-h-44 sm:gap-4 sm:p-6 short:sm:min-h-32 short:sm:p-4"
                    : size === "compact"
                      ? "min-h-32 p-4 sm:min-h-44 sm:p-6 short:sm:min-h-32 short:sm:p-4"
                      : "min-h-40 p-5 sm:min-h-56 sm:p-8 short:sm:min-h-44 short:sm:p-6",
                featured
                    ? "border-brand bg-brand text-white shadow-lift active:bg-brand-strong"
                    : "border-line bg-surface text-ink shadow-card active:border-brand active:bg-brand-soft",
            ].join(" ")}
        >
            {icon && (
                <span
                    className={`flex ${size === "compact-square" ? "size-12 sm:size-20 short:sm:size-14" : "size-14 sm:size-20 short:sm:size-14"} items-center justify-center rounded-full ${
                        featured ? "bg-white/15 text-white" : "bg-brand-soft text-brand"
                    }`}
                >
                    {icon}
                </span>
            )}

            <span className={`${size === "compact-square" ? "text-base leading-snug sm:text-title" : "text-lg sm:text-title"} font-bold`}>
                {title}
            </span>

            {description && (
                <span className={`max-w-xs ${size === "compact-square" ? "text-xs leading-tight sm:text-hint" : size === "compact" ? "text-sm sm:text-hint" : "text-sm sm:text-body"} ${featured ? "text-white/90" : "text-ink-muted"}`}>
                    {description}
                </span>
            )}
        </button>
    );
}
