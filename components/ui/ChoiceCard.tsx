import type { ReactNode } from "react";

type ChoiceCardProps = {
    title: string;
    description?: string;
    icon?: ReactNode;
    onClick: () => void;
    /** featured: گزینه‌ی پیشنهادی صفحه (حداکثر یکی) */
    variant?: "default" | "featured";
    /** compact: برای فهرست‌های چندتایی مثل تخصص و پزشک */
    size?: "regular" | "compact";
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
                size === "compact" ? "min-h-44 short:min-h-32 p-6 short:p-4" : "min-h-56 short:min-h-44 p-8 short:p-6",
                featured
                    ? "border-brand bg-brand text-white shadow-lift active:bg-brand-strong"
                    : "border-line bg-surface text-ink shadow-card active:border-brand active:bg-brand-soft",
            ].join(" ")}
        >
            {icon && (
                <span
                    className={`flex size-20 short:size-14 items-center justify-center rounded-full ${
                        featured ? "bg-white/15 text-white" : "bg-brand-soft text-brand"
                    }`}
                >
                    {icon}
                </span>
            )}

            <span className="text-title font-bold">{title}</span>

            {description && (
                <span className={`max-w-xs ${size === "compact" ? "text-hint" : "text-body"} ${featured ? "text-white/90" : "text-ink-muted"}`}>
                    {description}
                </span>
            )}
        </button>
    );
}
