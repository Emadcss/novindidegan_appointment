"use client";

import ChoiceCard from "@/components/ui/ChoiceCard";
import { IdCardIcon, PhoneIcon } from "@/components/ui/Icons";
import Screen from "@/components/ui/Screen";
import type { Nationality } from "@/types/kiosk";

type NationalitySelectionProps = {
  onSelect: (nationality: Nationality) => void;
  onBack: () => void;
  onCancel: () => void;
  title?: string;
};

export default function NationalitySelection({
  onSelect,
  onBack,
  onCancel,
  title = "ملیت خود را انتخاب کنید",
}: NationalitySelectionProps) {
  return (
    <Screen
      title={title}
      hint="بر اساس ملیت، کد ملی یا شماره موبایل از شما می‌خواهیم"
      onBack={onBack}
      onCancel={onCancel}
    >
      <div className="kiosk-portrait-primary-options grid flex-1 items-stretch gap-6 md:grid-cols-2">
        <ChoiceCard
          icon={<IdCardIcon className="size-10" />}
          title="ایرانی هستم"
          description="ثبت با کد ملی"
          onClick={() => onSelect("iranian")}
        />

        <ChoiceCard
          icon={<PhoneIcon className="size-10" />}
          title="ایرانی نیستم"
          description="ثبت با شماره موبایل ایران"
          onClick={() => onSelect("foreign")}
        />
      </div>
    </Screen>
  );
}
