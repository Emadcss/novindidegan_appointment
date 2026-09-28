"use client"

import KioskNavigation from "@/components/ui/KioskNavigation";

type PreviousAppointmentNotFoundProps = {
    onBack: () => void;
    onCancel: () => void;
    onNewAppointment: () => void;
};

export default function PreviousAppointmentNotFound({
    onBack,
    onCancel,
    onNewAppointment,
                                                    }: PreviousAppointmentNotFoundProps) {
    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col">
            <div
                className='
                    flex
                    min-h-64
                    flex-col
                    items-center
                    justify-center
                    rounded-[2rem]
                    border
                    border-white/20
                    bg-white/10
                    px-8
                    py-10
                    text-center
                    shadow-xl
                    backdrop-blur-xl
                '
            >
                <div
                    className="
                        flex
                        h-16
                        w-16
                        items-center
                        justify-center
                        rounded-full
                        bg-amber-400/10
                        text-3xl
                        text-amber-300
                    "
                >
                    <svg
                        viewBox="0 0 24 24"
                        className="h-8 w-8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>

                <h1 className="mt-5 text-2xl font-bold md:text-3xl">
                    نوبتی برای شما پیدا نشد
                </h1>

                <p className="mt-3 max-w-xl text-base text-white/60 md:text-lg">
                    با مشخصات وارد شده، نوبت قبلی فعالی در سیستم پیدا نشد
                </p>

                <button
                    type="button"
                    onClick={onNewAppointment}
                    className="
                        mt-7
                        min-h-16
                        rounded-2xl
                        bg-darkblue
                        px-10
                        text-lg
                        font-bold
                        text-white
                        shadow-lg
                        transition-all
                        active:scale-[0.97]
                        hover:brightness-110
                    "
                >
                    دریافت نوبت جدید
                </button>
            </div>

        <KioskNavigation
            onBack={onBack}
            onCancel={onCancel}
        />
        </div>
    );
}