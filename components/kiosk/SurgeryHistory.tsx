"use client";

import ChoiceCard from "@/components/ui/ChoiceCard";
import Screen from "@/components/ui/Screen";

type SurgeryHistoryProps = {
    onSelect: (hasSurgeryHistory: boolean) => void;
    onBack: () => void;
    onCancel: () => void;
};

export default function SurgeryHistory({ onSelect, onBack, onCancel }: SurgeryHistoryProps) {
    return (
        <Screen
            title="آیا قبلاً در این مرکز جراحی داشته‌اید؟"
            hint="پاسخ شما به پزشک کمک می‌کند"
            onBack={onBack}
            onCancel={onCancel}
        >
            <div className="kiosk-portrait-primary-options grid flex-1 items-stretch gap-6 md:grid-cols-2">
                <ChoiceCard title="بله، داشته‌ام" onClick={() => onSelect(true)} />
                <ChoiceCard title="خیر، نداشته‌ام" onClick={() => onSelect(false)} />
            </div>
        </Screen>
    );
}
