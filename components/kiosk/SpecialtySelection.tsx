"use client";

import { useEffect, useState } from "react";
import type { Specialty, SpecialtyWithAvailability } from "@/types/kiosk";
import { fetchSpecialties } from "@/app/api/kiosk/kiosk-api";
import Button from "@/components/ui/Button";
import ChoiceCard from "@/components/ui/ChoiceCard";
import { SpecialtyIcon } from "@/components/ui/Icons";
import Screen from "@/components/ui/Screen";
import StatusPanel from "@/components/ui/StatusPanel";
import { toPersianDigits } from "@/lib/utils/persian-digits";

type SpecialtySelectionProps = {
    onSelect: (specialty: Specialty) => void;
    onBack: () => void;
    onCancel: () => void;
};

export default function SpecialtySelection({
    onSelect,
    onBack,
    onCancel,
}: SpecialtySelectionProps) {
    const [specialties, setSpecialties] = useState<SpecialtyWithAvailability[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    // با تغییر این شماره، بدون بارگذاری مجدد صفحه (و پاک شدن مراحل) دوباره دریافت می‌کنیم
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function loadSpecialties() {
            try {
                setLoading(true);
                setFailed(false);

                const data = await fetchSpecialties();

                if (!cancelled) {
                    setSpecialties(data);
                }
            } catch {
                if (!cancelled) {
                    setFailed(true);
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
    }, [attempt]);

    return (
        <Screen
            title="تخصص مورد نظر را انتخاب کنید"
            hint="یکی از تخصص‌ها را لمس کنید"
            onBack={onBack}
            onCancel={onCancel}
        >
            {loading && <StatusPanel tone="loading" title="در حال دریافت تخصص‌ها…" />}

            {!loading && failed && (
                <StatusPanel
                    tone="error"
                    title="تخصص‌ها بارگذاری نشد"
                    description="ارتباط با سرور برقرار نشد. دوباره تلاش کنید یا به پذیرش مراجعه کنید."
                >
                    <Button onClick={() => setAttempt((value) => value + 1)}>تلاش دوباره</Button>
                </StatusPanel>
            )}

            {!loading && !failed && specialties.length === 0 && (
                <StatusPanel
                    tone="empty"
                    title="امروز تخصصی برای ثبت نوبت در دسترس نیست"
                    description="برای راهنمایی به پذیرش مراجعه کنید."
                />
            )}

            {!loading && !failed && specialties.length > 0 && (
                <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
                    {specialties.map((specialty) => (
                        <ChoiceCard
                            key={specialty.id}
                            size="compact"
                            icon={<SpecialtyIcon name={specialty.icon} className="size-10" />}
                            title={specialty.name}
                            description={`${toPersianDigits(specialty.availableDoctorCount)} پزشک حاضر`}
                            onClick={() => onSelect(specialty)}
                        />
                    ))}
                </div>
            )}
        </Screen>
    );
}
