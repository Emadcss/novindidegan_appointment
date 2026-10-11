"use client";

import { useCallback, useEffect, useState } from "react";

import IrisMedicalBackground from "@/components/ui/IrisMedicalBackground";
import Header from "@/components/ui/Header";
import KioskNavigation from "@/components/ui/KioskNavigation";
import KioskProgress, { type ProgressItem } from "@/components/ui/KioskProgress";

import SpecialtySelection from "@/components/kiosk/SpecialtySelection";
import DoctorSelection from "@/components/kiosk/DoctorSelection";
import NationalitySelection from "@/components/kiosk/NationalitySelection";
import NationalIdForm from "@/components/kiosk/NationalIdForm";
import MobileForm from "@/components/kiosk/MobileForm";
import SurgeryHistory from "@/components/kiosk/SurgeryHistory";
import PreviousAppointmentLookup from "@/components/kiosk/PreviousAppointmentLookup";
import PreviousAppointmentNotFound from "@/components/kiosk/PreviousAppointmentNotFound";
import AppointmentResult from "@/components/kiosk/AppointmentResult";

import { createAppointmentApi } from "@/lib/kiosk/api-client";
import { getDoctorById, getSpecialtyById } from "@/lib/kiosk/kiosk-service";

import type {
  Doctor,
  KioskFlow,
  KioskStep,
  Nationality,
  Specialty,
} from "@/types/kiosk";

const INACTIVITY_TIMEOUT = 90_000;

export default function Kiosk() {
  const [step, setStep] = useState<KioskStep>("welcome");
  const [flow, setFlow] = useState<KioskFlow | null>(null);

  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [nationality, setNationality] = useState<Nationality | null>(null);

  const [nationalId, setNationalId] = useState("");
  const [mobile, setMobile] = useState("");
  const [hasSurgeryHistory, setHasSurgeryHistory] = useState<boolean | null>(null);

  const [appointmentId, setAppointmentId] = useState<number | null>(null);
  const [appointmentNumber, setAppointmentNumber] = useState<number | null>(null);
  const [appointmentDate, setAppointmentDate] = useState<string | null>(null);
  const [appointmentTime, setAppointmentTime] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // --------------------------------------------------
  // Reset
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
    setAppointmentNumber(null);
    setAppointmentDate(null);
    setAppointmentTime(null);
    setSubmitError(null);
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
  // Progress
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
        items.push({ id: "surgery", label: "سابقه جراحی" });
      }

      items.push({ id: "ticket", label: "چاپ قبض" });
      return items;
    }

    if (currentFlow === "previous") {
      const items: ProgressItem[] = [
        { id: "identity", label: "مشخصات" },
        { id: "lookup", label: "بررسی نوبت" },
      ];

      if (requiresSurgeryHistory) {
        items.push({ id: "surgery", label: "سابقه جراحی" });
      }

      items.push({ id: "ticket", label: "چاپ قبض" });
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
        case "submitting":
        case "print-success":
        case "submit-error":
        case "printing":
          return requiresSurgeryHistory ? 4 : 3;
        default:
          return 0;
      }
    }

    if (currentFlow === "previous") {
      switch (currentStep) {
        case "previous-nationality":
        case "national-id":
        case "mobile":
          return 0;
        case "previous-lookup":
          return 1;
        case "surgery-history":
          return 2;
        case "submitting":
        case "print-success":
        case "submit-error":
        case "printing":
          return requiresSurgeryHistory ? 3 : 2;
        default:
          return 0;
      }
    }

    return 0;
  }

  const requireSurgeryHistory = doctor?.requiresSurgeryHistory ?? false;
  const progressItems = getProgressItems(flow, requireSurgeryHistory);
  const progressIndex = getProgressIndex(step, flow, requireSurgeryHistory);

  const shouldShowProgress =
      step !== "welcome" &&
      step !== "main-choice" &&
      step !== "previous-not-found" &&
      progressItems.length > 0;

  // --------------------------------------------------
  // Handlers
  // --------------------------------------------------

  function handleWelcome() {
    setStep("main-choice");
  }

  function handleNewAppointment() {
    setFlow("new");
    setSpecialty(null);
    setDoctor(null);
    setNationality(null);
    setNationalId("");
    setMobile("");
    setHasSurgeryHistory(null);
    setAppointmentId(null);
    setAppointmentNumber(null);
    setAppointmentDate(null);
    setAppointmentTime(null);
    setSubmitError(null);
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
    setAppointmentNumber(null);
    setAppointmentDate(null);
    setAppointmentTime(null);
    setSubmitError(null);
    setStep("previous-nationality");
  }

  function handleSpecialtySelect(selectedSpecialty: Specialty) {
    setSpecialty(selectedSpecialty);
    setDoctor(null);
    setStep("new-doctor");
  }

  function handleDoctorSelect(selectedDoctor: Doctor) {
    setDoctor(selectedDoctor);
    setNationality(null);
    setNationalId("");
    setMobile("");
    setHasSurgeryHistory(null);
    setStep("new-nationality");
  }

  function handleNationalitySelect(selectedNationality: Nationality) {
    setNationality(selectedNationality);

    if (selectedNationality === "iranian") {
      setMobile("");
      setStep("national-id");
      return;
    }

    setNationalId("");
    setStep("mobile");
  }

  async function finalizeNewAppointment(options: {
    surgeryHistory: boolean | null;
    nationalIdValue?: string;
    mobileValue?: string;
  }) {
    if (!specialty || !doctor || !nationality) {
      setSubmitError("اطلاعات نوبت ناقص است");
      setStep("submit-error");
      return;
    }

    const finalNationalId =
        options.nationalIdValue ?? nationalId;
    const finalMobile = options.mobileValue ?? mobile;

    setHasSurgeryHistory(options.surgeryHistory);
    setSubmitError(null);
    setStep("submitting");

    const result = await createAppointmentApi({
      specialtyId: specialty.id,
      doctorId: doctor.id,
      nationality,
      nationalId: nationality === "iranian" ? finalNationalId : null,
      mobile: nationality === "foreign" ? finalMobile : null,
      hasSurgeryHistory: options.surgeryHistory,
    });

    if (!result.success || !result.data) {
      setSubmitError(result.message ?? "خطا در ثبت نوبت");
      setStep("submit-error");
      return;
    }

    setAppointmentId(result.data.appointmentId);
    setAppointmentNumber(result.data.appointmentNumber);
    setAppointmentDate(result.data.appointmentDate);
    setAppointmentTime(result.data.appointmentTime);
    setStep("print-success");
  }

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

    void finalizeNewAppointment({
      surgeryHistory: null,
      nationalIdValue: nationality === "iranian" ? value : "",
      mobileValue: nationality === "foreign" ? value : "",
    });
  }

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
      case "previous-not-found":
        if (nationality === "iranian") {
          setStep("national-id");
        } else {
          setStep("mobile");
        }
        return;

      case "surgery-history":
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

  function handleCancel() {
    resetKiosk();
  }

  // --------------------------------------------------
  // Render step
  // --------------------------------------------------

  function renderStep() {
    switch (step) {
      case "welcome":
        return (
            <button
                type="button"
                onClick={handleWelcome}
                className="group mx-auto flex min-h-56 w-full max-w-3xl flex-col items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 px-8 py-12 text-center shadow-2xl backdrop-blur-xl transition-all duration-200 active:scale-[0.98] hover:bg-white/15"
            >
              <span className="text-4xl font-bold md:text-5xl">دریافت نوبت</span>
              <span className="mt-5 text-lg text-white/65 md:text-xl">
              برای شروع صفحه را لمس کنید
            </span>
            </button>
        );

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
                    className="flex min-h-52 flex-col items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 p-8 text-center shadow-xl backdrop-blur-xl transition-all active:scale-[0.98] hover:bg-white/15"
                >
                  <span className="text-2xl font-bold md:text-3xl">نوبت قبلی دارم</span>
                  <span className="mt-4 text-base text-white/60 md:text-lg">
                  پیگیری یا دریافت قبض نوبت قبلی
                </span>
                </button>

                <button
                    type="button"
                    onClick={handleNewAppointment}
                    className="flex min-h-52 flex-col items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 p-8 text-center shadow-xl backdrop-blur-xl transition-all active:scale-[0.98] hover:bg-white/15"
                >
                  <span className="text-2xl font-bold md:text-3xl">دریافت نوبت جدید</span>
                  <span className="mt-4 text-base text-white/60 md:text-lg">
                  انتخاب تخصص و پزشک
                </span>
                </button>
              </div>

              <KioskNavigation onBack={handleBack} onCancel={handleCancel} />
            </div>
        );

      case "new-specialty":
        return (
            <SpecialtySelection
                onSelect={handleSpecialtySelect}
                onBack={handleBack}
                onCancel={handleCancel}
            />
        );

      case "new-doctor":
        if (!specialty) return null;
        return (
            <DoctorSelection
                specialty={specialty}
                onSelect={handleDoctorSelect}
                onBack={handleBack}
                onCancel={handleCancel}
            />
        );

      case "previous-nationality":
      case "new-nationality":
        return (
            <NationalitySelection
                onSelect={handleNationalitySelect}
                onBack={handleBack}
                onCancel={handleCancel}
            />
        );

      case "national-id":
        return (
            <NationalIdForm
                value={nationalId}
                onSubmit={handleIdentitySubmit}
                onBack={handleBack}
                onCancel={handleCancel}
            />
        );

      case "mobile":
        return (
            <MobileForm
                value={mobile}
                onSubmit={handleIdentitySubmit}
                onBack={handleBack}
                onCancel={handleCancel}
            />
        );

      case "previous-lookup":
        return (
            <PreviousAppointmentLookup
                identifierLabel={
                  nationality === "iranian" ? "کد ملی" : "شماره موبایل"
                }
                identifier={nationality === "iranian" ? nationalId : mobile}
                onFound={(result) => {
                  if (!result.found || result.appointmentId === null) {
                    setStep("previous-not-found");
                    return;
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
                    setStep("print-success");
                  }
                }}
                onNotFound={() => setStep("previous-not-found")}
                onBack={handleBack}
                onCancel={handleCancel}
            />
        );

      case "previous-not-found":
        return (
            <PreviousAppointmentNotFound
                onBack={handleBack}
                onCancel={handleCancel}
                onNewAppointment={handleNewAppointment}
            />
        );

      case "surgery-history":
        return (
            <SurgeryHistory
                onSelect={(value) => {
                  void finalizeNewAppointment({
                    surgeryHistory: value,
                  });
                }}
                onBack={handleBack}
                onCancel={handleCancel}
            />
        );

      case "submitting":
        return <AppointmentResult status="loading" onHome={resetKiosk} />;

      case "print-success":
        return (
            <AppointmentResult
                status="success"
                appointmentNumber={appointmentNumber}
                appointmentDate={appointmentDate}
                appointmentTime={appointmentTime}
                doctorName={doctor?.displayName}
                specialtyName={specialty?.name}
                onHome={resetKiosk}
            />
        );

      case "submit-error":
        return (
            <AppointmentResult
                status="error"
                message={submitError}
                onRetry={() => {
                  void finalizeNewAppointment({
                    surgeryHistory: hasSurgeryHistory,
                  });
                }}
                onHome={resetKiosk}
            />
        );

      case "printing":
        return (
            <AppointmentResult
                status="loading"
                message="در حال آماده‌سازی چاپ..."
                onHome={resetKiosk}
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

            <div className="flex flex-1 flex-col py-3">
              {/* جای ثابت پروگرس‌بار */}
              <div
                  className={`
                    mx-auto
                    w-full
                    max-w-5xl
                    shrink-0
                    ${shouldShowProgress ? "h-24" : "h-0"}
                  `}
              >
                {shouldShowProgress && (
                    <KioskProgress
                        items={progressItems}
                        activeIndex={Math.min(
                            progressIndex,
                            progressItems.length - 1
                        )}
                    />
                )}
              </div>

              <div className="flex w-full flex-1 items-center justify-center">
                {renderStep()}
              </div>
            </div>
          </div>
        </div>
      </main>
  );
}