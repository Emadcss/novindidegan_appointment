"use client";

import KioskNavigation from "@/components/ui/KioskNavigation";

type PreviousAppointmentLookupProps = {
    identifierLabel: "شماره موبایل" | "کد ملی"
    identifier: string;
    onFound: (appointmentId: number) => void;
    onNotFound: () => void;
    onBack: () => void;
    onCancel: () => void;
    loading?: boolean;
    error?: string | null;
};

export default function PreviousAppointmentLookup({
    identifierLabel,
    identifier,
    onFound,
    onNotFound,
    onBack,
    onCancel,
    loading = false,
    error = null,
                                                  }: PreviousAppointmentLookupProps) {
    /*
  * فعلاً این کامپوننت فقط UI و Flow را مدیریت می‌کند.
  *
  * بعداً lookup واقعی از طریق API انجام خواهد شد.
  */

    function handleDemoFound() {
        onFound(1);
    }

    return (
        <div className="mx-auto flex w-full max-w-full flex-col">
            {/* Header */}

            <div className="mb-8 text-center">
                <h1 className="text-2xl font-bold md:text-3xl">
                    بررسی نوبت قبلی
                </h1>

                <p className="mt-3 text-base text-white/60 md:text-lg">
                    در حال بررسی {identifierLabel} وارد شده هستیم
                </p>
            </div>

            {/* Identifier */}

            <div
                className="
                    rounded-3xl
                    border
                    border-white/20
                    bg-white/10
                    px-6
                    py-5
                    text-center
                    shadow-xl
                    backdrop-blur-xl
            "
            >
                <p className="text-sm text-white/50">
                    {identifierLabel}
                </p>
                <p
                    dir="ltr"
                    className="mt-2 font-mono text-2xl font-bold tracking-wider"
                >
                    {identifier}
                </p>
            </div>

            {/* Loading */}

            {loading && (
                <div className="mt-8 flex flex-col items-center gap-4">
                    <div
                        className="
                            h-10
                            w-10
                            animate-spin
                            rounded-full
                            border-4
                            border-white/15
                            border-t-lightblue
                        "
                    />

                    <p className="text-lg text-white/70">
                        در حال بررسی...
                    </p>
                </div>
            )}

            {/* Error */}

            {error && !loading && (
                <div
                    className="
                        mt-6
                        rounded-2xl
                        border
                        border-red-400/20
                        bg-red-500/10
                        px-5
                        py-4
                        text-center
                        text-red-200
                    "
                >
                    {error}
                </div>
            )}

            {/* Temporary Demo Controls */}

            {!loading && !error && (
                <div className="mt-8 grid gap-4">
                    <button
                        type="button"
                        onClick={handleDemoFound}
                        className="
                            min-h-20
                            rounded-2xl
                            bg-darkblue
                            px-6
                            text-lg
                            font-bold
                            text-white
                            shadow-lg
                            transition-all
                            active:scale-[0.97]
                            hover:brightness-110
                        "
                    >
                        ادامه با نوبت پیدا شده
                    </button>

                    <button
                     type="button"
                     onClick={onNotFound}
                     className="
                        min-h-20
                        rounded-2xl
                        border
                        border-white/20
                        bg-white/10
                        px-6
                        text-lg
                        font-bold
                        text-white
                        backdrop-blur-xl
                        transition-all
                        active:scale-[0.97]
                        hover:bg-white/15
                     "
                    >
                        شبیه سازی عدم وجود نوبت
                    </button>
                </div>
            )}

            <KioskNavigation
                onBack={onBack}
                onCancel={onCancel}
                disabled={loading}
            />
        </div>
    );
}