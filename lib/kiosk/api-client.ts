import type { PreviousAppointmentLookupResult } from "@/types/kiosk";

export type CreateAppointmentApiInput = {
    specialtyId: number,
    doctorId: number,
    nationality: "iranian" | "foreign";
    nationalId: string | null;
    mobile: string | null;
    hasSurgeryHistory?: boolean | null;
    /** شناسه‌ی یکتای درخواست؛ تلاش دوباره همان را می‌فرستد */
    requestId?: string;
};

export type CreateAppointmentApiResponse = {
    success: boolean;
    code?: string;
    message?: string;
    data?: {
        appointmentId: number;
        appointmentNumber: number;
        appointmentDate: string;
        appointmentTime: string;
    };
};

export async function createAppointmentApi(
    input: CreateAppointmentApiInput
): Promise<CreateAppointmentApiResponse> {
    try {
        const res = await fetch("/api/kiosk/appointments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });

        const json = (await res.json()) as CreateAppointmentApiResponse;
        return json;
    } catch {
        return {
            success: false,
            message: "ارتباط با سرور برقرار نشد"
        };
    }
}

/**
 * crypto.randomUUID فقط در زمینه‌ی امن (HTTPS یا localhost) وجود دارد؛
 * کیوسک روی http://IP-شبکه ممکن است آن را نداشته باشد، پس جایگزین داریم.
 */
export function createRequestId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }

    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export type LookupPreviousAppointmentApiInput = {
    nationality: "iranian" | "foreign";
    nationalId: string | null;
    mobile: string | null;
};

export type LookupPreviousAppointmentApiResponse = {
    success: boolean;
    code?: string;
    message?: string;
    data?: PreviousAppointmentLookupResult;
};

export async function lookupPreviousAppointmentApi(
    input: LookupPreviousAppointmentApiInput
): Promise<LookupPreviousAppointmentApiResponse> {
    try {
        const res = await fetch("/api/kiosk/appointments/lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });

        return (await res.json()) as LookupPreviousAppointmentApiResponse;
    } catch {
        return {
            success: false,
            message: "ارتباط با سرور برقرار نشد",
        };
    }
}
