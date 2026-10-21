"use client";

import { useReducer } from "react";

import IdleWarning from "@/components/ui/IdleWarning";
import KioskProgress from "@/components/ui/KioskProgress";
import KioskLayout from "@/components/kiosk/KioskLayout";
import KioskStepView from "@/components/kiosk/KioskStepView";
import { useAutoClose } from "@/components/kiosk/hooks/useAutoClose";
import { useHeartbeat } from "@/components/kiosk/hooks/useHeartbeat";
import { useIdleTimeout } from "@/components/kiosk/hooks/useIdleTimeout";
import { useSubmitAppointment } from "@/components/kiosk/hooks/useSubmitAppointment";
import { getKioskProgress } from "@/components/kiosk/progress";
import {
    IDLE_WARNING_BEFORE_MS,
    INACTIVITY_TIMEOUT_MS,
    RESULT_AUTO_CLOSE_MS,
} from "@/lib/kiosk/config";
import { initialKioskState, kioskReducer } from "@/lib/kiosk/session";

/** فقط ترکیب: state در reducer، تایمرها و ثبت نوبت در hookها، ظاهر در KioskLayout */
export default function Kiosk() {
    const [state, dispatch] = useReducer(kioskReducer, initialKioskState);

    const { submit, invalidate } = useSubmitAppointment(state, dispatch);

    const idle = useIdleTimeout({
        active: state.step !== "welcome",
        resetKey: state.step,
        onTimeout: () => reset(),
        timeoutMs: INACTIVITY_TIMEOUT_MS,
        warnBeforeMs: IDLE_WARNING_BEFORE_MS,
    });

    /** تنها راه پاک کردن جلسه؛ همه‌ی مسیرها (انصراف، تایمرها) از همین می‌گذرند */
    function reset() {
        invalidate();
        idle.dismissWarning();
        dispatch({ type: "reset" });
    }

    useAutoClose(state.step === "print-success", RESULT_AUTO_CLOSE_MS, reset);

    // نبض پایش: «زنده‌ام» به سرور (فقط برای کیوسک جفت‌شده اثر دارد)
    useHeartbeat(state.step)

    const progress = getKioskProgress(
        state.step,
        state.flow,
        state.doctor?.requiresSurgeryHistory ?? false,
    );

    return (
        <KioskLayout
            compact={state.step !== "welcome"}
            progress={
                progress.visible ? (
                    <KioskProgress items={progress.items} activeIndex={progress.activeIndex} />
                ) : null
            }
            overlay={
                idle.warning ? (
                    <IdleWarning
                        seconds={IDLE_WARNING_BEFORE_MS / 1000}
                        onContinue={idle.continueSession}
                        onCancel={reset}
                    />
                ) : null
            }
        >
            <KioskStepView state={state} dispatch={dispatch} submit={submit} reset={reset} />
        </KioskLayout>
    );
}
