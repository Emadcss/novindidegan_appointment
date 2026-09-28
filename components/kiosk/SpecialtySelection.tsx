"use client";

import { useEffect, useState } from "react";
import type {Specialty} from "@/types/kiosk";
import {fetchSpecialties} from "@/app/api/kiosk/kiosk-api";
import KioskNavigation from "@/components/ui/KioskNavigation";

type SpecialtySelectionProps = {
    onSelect: (specialty: Specialty) => void;
    onBack: () => void;
    onCancel: () => void;
};

export default function SpecialtySelection({
    onSelect,
    onBack,
    onCancel,}: SpecialtySelectionProps) {
    const [specialties, setSpecialties] =
        useState<Specialty[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadSpecialties() {
            try {
                setLoading(true);
                setError(null);

                const data =
                    await fetchSpecialties();

                if (!cancelled) {
                    setSpecialties(data);
                }
            } catch (error) {
                if (!cancelled) {
                    setError(
                        error instanceof Error
                            ? error.message
                            : "خطا در دریافت تخصص ها"
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadSpecialties();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="flex min-h-full flex-col">
            {/* عنوان */}
            <div className="mb-8 text-center">
                <h1 className='text-3xl font-bold'>
                    تخصص مورد نظر را انتخاب کنید
                </h1>

                <p className='mt-3 text-lg opacity-70'>
                    تخصص مورد نظر را لمس کنید
                </p>
            </div>

            {/* Loading */}
            {loading && (
                <div className='flex flex-1 items-center justify-center'>
                    <div className='tetx-xl'>
                        در حال دریافت تخصص ها...
                    </div>
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className='flex flex-1 flex-col items-center justify-center gap-6'>
                    <p className='text-xl'>
                        {error}
                    </p>

                    <button
                        type='button'
                        onClick={() => window.location.reload()}
                        className='min-h-16 rounded-2xl bg-darkblue px-10 text-lg font-bold text-white'
                    >
                        تلاش مجدد
                    </button>
                </div>
            )}

            {/* Specialties */}
            {!loading &&
                !error &&
                specialties.length > 0 && (
                    <div className='grid flex-1 grid-cols-2 gap-6 lg:grid-cols-3'>
                        {specialties.map((specialty) => (
                            <button
                                key={specialty.id}
                                type='button'
                                onClick={() => onSelect(specialty)
                                }
                                className='flex min-h-48 flex-col items-center justify-center rounded-3xl border border-white/30 bg-white/15 p-8 text-center shadow-lg backdrop-blur-md transition-transform active:scale-[0.97]'
                            >
                                <span className='text-2xl font-bold'>
                                    {specialty.name}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

            {/* No specialties */}
            {!loading &&
                !error &&
                specialties.length === 0 && (
                    <div className="flex flex-1 items-center justify-center">
                        <p className='text-xl'>
                            در حال حاضر تخصص فعالی برای امروز وجود ندارد
                        </p>
                    </div>
                )}

            {/* Navigation */}
            <KioskNavigation
                onBack={onBack}
                onCancel={onCancel}
                />
        </div>
    );
}