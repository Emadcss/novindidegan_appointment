"use client";

type WelcomeStepProps = {
    onStart: () => void;
};

export default function WelcomeStep({ onStart }: WelcomeStepProps) {
    return (
        <button
            type="button"
            onClick={onStart}
            aria-label="برای شروع صفحه را لمس کنید"
            className="flex flex-1 flex-col items-center justify-center gap-10 text-center"
        >
            <span className="flex flex-col gap-3">
                <span className="text-display font-bold text-ink">
                    نوبت خود را اینجا دریافت کنید
                </span>
                <span className="text-title text-ink-muted">
                    برای شروع، صفحه را لمس کنید
                </span>
            </span>

            <span className="relative flex size-60 items-center justify-center">
                <span
                    aria-hidden="true"
                    className="touch-pulse absolute inset-0 rounded-full border-4 border-iris"
                />
                <span
                    aria-hidden="true"
                    className="touch-pulse absolute inset-0 rounded-full border-4 border-iris [animation-delay:1.4s]"
                />
                <span className="relative flex size-48 items-center justify-center rounded-full bg-brand text-display font-bold text-white shadow-lift">
                    شروع
                </span>
            </span>
        </button>
    );
}
