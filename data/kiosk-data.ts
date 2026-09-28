import  type {
    Appointment,
    DailyAppointmentCounter,
    Doctor,
    DoctorSchedule,
    Patient,
    ScheduleException,
    Specialty,
} from "@/types/kiosk";
import {fail} from "node:assert";

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
    {
        id: 1,
        doctorId: 1,
        weekday: 6,
        startTime: "08:00",
        endTime: "12:00",
        validFrom: "2026-01-01",
        validUntil: null,
        isActive: true,
    },
    {
        id: 2,
        doctorId: 1,
        weekday: 1,
        startTime: "14:00",
        endTime: "18:00",
        validFrom: "2026-01-01",
        validUntil: null,
        isActive: true,
    },

    {
        id: 3,
        doctorId: 2,
        weekday: 6,
        startTime: "14:00",
        endTime: "18:00",
        validFrom: "2026-01-01",
        validUntil: null,
        isActive: true,
    },

    {
        id: 4,
        doctorId: 3,
        weekday: 2,
        startTime: "09:00",
        endTime: "13:00",
        validFrom: "2026-01-01",
        validUntil: null,
        isActive: true,
    },

    {
        id: 5,
        doctorId: 4,
        weekday: 3,
        startTime: "10:00",
        endTime: "14:00",
        validFrom: "2026-01-01",
        validUntil: null,
        isActive: true,
    },

    {
        id: 6,
        doctorId: 5,
        weekday: 4,
        startTime: "15:00",
        endTime: "19:00",
        validFrom: "2026-01-01",
        validUntil: null,
        isActive: true,
    },
];

export const scheduleExceptions: ScheduleException[] = [];

export const patients: Patient[] = [];

export const appointments: Appointment[] = [];

export const dailyAppointmentCounters: DailyAppointmentCounter[] = [];