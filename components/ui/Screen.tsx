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
            <header className="mb-5 sm:mb-8 short:sm:mb-4">
                {context && (
                    <p className="mb-2 inline-block max-w-full rounded-full bg-brand-soft px-3 py-1 text-sm font-bold text-brand sm:mb-3 sm:px-5 sm:py-1.5 sm:text-hint">
                        {context}
                    </p>
                )}

                <h1 className="text-2xl font-bold text-ink sm:text-heading short:sm:text-title">{title}</h1>

                {hint && <p className="mt-2 text-base text-ink-muted sm:text-body short:sm:text-hint">{hint}</p>}
            </header>

            <div className="flex flex-1 flex-col">{children}</div>

            {onBack && onCancel && (
                <KioskNavigation onBack={onBack} onCancel={onCancel} disabled={navDisabled} />
            )}
        </section>
    );
}
