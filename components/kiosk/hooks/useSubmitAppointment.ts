"use client";

import { useCallback, useRef, type Dispatch } from "react";

import { createAppointmentApi, createRequestId } from "@/lib/kiosk/api-client";
import type { KioskAction, KioskState } from "@/lib/kiosk/session";

export type SubmitOptions = {
    surgeryHistory: boolean | null;
    /** مقدار تازه‌ی ورودی (state هنوز به‌روز نشده است) */
    nationalId?: string;
    mobile?: string;
};

export type SubmitFn = (options: SubmitOptions) => Promise<void>;

/**
 * ثبت نوبت جدید.
 * - sessionRef: با هر ریست زیاد می‌شود تا پاسخ دیرهنگام سرور به کاربر بعدی نرسد.
 * - requestIdRef: «تلاش دوباره» همان شناسه را می‌فرستد تا نوبت تکراری ساخته نشود.
 * invalidate را هنگام ریست جلسه صدا بزنید.
 */
export function useSubmitAppointment(
    state: KioskState,
    dispatch: Dispatch<KioskAction>,
) {
    const sessionRef = useRef(0);
    const requestIdRef = useRef<string | null>(null);

    const invalidate = useCallback(() => {
        sessionRef.current += 1;
        requestIdRef.current = null;
    }, []);

    const submit: SubmitFn = async (options) => {
        const { flow, specialty, doctor, nationality } = state;

        // ثبت نوبت جدید فقط در جریان «نوبت جدید» مجاز است
        if (flow !== "new") return;

        if (!specialty || !doctor || !nationality) {
            dispatch({ type: "submitFailed", message: "اطلاعات نوبت ناقص است" });
            return;
        }

        const nationalId = options.nationalId ?? state.nationalId;
        const mobile = options.mobile ?? state.mobile;

        dispatch({ type: "submitStarted", surgeryHistory: options.surgeryHistory });

        const sessionId = sessionRef.current;
        requestIdRef.current ??= createRequestId();

        const result = await createAppointmentApi({
            specialtyId: specialty.id,
            doctorId: doctor.id,
            nationality,
            nationalId: nationality === "iranian" ? nationalId : null,
            mobile: nationality === "foreign" ? mobile : null,
            hasSurgeryHistory: options.surgeryHistory,
            requestId: requestIdRef.current ?? undefined,
        });

        // کاربر انصراف داده یا کیوسک ریست شده است؛ نتیجه را نمایش نده
        if (sessionId !== sessionRef.current) return;

        if (!result.success || !result.data) {
            dispatch({
                type: "submitFailed",
                message: result.message ?? "خطا در ثبت نوبت",
            });
            return;
        }

        dispatch({
            type: "submitSucceeded",
            ticket: {
                id: result.data.appointmentId,
                number: result.data.appointmentNumber,
                date: result.data.appointmentDate,
                time: result.data.appointmentTime,
            },
        });
    };

    return { submit, invalidate };
}
