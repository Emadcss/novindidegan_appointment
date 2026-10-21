import type { ButtonHTMLAttributes, ReactNode } from "react";
import Spinner from "@/components/ui/Spinner";

export type ButtonVariant = "primary" | "secondary" | "quiet";
export type ButtonSize = "md" | "lg";

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
    /** primary: عمل اصلی صفحه (در هر صفحه حداکثر یکی) · secondary: عمل مکمل · quiet: خروج/انصراف */
    variant?: ButtonVariant;
    /** md = ۶۴px · lg = ۸۰px (حداقل ارتفاع قابل لمس) */
    size?: ButtonSize;
    loading?: boolean;
    icon?: ReactNode;
    fullWidth?: boolean;
};

const VARIANTS: Record<ButtonVariant, string> = {
    primary:
        "bg-brand text-white shadow-lift hover:bg-brand-strong active:bg-brand-strong disabled:shadow-none",
    secondary:
        "border-2 border-brand bg-surface text-brand hover:bg-brand-soft active:bg-brand-soft",
    quiet:
        "border-2 border-line-strong bg-surface text-ink-muted hover:bg-brand-soft active:bg-brand-soft",
};

const SIZES: Record<ButtonSize, string> = {
    md: "min-h-14 px-4 text-base sm:min-h-16 sm:px-8 sm:text-body short:sm:min-h-12",
    lg: "min-h-16 px-5 text-lg sm:min-h-20 sm:px-10 sm:text-title short:sm:min-h-14 short:sm:text-body",
};

export default function Button({
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    fullWidth = false,
    disabled,
    className = "",
    children,
    ...rest
}: ButtonProps) {
    return (
        <button
            type="button"
            disabled={disabled || loading}
            className={[
                "inline-flex touch-manipulation items-center justify-center gap-3",
                "rounded-control font-bold transition-[transform,background-color] duration-150",
                "active:scale-[0.98] disabled:opacity-45 disabled:active:scale-100",
                VARIANTS[variant],
                SIZES[size],
                fullWidth ? "w-full" : "",
                className,
            ].join(" ")}
            {...rest}
        >
            {loading ? <Spinner className="size-7" tone={variant === "primary" ? "light" : "brand"} /> : icon}
            {children}
        </button>
    );
}
