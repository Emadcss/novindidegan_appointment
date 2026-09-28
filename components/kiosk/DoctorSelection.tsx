"use client"

import {useEffect, useState} from "react";
import type {
    Doctor,
    Specialty,
} from "@/types/kiosk";
import { fetchDoctors } from "@/app/api/kiosk/kiosk-api";
import KioskNavigation from "@/components/ui/KioskNavigation";

type DoctorSelectionProps = {
    specialty: Specialty;

    onSelect: (doctor: Doctor) => void;

    onBack: () => void;

    onCancel: () => void;
};

export default function DoctorSelection({
    specialty,
    onSelect,
    onBack,
    onCancel,
                                        }: DoctorSelectionProps) {
    const [doctors, setDoctors] =
        useState<Doctor[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);

    useEffect(() => {
        let canceled = false;

        async function loadDoctors() {
            try {
                setLoading(true);
                setError(null);

                const data =
                    await fetchDoctors(
                        specialty.id
                    );

                if (!canceled) {
                    setDoctors(data);
                }
            } catch (error) {
                if (!canceled) {
                    setError(
                        error instanceof Error
                        ? error.message
                            : "خطا در دریافت پزشکان"
                    );
                }
            } finally {
                if (!canceled) {
                    setLoading(false);
                }
            }
        }

        loadDoctors();

        return () => {
            canceled = true;
        };
    }, [specialty.id]);

    return (
        <div className='flex min-h-full flex-col'>
            <div className='mb-8 text-center'>
                <p className='mb-2 text-lg opacity-60'>
                    تخصص انتخاب شده
                </p>

                <h1 className='text-3xl font-bold'>
                    {specialty.name}
                </h1>

                <p className='mt-3 text-lg opacity-70'>
                    پزشک مورد نظر خود را انتخاب کنید
                </p>
            </div>

            {loading && (
                <div className='flex flex-1 items-center justify-center'>
                    <p className='text-xl'>
                        در حال دریافت پزشکان
                    </p>
                </div>
            )}

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

            {!loading &&
                !error &&
                doctors.length > 0 && (
                    <div className='grid flex-1 grid-cols-2 gap-6 lg:grid-cols-3'>
                        {doctors.map((doctor) => (
                            <button
                            key={doctor.id}
                            type='button'
                            onClick={() =>
                                onSelect(doctor)
                            }
                            className='flex min-h-48 flex-col items-center justify-center rounded-3xl border border-white/30 bg-white/15 p-8 text-center shadow-lg backdrop-blur-md transition-transform active:scale-[0.97]'
                            >
                                <span className='text-2xl font-bold'>
                                    {doctor.displayName}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

            {!loading &&
                !error &&
                doctors.length === 0 && (
                    <div className='flex flex-1 items-center justify-center'>
                        <p className='text-xl'>
                            برای این تخصص، پزشکی برای امروز در دسترس نیست
                        </p>
                    </div>
                )}

            <KioskNavigation
                onBack={onBack}
                onCancel={onCancel}
                />
        </div>
    );
}