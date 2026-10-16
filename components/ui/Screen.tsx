import type { ReactNode } from "react";
import KioskNavigation from "@/components/ui/KioskNavigation";

type ScreenProps = {
    title: string;
    hint?: string;
    /** زمینه‌ی انتخاب‌های قبلی، مثل «تخصص: چشم پزشکی» */
    context?: string;
    onBack?: () => void;
    onCancel?: () => void;
    navDisabled?: boolean;
    children: ReactNode;
};

/**
 * قالب مشترک همه‌ی مرحله‌ها:
 * عنوان (راست‌چین) ← محتوا ← ناوبری ثابت پایین.
 */
export default function Screen({
    title,
    hint,
    context,
    onBack,
    onCancel,
    navDisabled = false,
    children,
}: ScreenProps) {
    return (
        <section className="flex flex-1 flex-col">
            <header className="mb-8 short:mb-4">
                {context && (
                    <p className="mb-3 inline-block rounded-full bg-brand-soft px-5 py-1.5 text-hint font-bold text-brand">
                        {context}
                    </p>
                )}

                <h1 className="text-heading short:text-title font-bold text-ink">{title}</h1>

                {hint && <p className="mt-2 text-body short:text-hint text-ink-muted">{hint}</p>}
            </header>

            <div className="flex flex-1 flex-col">{children}</div>

            {onBack && onCancel && (
                <KioskNavigation onBack={onBack} onCancel={onCancel} disabled={navDisabled} />
            )}
        </section>
    );
}
