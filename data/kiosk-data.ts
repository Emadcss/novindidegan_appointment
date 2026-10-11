import  type {
    Appointment,
    DailyAppointmentCounter,
    Doctor,
    DoctorSchedule,
    Patient,
    ScheduleException,
    Specialty,
} from "@/types/kiosk";


export const specialties: Specialty[] = [
    {
        id: 1,
        name: "چشم پزشکی",
        slug: "ophthalmology",
        icon: "eye",
        isActive: true,
        sortOrder: 1,
    },
    {
        id: 2,
        name: "پوست و مو",
        slug: "dermatology",
        icon: "skin",
        isActive: true,
        sortOrder: 2,
    },
    {
        id: 3,
        name: "قلب و عروق",
        slug: "cardiology",
        icon: "heart",
        isActive: true,
        sortOrder: 3,
    },
    {
        id: 4,
        name: "زیبایی",
        slug: "beauty",
        icon: "beauty",
        isActive: true,
        sortOrder: 4,
    },
];

export const doctors: Doctor[] = [
    {
        id: 1,
        specialtyId: 1,
        firstName: "احمد",
        lastName: "احمدی",
        displayName: "دکتر احمد احمدی",
        isActive: true,
        requiresSurgeryHistory: true,
        sortOrder: 1,
    },
    {
        id: 2,
        specialtyId: 1,
        firstName: "محمد",
        lastName: "محمدی",
        displayName: "دکتر محمد محمدی",
        requiresSurgeryHistory: false,
        isActive: true,
        sortOrder: 2,
    },
    {
        id: 3,
        specialtyId: 2,
        firstName: "رضا",
        lastName: "رضایی",
        displayName: "دکتر رضا رضایی",
        requiresSurgeryHistory: true,
        isActive: true,
        sortOrder: 1,
    },
    {
        id: 4,
        specialtyId: 3,
        firstName: "علی",
        lastName: "کریمی",
        displayName: "دکتر علی کریمی",
        requiresSurgeryHistory: false,
        isActive: true,
        sortOrder: 1,
    },
    {
        id: 5,
        specialtyId: 4,
        firstName: "سارا",
        lastName: "موسوی",
        displayName: "دکتر سارا موسوی",
        requiresSurgeryHistory: false,
        isActive: true,
        sortOrder: 1,
    },
];

export const doctorSchedules: DoctorSchedule[] = [
    ...[0, 1, 2, 3, 4, 5, 6].map((weekday, index) => ({
        id: index + 1,
        doctorId: 1,
        weekday,
        startTime: "08:00",
        endTime: "20:00",
        validFrom: "2026-01-01",
        validUntil: null,
        isActive: true,
    })),

    ...[0, 1, 2, 3, 4, 5, 6].map((weekday, index) => ({
        id: index + 8,
        doctorId: 2,
        weekday,
        startTime: "14:00",
        endTime: "18:00",
        validFrom: "2026-01-01",
        validUntil: null,
        isActive: true,
    })),

    ...[0, 1, 2, 3, 4, 5, 6].map((weekday, index) => ({
        id: index + 15,
        doctorId: 3,
        weekday,
        startTime: "09:00",
        endTime: "18:00",
        validFrom: "2026-01-01",
        validUntil: null,
        isActive: true,
    })),

    ...[0, 1, 2, 3, 4, 5, 6].map((weekday, index) => ({
        id: index + 22,
        doctorId: 4,
        weekday,
        startTime: "09:00",
        endTime: "13:00",
        validFrom: "2026-01-01",
        validUntil: null,
        isActive: true,
    })),

    ...[0, 1, 2, 3, 4, 5, 6].map((weekday, index) => ({
        id: index + 29,
        doctorId: 5,
        weekday,
        startTime: "10:00",
        endTime: "14:00",
        validFrom: "2026-01-01",
        validUntil: null,
        isActive: true,
    })),

    ...[0, 1, 2, 3, 4, 5, 6].map((weekday, index) => ({
        id: index + 32,
        doctorId: 6,
        weekday,
        startTime: "15:00",
        endTime: "19:00",
        validFrom: "2026-01-01",
        validUntil: null,
        isActive: true,
    })),
];

export const scheduleExceptions: ScheduleException[] = [];

export const patients: Patient[] = [];

export const appointments: Appointment[] = [];

export const dailyAppointmentCounters: DailyAppointmentCounter[] = [];