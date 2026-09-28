"use client"

import KioskNavigation from "@/components/ui/KioskNavigation";

type SurgeryHistoryProps = {
    onSelect: (hasSurgeryHistory : boolean) => void;
    onBack: () => void;
    onCancel: () => void;
};

export default function SurgeryHistory({
    onSelect,
    onBack,
    onCancel,
                                       }: SurgeryHistoryProps) {
    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col">
            {/* Header */}

            <div className="mb-8 text-center">
                <h1 className="text-2xl font-bold md:text-3xl">
                    آیا سابقه‌ی جراحی در این مرکز را داشته‌اید؟
                </h1>
                <p className="mt-3 text-base text-white/60 md:text-lg">
                    یکی از گزینه‌های زیر را انتخاب کنید
                </p>
            </div>

            {/* Options */}

            <div className="grid gap-5 md:grid-cols-2">
                <button
                    type="button"
                    onClick={() => onSelect(true)}
                    className="
                    group
                    flex
                    min-h-44
                    items-center
                    justify-center
                    rounded-[2rem]
                    border
                    border-white/20
                    bg-white/10
                    px-8
                    py-6
                    text-center
                    shadow-xl
                    backdrop-blur-xl
                    transition-all
                    duration-200
                    active:scale-[0.97]
                    hover:bg-white/15
                    "
                >
                    <span className='text-3xl font-bold md:text-4xl'>
                        بله
                    </span>
                </button>

                <button
                type="button"
                onClick={() => onSelect(false)}
                className="
                group
                flex
                min-h-44
                items-center
                justify-center
                rounded-[2rem]
                border
                border-white/20
                bg-white/10
                px-8
                py-6
                text-center
                shadow-xl
                backdrop-blur-xl
                transition-all
                duration-200
                active:scale-[0.97]
                hover:bg-white/15
                "
                >
                    <span className="text-3xl font-bold md:text-4xl">
                        خیر
                    </span>
                </button>
            </div>

            {/* Navigation */}

            <KioskNavigation
                onBack={onBack}
                onCancel={onCancel}
            />
        </div>
    );
}