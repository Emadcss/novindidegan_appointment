"use client";

import ChoiceCard from "../../../../../../Downloads/novindidegan_appointment-latest/novindidegan_appointment/components/ui/ChoiceCard";
import { HistoryIcon, PlusTicketIcon } from "../../../../../../Downloads/novindidegan_appointment-latest/novindidegan_appointment/components/ui/Icons";
import Screen from "../../../../../../Downloads/novindidegan_appointment-latest/novindidegan_appointment/components/ui/Screen";

type MainChoiceStepProps = {
    onNew: () => void;
    onPrevious: () => void;
    onBack: () => void;
    onCancel: () => void;
};

export default function MainChoiceStep({
    onNew,
    onPrevious,
    onBack,
    onCancel,
}: MainChoiceStepProps) {
    return (
        <Screen
            title="چه کاری می‌خواهید انجام دهید؟"
            hint="یکی از گزینه‌ها را لمس کنید"
            onBack={onBack}
            onCancel={onCancel}
        >
            <div className="grid flex-1 items-stretch gap-6 md:grid-cols-2">
                <ChoiceCard
                    variant="featured"
                    icon={<PlusTicketIcon className="size-10" />}
                    title="دریافت نوبت جدید"
                    description="انتخاب تخصص و پزشک"
                    onClick={onNew}
                />

                <ChoiceCard
                    icon={<HistoryIcon className="size-10" />}
                    title="نوبت قبلی دارم"
                    description="پیگیری نوبت یا دریافت دوباره‌ی قبض"
                    onClick={onPrevious}
                />
            </div>
        </Screen>
    );
}
