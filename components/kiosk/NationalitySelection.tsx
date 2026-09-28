
"use client";

import KioskNavigation from "@/components/ui/KioskNavigation";

import type { Nationality } from "@/types/kiosk";

type NationalitySelectionProps = {
  onSelect: (
    nationality: Nationality
  ) => void;

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
    <div className="mx-auto flex w-full max-w-5xl flex-col">

      {/* ==========================================
          Title
          ========================================== */}

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">
          {title}
        </h1>

        <p className="mt-3 text-lg text-white/60">
          یکی از گزینه‌های زیر را انتخاب کنید
        </p>
      </div>

      {/* ==========================================
          Choices
          ========================================== */}

      <div className="grid gap-6 md:grid-cols-2">

        {/* Iranian */}

        <button
          type="button"
          onClick={() =>
            onSelect("iranian")
          }
          className="
            group
            flex
            min-h-52
            flex-col
            items-center
            justify-center
            rounded-[2rem]
            border
            border-white/20
            bg-white/10
            p-8
            text-center
            shadow-xl
            backdrop-blur-xl
            transition-all
            duration-200
            active:scale-[0.98]
            hover:bg-white/15
          "
        >
          <span
            className="
              text-2xl
              font-bold
              md:text-3xl
            "
          >
            ایرانی هستم
          </span>

          <span
            className="
              mt-4
              text-base
              text-white/55
              md:text-lg
            "
          >
            استفاده از کد ملی
          </span>
        </button>

        {/* Foreign */}

        <button
          type="button"
          onClick={() =>
            onSelect("foreign")
          }
          className="
            group
            flex
            min-h-52
            flex-col
            items-center
            justify-center
            rounded-[2rem]
            border
            border-white/20
            bg-white/10
            p-8
            text-center
            shadow-xl
            backdrop-blur-xl
            transition-all
            duration-200
            active:scale-[0.98]
            hover:bg-white/15
          "
        >
          <span
            className="
              text-2xl
              font-bold
              md:text-3xl
            "
          >
            ایرانی نیستم
          </span>

          <span
            className="
              mt-4
              text-base
              text-white/55
              md:text-lg
            "
          >
            استفاده از شماره موبایل
          </span>
        </button>
      </div>

      {/* ==========================================
          Navigation
          ========================================== */}

      <KioskNavigation
        onBack={onBack}
        onCancel={onCancel}
      />
    </div>
  );
}