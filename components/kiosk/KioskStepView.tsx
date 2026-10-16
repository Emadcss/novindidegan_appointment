"use client";

import type { Dispatch } from "react";

import AppointmentResult from "@/components/kiosk/AppointmentResult";
import DoctorSelection from "@/components/kiosk/DoctorSelection";
import MobileForm from "@/components/kiosk/MobileForm";
import NationalIdForm from "@/components/kiosk/NationalIdForm";
import NationalitySelection from "@/components/kiosk/NationalitySelection";
import PreviousAppointmentLookup from "@/components/kiosk/PreviousAppointmentLookup";
import PreviousAppointmentNotFound from "@/components/kiosk/PreviousAppointmentNotFound";
import PreviousAppointmentSelection from "@/components/kiosk/PreviousAppointmentSelection";
import SpecialtySelection from "@/components/kiosk/SpecialtySelection";
import SurgeryHistory from "@/components/kiosk/SurgeryHistory";
import type { SubmitFn } from "@/components/kiosk/hooks/useSubmitAppointment";
import Button from "@/components/ui/Button";
import StatusPanel from "@/components/ui/StatusPanel";
import MainChoiceStep from "@/components/kiosk/steps/MainChoiceStep";
import WelcomeStep from "@/components/kiosk/steps/WelcomeStep";
import { RESULT_AUTO_CLOSE_MS } from "@/lib/kiosk/config";
import type { KioskAction, KioskState } from "@/lib/kiosk/session";

type KioskStepViewProps = {
    state: KioskState;
    dispatch: Dispatch<KioskAction>;
    submit: SubmitFn;
    /** پاک کردن همه‌چیز و بازگشت به صفحه‌ی شروع */
    reset: () => void;
};

/** هر مرحله‌ی ماشین حالت را به کامپوننت خودش وصل می‌کند */
export default function KioskStepView({
                                          state,
                                          dispatch,
                                          submit,
                                          reset,
                                      }: KioskStepViewProps) {
    const back = () => dispatch({ type: "back" });

    function handleIdentity(value: string) {
        dispatch({ type: "identityEntered", value });

        // پزشک سؤال جراحی ندارد: همین‌جا ثبت می‌شود
        if (state.flow === "new" && !state.doctor?.requiresSurgeryHistory) {
            void submit({
                surgeryHistory: null,
                nationalId: state.nationality === "iranian" ? value : "",
                mobile: state.nationality === "foreign" ? value : "",
            });
        }
    }

    switch (state.step) {
        case "welcome":
            return <WelcomeStep onStart={() => dispatch({ type: "welcomeTapped" })} />;

        case "main-choice":
            return (
                <MainChoiceStep
                    onNew={() => dispatch({ type: "startNew" })}
                    onPrevious={() => dispatch({ type: "startPrevious" })}
                    onBack={back}
                    onCancel={reset}
                />
            );

        case "new-specialty":
            return (
                <SpecialtySelection
                    onSelect={(specialty) =>
                        dispatch({ type: "specialtySelected", specialty })
                    }
                    onBack={back}
                    onCancel={reset}
                />
            );

        case "new-doctor":
            if (!state.specialty) {
                console.error("مرحله‌ی پزشک بدون تخصص انتخاب‌شده. state:", state);
                return (
                    <StatusPanel
                        tone="error"
                        title="تخصص انتخاب‌شده پیدا نشد"
                        description="لطفاً دوباره تخصص را انتخاب کنید."
                    >
                        <Button onClick={back}>بازگشت</Button>
                    </StatusPanel>
                );
            }
            return (
                <DoctorSelection
                    specialty={state.specialty}
                    onSelect={(doctor) => dispatch({ type: "doctorSelected", doctor })}
                    onBack={back}
                    onCancel={reset}
                />
            );

        case "previous-nationality":
        case "new-nationality":
            return (
                <NationalitySelection
                    onSelect={(nationality) =>
                        dispatch({ type: "nationalitySelected", nationality })
                    }
                    onBack={back}
                    onCancel={reset}
                />
            );

        case "national-id":
            return (
                <NationalIdForm
                    value={state.nationalId}
                    onSubmit={handleIdentity}
                    onBack={back}
                    onCancel={reset}
                />
            );

        case "mobile":
            return (
                <MobileForm
                    value={state.mobile}
                    onSubmit={handleIdentity}
                    onBack={back}
                    onCancel={reset}
                />
            );

        case "previous-lookup":
            return (
                <PreviousAppointmentLookup
                    nationality={state.nationality === "foreign" ? "foreign" : "iranian"}
                    identifier={state.nationality === "iranian" ? state.nationalId : state.mobile}
                    onFound={(result) =>
                        dispatch({ type: "previousFound", appointments: result.appointments })
                    }
                    onNotFound={() => dispatch({ type: "previousNotFound" })}
                    onBack={back}
                    onCancel={reset}
                />
            );

        case "previous-select":
            return (
                <PreviousAppointmentSelection
                    appointments={state.previousAppointments}
                    onSelect={(appointment) =>
                        dispatch({ type: "previousSelected", appointment })
                    }
                    onBack={back}
                    onCancel={reset}
                />
            );

        case "previous-not-found":
            return (
                <PreviousAppointmentNotFound
                    onBack={back}
                    onCancel={reset}
                    onNewAppointment={() => dispatch({ type: "startNew" })}
                />
            );

        case "surgery-history":
            return (
                <SurgeryHistory
                    onSelect={(value) => void submit({ surgeryHistory: value })}
                    onBack={back}
                    onCancel={reset}
                />
            );

        case "submitting":
            return <AppointmentResult status="loading" onHome={reset} />;

        case "printing":
            return (
                <AppointmentResult
                    status="loading"
                    message="در حال آماده‌سازی چاپ..."
                    onHome={reset}
                />
            );

        case "print-success":
            return (
                <AppointmentResult
                    status="success"
                    appointmentNumber={state.ticket?.number ?? null}
                    appointmentDate={state.ticket?.date ?? null}
                    appointmentTime={state.ticket?.time ?? null}
                    doctorName={state.doctor?.displayName}
                    specialtyName={state.specialty?.name}
                    autoCloseMs={RESULT_AUTO_CLOSE_MS}
                    onHome={reset}
                />
            );

        case "submit-error":
            return (
                <AppointmentResult
                    status="error"
                    message={state.submitError}
                    onRetry={() => void submit({ surgeryHistory: state.hasSurgeryHistory })}
                    onHome={reset}
                />
            );

        default:
            console.error("مرحله‌ی ناشناخته:", state.step);
            return (
                <StatusPanel
                    tone="error"
                    title="خطای داخلی"
                    description="دوباره از ابتدا شروع کنید."
                >
                    <Button onClick={reset}>شروع دوباره</Button>
                </StatusPanel>
            );
    }
}
