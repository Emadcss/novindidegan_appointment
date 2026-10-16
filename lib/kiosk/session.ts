import type {
    Doctor,
    KioskFlow,
    KioskStep,
    Nationality,
    PreviousAppointmentSummary,
    Specialty,
} from "@/types/kiosk";

/**
 * وضعیت یک جلسه‌ی کیوسک و ماشین حالت آن.
 * تابع خالص است (بدون React و بدون fetch)، پس بدون مرورگر هم قابل تست است.
 */

/** نوبتی که روی صفحه‌ی نتیجه نمایش داده می‌شود */
export type KioskTicket = {
    id: number;
    number: number;
    date: string;
    time: string;
};

export type KioskState = {
    step: KioskStep;
    flow: KioskFlow | null;
    specialty: Specialty | null;
    doctor: Doctor | null;
    nationality: Nationality | null;
    nationalId: string;
    mobile: string;
    hasSurgeryHistory: boolean | null;
    ticket: KioskTicket | null;
    previousAppointments: PreviousAppointmentSummary[];
    submitError: string | null;
};

export const initialKioskState: KioskState = {
    step: "welcome",
    flow: null,
    specialty: null,
    doctor: null,
    nationality: null,
    nationalId: "",
    mobile: "",
    hasSurgeryHistory: null,
    ticket: null,
    previousAppointments: [],
    submitError: null,
};

export type KioskAction =
    | { type: "reset" }
    | { type: "back" }
    | { type: "welcomeTapped" }
    | { type: "startNew" }
    | { type: "startPrevious" }
    | { type: "specialtySelected"; specialty: Specialty }
    | { type: "doctorSelected"; doctor: Doctor }
    | { type: "nationalitySelected"; nationality: Nationality }
    | { type: "identityEntered"; value: string }
    | { type: "submitStarted"; surgeryHistory: boolean | null }
    | { type: "submitSucceeded"; ticket: KioskTicket }
    | { type: "submitFailed"; message: string }
    | { type: "previousFound"; appointments: PreviousAppointmentSummary[] }
    | { type: "previousNotFound" }
    | { type: "previousSelected"; appointment: PreviousAppointmentSummary };

/** صفحه‌ی ورود مشخصات بر اساس ملیت */
function identityStep(state: KioskState): KioskStep {
    return state.nationality === "iranian" ? "national-id" : "mobile";
}

/** نمایش یک نوبت قبلی (دریافت دوباره‌ی قبض)؛ نوبت جدید نمی‌سازد */
function showTicket(
    state: KioskState,
    item: PreviousAppointmentSummary,
): KioskState {
    return {
        ...state,
        specialty: item.specialty,
        doctor: item.doctor,
        hasSurgeryHistory: item.hasSurgeryHistory,
        ticket: {
            id: item.appointmentId,
            number: item.appointmentNumber,
            date: item.appointmentDate,
            time: item.appointmentTime,
        },
        step: "print-success",
    };
}

function goBack(state: KioskState): KioskState {
    switch (state.step) {
        case "main-choice":
            return { ...state, step: "welcome" };

        case "previous-nationality":
        case "new-specialty":
            return { ...state, step: "main-choice" };

        case "new-doctor":
            return { ...state, doctor: null, step: "new-specialty" };

        case "new-nationality":
            return { ...state, nationality: null, step: "new-doctor" };

        case "national-id":
        case "mobile":
            return {
                ...state,
                step:
                    state.flow === "previous"
                        ? "previous-nationality"
                        : "new-nationality",
            };

        // lookup خودکار اجرا می‌شود؛ پس «بازگشت» به فرم مشخصات می‌رود
        case "previous-lookup":
        case "previous-select":
        case "previous-not-found":
        case "surgery-history":
            return { ...state, step: identityStep(state) };

        default:
            return state;
    }
}

export function kioskReducer(
    state: KioskState,
    action: KioskAction,
): KioskState {
    switch (action.type) {
        case "reset":
            return initialKioskState;

        case "back":
            return goBack(state);

        case "welcomeTapped":
            return { ...state, step: "main-choice" };

        case "startNew":
            return { ...initialKioskState, flow: "new", step: "new-specialty" };

        case "startPrevious":
            return {
                ...initialKioskState,
                flow: "previous",
                step: "previous-nationality",
            };

        case "specialtySelected":
            return {
                ...state,
                specialty: action.specialty,
                doctor: null,
                step: "new-doctor",
            };

        case "doctorSelected":
            return {
                ...state,
                doctor: action.doctor,
                nationality: null,
                nationalId: "",
                mobile: "",
                hasSurgeryHistory: null,
                step: "new-nationality",
            };

        case "nationalitySelected":
            return action.nationality === "iranian"
                ? {
                    ...state,
                    nationality: "iranian",
                    mobile: "",
                    step: "national-id",
                }
                : {
                    ...state,
                    nationality: "foreign",
                    nationalId: "",
                    step: "mobile",
                };

        case "identityEntered": {
            const next: KioskState =
                state.nationality === "iranian"
                    ? { ...state, nationalId: action.value, mobile: "" }
                    : { ...state, mobile: action.value, nationalId: "" };

            if (state.flow === "previous") {
                return { ...next, step: "previous-lookup" };
            }

            if (state.doctor?.requiresSurgeryHistory) {
                return { ...next, step: "surgery-history" };
            }

            // پزشک سؤال جراحی ندارد: صفحه همان می‌ماند تا ثبت نوبت (submit) آغاز شود
            return next;
        }

        case "submitStarted":
            return {
                ...state,
                hasSurgeryHistory: action.surgeryHistory,
                submitError: null,
                step: "submitting",
            };

        case "submitSucceeded":
            return { ...state, ticket: action.ticket, step: "print-success" };

        case "submitFailed":
            return {
                ...state,
                submitError: action.message,
                step: "submit-error",
            };

        case "previousFound": {
            const [first, ...others] = action.appointments;

            if (!first) {
                return { ...state, step: "previous-not-found" };
            }

            // یک نوبت: مستقیم نمایش؛ چند نوبت: بیمار انتخاب می‌کند
            if (others.length === 0) {
                return showTicket(state, first);
            }

            return {
                ...state,
                previousAppointments: action.appointments,
                step: "previous-select",
            };
        }

        case "previousNotFound":
            return { ...state, step: "previous-not-found" };

        case "previousSelected":
            return showTicket(state, action.appointment);

        default:
            return state;
    }
}
