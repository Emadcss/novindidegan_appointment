
"use client";

import { useCallback, useEffect, useState } from "react";

import IrisMedicalBackground from "@/components/ui/IrisMedicalBackground";
import Header from "@/components/ui/Header";
import KioskNavigation from "@/components/ui/KioskNavigation";
import KioskProgress, {
  type ProgressItem,
} from "@/components/ui/KioskProgress";
import SpecialtySelection from "@/components/kiosk/SpecialtySelection";
import DoctorSelection from "@/components/kiosk/DoctorSelection";
import NationalitySelection from "@/components/kiosk/NationalitySelection";
import NationalIdForm from "@/components/kiosk/NationalIdForm";
import MobileForm from "@/components/kiosk/MobileForm";
import SurgeryHistory from "@/components/kiosk/SurgeryHistory";
import PreviousAppointmentLookup from "@/components/kiosk/PreviousAppointmentLookup";
import PreviousAppointmentNotFound from "@/components/kiosk/PreviousAppointmentNotFound";

import type {
  Doctor,
  KioskFlow,
  KioskStep,
  Nationality,
  Specialty,
} from "@/types/kiosk";
import {getDoctorById, getSpecialtyById} from "@/lib/kiosk/kiosk-service";



const INACTIVITY_TIMEOUT = 90_000

export default function Kiosk() {
  const [step, setStep] =
    useState<KioskStep>("welcome");

  const [flow, setFlow] =
    useState<KioskFlow | null>(null);

  const [specialty, setSpecialty] =
    useState<Specialty | null>(null);

  const [doctor, setDoctor] =
    useState<Doctor | null>(null);

  const [nationality, setNationality] =
    useState<Nationality | null>(null);

  const [nationalId, setNationalId] =
    useState("");

  const [mobile, setMobile] =
    useState("");

  const [hasSurgeryHistory, setHasSurgeryHistory] =
    useState<boolean | null>(null);

  const [appointmentId, setAppointmentId] =
    useState<number | null>(null);

  // --------------------------------------------------
  // Reset session
  // --------------------------------------------------

  const resetKiosk = useCallback(() => {
    setStep("welcome");
    setFlow(null);
    setSpecialty(null);
    setDoctor(null);
    setNationality(null);
    setNationalId("");
    setMobile("");
    setHasSurgeryHistory(null);
    setAppointmentId(null);
  }, []);

  // --------------------------------------------------
  // Inactivity timeout
  // --------------------------------------------------

  useEffect(() => {
    if (step === "welcome") return;

    let timer: number;

    const resetTimer = () => {
      window.clearTimeout(timer);

      timer = window.setTimeout(() => {
        resetKiosk();
      }, INACTIVITY_TIMEOUT);
    };

    resetTimer();

    window.addEventListener("pointerdown", resetTimer);
    window.addEventListener("touchstart", resetTimer);
    window.addEventListener("keydown", resetTimer);

    return () => {
      window.clearTimeout(timer);

      window.removeEventListener("pointerdown", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      window.removeEventListener("keydown", resetTimer);
    };
  }, [step, resetKiosk]);

  // --------------------------------------------------
  // Welcome
  // --------------------------------------------------

  function handleWelcome() {
    setStep("main-choice");
  }

  // --------------------------------------------------
  // Timeline
  // --------------------------------------------------

  function getProgressItems(
      currentFlow: KioskFlow | null,
      requiresSurgeryHistory: boolean
  ): ProgressItem[] {
    if (currentFlow === "new") {
      const items: ProgressItem[] = [
        { id: "specialty", label: "تخصص" },
        { id: "doctor", label: "پزشک" },
        { id: "identity", label: "مشخصات" },
      ];

      if (requiresSurgeryHistory) {
        items.push({
          id: "surgery",
          label: "سابقه جراحی",
        });
      }

      items.push({
        id: "ticket",
        label: "چاپ قبض",
      });

      return items;
    }

    if (currentFlow === "previous") {
      const items: ProgressItem[] = [
        { id: "identity", label: "مشخصات" },
        { id: "lookup", label: "بررسی نوبت" },
      ];

      if (requiresSurgeryHistory) {
        items.push({
          id: "surgery",
          label: "سابقه جراحی",
        });
      }

      items.push({
        id: "ticket",
        label: "چاپ قبض",
      });

      return items;
    }

    return [];
  }

  function getProgressIndex(
     currentStep: KioskStep,
      currentFlow: KioskFlow | null,
      requiresSurgeryHistory: boolean
  ): number {
    if (currentFlow === "new") {
      switch (currentStep) {
        case "new-specialty":
          return 0;

        case "new-doctor":
          return 1;

        case "new-nationality":
        case "national-id":
        case "mobile":
          return 2;

        case "surgery-history":
          return 3;

        case "printing":
          return requiresSurgeryHistory ? 4 : 3;

        default:
          return 0;
      }
    }

    if (flow === "previous") {
      switch (currentStep) {
        case "previous-nationality":
        case "national-id":
        case "mobile":
          return 0;

        case "previous-lookup":
          return 1;

        case "surgery-history":
          return 2;

        case "printing":
          return requiresSurgeryHistory ? 3 : 2;

        default:
          return 0;
      }
    }

    return 0;
  }

  const requireSurgeryHistory =
      doctor?.requiresSurgeryHistory ?? false;

  const progressItems = getProgressItems(
      flow,
      requireSurgeryHistory
  );

  const progressIndex = getProgressIndex(
      step,
      flow,
      requireSurgeryHistory
  );

  const shouldShowProgress =
      step !== "welcome" &&
      step !== "main-choice" &&
      step !== "previous-not-found" &&
      progressItems.length > 0;

  // --------------------------------------------------
  // Main choice
  // --------------------------------------------------

  function handleNewAppointment() {
    setFlow("new");
    setSpecialty(null);
    setDoctor(null);
    setNationality(null);

    setNationalId("");
    setMobile("");

    setHasSurgeryHistory(null);
    setAppointmentId(null);

    setStep("new-specialty");
  }

  function handlePreviousAppointment() {
    setFlow("previous");
    setSpecialty(null);
    setDoctor(null);
    setNationality(null);

    setNationalId("");
    setMobile("");

    setHasSurgeryHistory(null);
    setAppointmentId(null);

    setStep("previous-nationality");
  }

  // --------------------------------------------------
  // Specialty
  // --------------------------------------------------

  function handleSpecialtySelect(
    selectedSpecialty: Specialty
  ) {
    setSpecialty(selectedSpecialty);
    setDoctor(null);

    setStep("new-doctor");
  }

  // --------------------------------------------------
  // Doctor
  // --------------------------------------------------

  function handleDoctorSelect(
    selectedDoctor: Doctor
  ) {
    setDoctor(selectedDoctor);
    setNationality(null);

    setNationalId("");
    setMobile("");
    setHasSurgeryHistory(null);

    setStep("new-nationality");
  }

  // --------------------------------------------------
  // Nationality
  // --------------------------------------------------

  function handleNationalitySelect(
    selectedNationality: Nationality
  ) {
    setNationality(selectedNationality);

    if (
      selectedNationality === "iranian"
    ) {
      setMobile("");
      setStep("national-id");
      return;
    }

    setNationalId("");
    setStep("mobile");
  }

  // --------------------------------------------------
  // Identity form completed
  // --------------------------------------------------

  function handleIdentitySubmit(value: string) {
    if (nationality === "iranian") {
      setNationalId(value);
      setMobile("");
    } else {
      setMobile(value);
      setNationalId("");
    }

    if (flow === "previous") {
      setStep("previous-lookup");
      return;
    }

    if (doctor?.requiresSurgeryHistory) {
      setStep("surgery-history");
      return;
    }

    // موقت: تا اتصال API، فقط صفحه چاپ نمایش داده می‌شود.
    // بعداً اینجا باید createAppointment اجرا شود.
    setStep("printing")
  }

  // --------------------------------------------------
  // Back
  // --------------------------------------------------

  function handleBack() {
    switch (step) {
      case "main-choice":
        setStep("welcome");
        return;

      case "previous-nationality":
      case "new-specialty":
        setStep("main-choice");
        return;

      case "new-doctor":
        setDoctor(null);
        setStep("new-specialty");
        return;

      case "new-nationality":
        setNationality(null);
        setStep("new-doctor");
        return;

      case "national-id":
      case "mobile":
        if (flow === "previous") {
          setStep("previous-nationality");
        } else {
          setStep("new-nationality");
        }

        return;


      case "previous-lookup":
          if (nationality === "iranian") {
            setStep("national-id");
          } else {
            setStep("mobile");
          }
          return;

      case "previous-not-found":
        if (nationality === "iranian") {
          setStep("national-id");
        } else {
          setStep("mobile");
        }
        return;

      case "surgery-history":
        // در مسیر نوبت قبلی، به جای فرم مشخصات،
        // به نتیجه جست‌وجوی همان نوبت برمی‌گردیم.

        if (flow === "previous" && appointmentId !== null) {
          setStep("previous-lookup");
          return;
        }

        if (nationality === "iranian") {
          setStep("national-id");
        } else {
          setStep("mobile");
        }

        return;

      default:
        return;
    }
  }

  // --------------------------------------------------
  // Cancel
  // --------------------------------------------------

  function handleCancel() {
    resetKiosk();
  }

  // --------------------------------------------------
  // Render current step
  // --------------------------------------------------

  function renderStep() {
    switch (step) {
      // ----------------------------------------------
      // Welcome
      // ----------------------------------------------

      case "welcome":
        return (
          <button
            type="button"
            onClick={handleWelcome}
            className="
              group
              mx-auto
              flex
              min-h-56
              w-full
              max-w-3xl
              flex-col
              items-center
              justify-center
              rounded-[2rem]
              border
              border-white/20
              bg-white/10
              px-8
              py-12
              text-center
              shadow-2xl
              backdrop-blur-xl
              transition-all
              duration-200
              active:scale-[0.98]
              hover:bg-white/15
            "
          >
            <span className="text-4xl font-bold md:text-5xl">
              دریافت نوبت
            </span>

            <span className="mt-5 text-lg text-white/65 md:text-xl">
              برای شروع صفحه را لمس کنید
            </span>
          </button>
        );

      // ----------------------------------------------
      // Main choice
      // ----------------------------------------------

      case "main-choice":
        return (
          <div className="mx-auto w-full max-w-5xl">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold md:text-4xl">
                چگونه می‌توانیم به شما کمک کنیم؟
              </h1>

              <p className="mt-3 text-lg text-white/60">
                یکی از گزینه‌های زیر را انتخاب کنید
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <button
                type="button"
                onClick={handlePreviousAppointment}
                className="
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
                  active:scale-[0.98]
                  hover:bg-white/15
                "
              >
                <span className="text-2xl font-bold md:text-3xl">
                  نوبت قبلی دارم
                </span>

                <span className="mt-4 text-base text-white/60 md:text-lg">
                  پیگیری یا دریافت قبض نوبت قبلی
                </span>
              </button>

              <button
                type="button"
                onClick={handleNewAppointment}
                className="
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
                  active:scale-[0.98]
                  hover:bg-white/15
                "
              >
                <span className="text-2xl font-bold md:text-3xl">
                  دریافت نوبت جدید
                </span>

                <span className="mt-4 text-base text-white/60 md:text-lg">
                  انتخاب تخصص و پزشک
                </span>
              </button>
            </div>

            <KioskNavigation
              onBack={handleBack}
              onCancel={handleCancel}
            />
          </div>
        );

      // ----------------------------------------------
      // New appointment - specialty
      // ----------------------------------------------

      case "new-specialty":
        return (
          <SpecialtySelection
            onSelect={handleSpecialtySelect}
            onBack={handleBack}
            onCancel={handleCancel}
          />
        );

      // ----------------------------------------------
      // New appointment - doctor
      // ----------------------------------------------

      case "new-doctor":
        if (!specialty) {
          return null;
        }

        return (
          <DoctorSelection
            specialty={specialty}
            onSelect={handleDoctorSelect}
            onBack={handleBack}
            onCancel={handleCancel}
          />
        );

      // ----------------------------------------------
      // Previous nationality
      // ----------------------------------------------

      case "previous-nationality":
        return (
            <NationalitySelection
                onSelect={handleNationalitySelect}
                onBack={handleBack}
                onCancel={handleCancel}
            />
        );

      // ----------------------------------------------
      // New nationality
      // ----------------------------------------------

      case "new-nationality":
        return (
            <NationalitySelection
                onSelect={handleNationalitySelect}
                onBack={handleBack}
                onCancel={handleCancel}
            />
        );

      // ----------------------------------------------
      // National ID
      // ----------------------------------------------

      case "national-id":
        return (
          <NationalIdForm
            value={nationalId}
            onSubmit={handleIdentitySubmit}
            onBack={handleBack}
            onCancel={handleCancel}
          />
        );

      // ----------------------------------------------
      // Mobile
      // ----------------------------------------------

      case "mobile":
        return (
          <MobileForm
              value={mobile}
              onSubmit={handleIdentitySubmit}
              onBack={handleBack}
              onCancel={handleCancel}
          />
        );

        // ----------------------------------------------
        // previous appointment lookup
        // ----------------------------------------------

      case "previous-lookup":
        return (
            <PreviousAppointmentLookup
                identifierLabel={
                  nationality === "iranian"
                    ? "کد ملی"
                    : "شماره موبایل"
                }
                identifier={
                  nationality === "iranian"
                    ? nationalId
                    : mobile
                }
                onFound={(result) => {
                 if (!result.found || result.appointmentId === null) {
                    setStep("previous-not-found");
                 return
                 }

                 setAppointmentId(result.appointmentId);

                 setSpecialty(
                     result.specialtyId !== null
                      ? getSpecialtyById(result.specialtyId) ?? null
                      : null
                 );

                 setDoctor(
                     result.doctorId !== null
                        ? getDoctorById(result.doctorId) ?? null
                         : null
                 );

                 setHasSurgeryHistory(result.hasSurgeryHistory);

                 if (result.requiresSurgeryHistory) {
                  setStep("surgery-history");
                 } else {
                   setStep("printing");
                 }
                }
            }
                onNotFound={() => {
                  setStep("previous-not-found");
                }}
                onBack={handleBack}
                onCancel={handleCancel}
            />
        );

        // ----------------------------------------------
        // Previous appointment not found
        // ----------------------------------------------

      case "previous-not-found":
        return (
            <PreviousAppointmentNotFound
                onBack={handleBack}
                onCancel={handleCancel}
                onNewAppointment={handleNewAppointment}
            />
        );

      // ----------------------------------------------
      // Surgery history
      // ----------------------------------------------

      case "surgery-history":
        return (
            <SurgeryHistory
                onSelect={(value) => {
                  setHasSurgeryHistory(value);

                  // موقت: بعداً باید ثبت نوبت یا ادامه فرایند
                  // چاپ قبض واقعی انجام شود.
                  setStep("printing");
                }}
                onBack={handleBack}
                onCancel={handleCancel}
            />
        );

      // ----------------------------------------------
      // Printing
      // ----------------------------------------------

      case "printing":
        return (
            <Placeholder
                title="مرحله چاپ قبض هنوز به چاپگر متصل نشده است"
                description="پس از اتصال سرویس ثبت نوبت و چاپگر، قبض نوبت در این مرحله چاپ خواهد شد."
                onRestart={resetKiosk}
            />
        );

      default:
        return null;
    }
  }

  // --------------------------------------------------
  // Layout
  // --------------------------------------------------

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020a1a] text-white">
      <IrisMedicalBackground />

      <div className="relative z-10 flex min-h-screen flex-col px-5 py-3 md:px-8 md:py-4">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
          <Header compact={step !== "welcome"} />

          <div className="flex flex-1 flex-col justify-center py-3">
            {shouldShowProgress && (
                <div className="mx-auto mb-8 w-full max-w-5xl">
                  <KioskProgress
                      items={progressItems}
                      activeIndex={Math.min(
                          progressIndex,
                          progressItems.length - 1
                      )}
                      />
                </div>
            )}
            <div className="w-full">
              {renderStep()}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ==================================================
// Temporary placeholder
// ==================================================

type PlaceholderProps = {
  title: string;
  description: string;
  onRestart: () => void;
};

function Placeholder({
                       title,
                       description,
                       onRestart,
                     }: PlaceholderProps) {
  return (
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
        <div className="flex min-h-72 w-full flex-col items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 p-10 text-center shadow-xl backdrop-blur-xl">
          <h1 className="text-2xl font-bold md:text-4xl">
            {title}
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
            {description}
          </p>
        </div>

        <button
            type="button"
            onClick={onRestart}
            className="
          mt-6 min-h-16 rounded-2xl border border-white/20
          bg-white/10 px-10 py-4 text-lg font-semibold
          transition hover:bg-white/15 active:scale-[0.98]
        "
        >
          بازگشت به صفحه شروع
        </button>
      </div>
  );
}
