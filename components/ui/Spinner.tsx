type SpinnerProps = {
    className?: string;
    /** brand: روی زمینه‌ی روشن · light: داخل دکمه‌ی آبی */
    tone?: "brand" | "light";
};

const TONES = {
    brand: "border-brand-soft border-t-brand",
    light: "border-white/30 border-t-white",
} as const;

export default function Spinner({ className = "size-14", tone = "brand" }: SpinnerProps) {
    return (
        <span
            role="status"
            aria-label="در حال بارگذاری"
            className={`inline-block animate-spin rounded-full border-4 motion-reduce:animate-none ${TONES[tone]} ${className}`}
        />
    );
}
