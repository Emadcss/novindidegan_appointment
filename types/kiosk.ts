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
    | "previous-select"
    | "previous-not-found"
    | "surgery-history"
    | "printing"
    | "submitting"
    | "print-success"
    | "submit-error";

export type Specialty = {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
    isActive: boolean;
    sortOrder: number;
};

export type SpecialtyWithAvailability = Specialty & {
    /** پزشکان فعال و حاضر در همین لحظه */
    availableDoctorCount: number;
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

/** هویت (کد ملی/موبایل) فقط به‌صورت hash و رمزنگاری‌شده در دیتابیس است و در این تایپ نمی‌آید */
export type Patient = {
    id: number;
    nationality: Nationality;
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
    /** تاریخ روز کاری — Asia/Tehran — توسط سرور */
    appointmentDate: string;
    /** ساعت ثبت/نوبت — Asia/Tehran — توسط سرور */
    appointmentTime: string;
    appointmentNumber: number;
    hasSurgeryHistory: boolean | null;
    status: AppointmentStatus;
    /** شناسه‌ی یکتای درخواست ثبت (برای جلوگیری از ثبت تکراری) */
    requestId?: string | null;
    createdAt: string;
};

export type CreateAppointmentInput = {
    specialtyId: number;
    doctorId: number;
    nationality: Nationality;
    nationalId: string | null;
    mobile: string | null;
    hasSurgeryHistory?: boolean | null;
    requestId?: string | null;
};

export type DailyAppointmentCounter = {
    id: number;
    specialtyId: number;
    doctorId: number;
    date: string;
    lastNumber: number;
};

/** خلاصه‌ی یک نوبت فعال امروز برای نمایش و دریافت دوباره‌ی قبض */
export type PreviousAppointmentSummary = {
    appointmentId: number;
    appointmentNumber: number;
    appointmentDate: string;
    appointmentTime: string;
    specialty: Specialty | null;
    doctor: Doctor | null;
    hasSurgeryHistory: boolean | null;
};

export type PreviousAppointmentLookupResult = {
    found: boolean;
    /** نوبت‌های فعال امروز، جدیدترین اول */
    appointments: PreviousAppointmentSummary[];
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