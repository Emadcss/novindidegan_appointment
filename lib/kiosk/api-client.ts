export type CreateAppointmentResponse = {
    success: boolean;
    message?: string;
    data?: {
        appointmentId: number;
        appointmentNumber: number;
        appointmentDate: string;
        appointmentTime: string;
    };
};

export async function createAppointmentApi(input: {
    specialtyId: number;
    doctorId: number;
    nationality: "iranian" | "foreign";
    nationalId: string | null;
    mobile: string | null;
    hasSurgeryHistory?: boolean | null;
}): Promise<CreateAppointmentResponse> {
    const res = await fetch("/api/kiosk/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });

    const json = await res.json();
    return json;
}