"use client";

import { useEffect, useState } from "react";
import type { Doctor, Specialty } from "@/types/kiosk";
import { fetchDoctors } from "@/app/api/kiosk/kiosk-api";
import Button from "@/components/ui/Button";
import ChoiceCard from "@/components/ui/ChoiceCard";
import Screen from "@/components/ui/Screen";
import StatusPanel from "@/components/ui/StatusPanel";

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
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let canceled = false;

        async function loadDoctors() {
            try {
                setLoading(true);
                setFailed(false);

                const data = await fetchDoctors(specialty.id);

                if (!canceled) {
                    setDoctors(data);
                }
            } catch {
                if (!canceled) {
                    setFailed(true);
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
    }, [specialty.id, attempt]);

    return (
        <Screen
            context={`تخصص: ${specialty.name}`}
            title="پزشک را انتخاب کنید"
            hint="پزشکانی که الان حضور دارند نمایش داده می‌شوند"
            onBack={onBack}
            onCancel={onCancel}
        >
            {loading && <StatusPanel tone="loading" title="در حال دریافت پزشکان…" />}

            {!loading && failed && (
                <StatusPanel
                    tone="error"
                    title="فهرست پزشکان بارگذاری نشد"
                    description="ارتباط با سرور برقرار نشد. دوباره تلاش کنید یا به پذیرش مراجعه کنید."
                >
                    <Button onClick={() => setAttempt((value) => value + 1)}>تلاش دوباره</Button>
                </StatusPanel>
            )}

            {!loading && !failed && doctors.length === 0 && (
                <StatusPanel
                    tone="empty"
                    title="برای این تخصص، الان پزشکی حاضر نیست"
                    description="تخصص دیگری انتخاب کنید یا برای راهنمایی به پذیرش مراجعه کنید."
                >
                    <Button variant="secondary" onClick={onBack}>
                        انتخاب تخصص دیگر
                    </Button>
                </StatusPanel>
            )}

            {!loading && !failed && doctors.length > 0 && (
                <div className="kiosk-portrait-doctor-grid grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                    {doctors.map((doctor) => (
                        <ChoiceCard
                            key={doctor.id}
                            size="compact"
                            icon={<span className="text-title font-bold">{doctor.lastName.charAt(0)}</span>}
                            title={doctor.displayName}
                            onClick={() => onSelect(doctor)}
                        />
                    ))}
                </div>
            )}
        </Screen>
    );
}
