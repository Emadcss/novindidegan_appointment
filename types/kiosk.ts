export type Nationality = "iranian" | "foreign";

export type KioskFlow = "previous" | "new";

export type KioskStep =
    | "welcome"
    | "main-choice"
    | "previous-nationality"
    | "new-specialty"
    | "new-doctor"
    | "new-nationality"
    | "national-id"
    | "mobile"
    | "previous-lookup"
    | "previous-not-found"
    | "surgery-history"
    | "printing";

export type Specialty = {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
    isActive: boolean;
    sortOrder: number;
};

export type Doctor = {
    id: number;
    specialtyId: number;
    firstName: string;
    lastName: string;
    displayName: string;
    requiresSurgeryHistory: boolean;
    isActive: boolean;
    sortOrder: number;
};

export type DoctorSchedule = {
    id: number;
    doctorId: number;
    weekday: number;
    startTime: string;
    endTime: string;
    validFrom: string;
    validUntil: string | null;
    isActive: boolean;
};

export type ScheduleExceptionType =
    | "disabled"
    | "override";

export type ScheduleException = {
    id: number;
    doctorId: number;
    date: string;
    type: ScheduleExceptionType;
    startTime: string | null;
    endTime: string | null;
    reason: string | null;
    isActive: boolean;
};

export type Patient = {
    id: number;
    nationality: Nationality;
    nationalId: string | null;
    mobile: string | null;
    createdAt: string;
};

export type AppointmentStatus =
    | "booked"
    | "completed"
    | "cancelled"
    | "no_show";

export type Appointment = {
    id: number;
    patientId: number;
    specialtyId: number;
    doctorId: number;
    appointmentDate: string;
    appointmentNumber: number;
    nationality: Nationality;
    nationalId: string | null;
    mobile: string | null;
    hasSurgeryHistory: boolean | null;
    status: AppointmentStatus;
    createdAt: string;
};

export type DailyAppointmentCounter = {
    id: number;
    specialtyId: number;
    doctorId: number;
    date: string;
    lastNumber: number;
};

export type PreviousAppointmentLookupResult = {
    found: boolean;
    appointmentId: number | null;
    specialtyId: number | null;
    doctorId: number | null;
    requiresSurgeryHistory: boolean;
    hasSurgeryHistory: boolean | null;
};

export type KioskSession = {
    flow: KioskFlow | null;

    specialtyId: number | null;
    doctorId: number | null;

    nationality: Nationality | null;

    nationalId: string;
    mobile: string;

    hasSurgeryHistory: boolean | null;

    appointmentId: number | null;
};