export type CreateAppointmentApiInput = {
    specialtyId: number,
    doctorId: number,
    nationality: "iranian" | "foreign";
    nationalId: string | null;
    mobile: string | null;
    hasSurgeryHistory?: boolean | null;
};

export type CreateAppointmentApiResponse = {
    success: boolean;
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