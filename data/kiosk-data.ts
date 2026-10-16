import type {
    Doctor,
    DoctorSchedule,
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

/** ساعت حضور هفتگی هر پزشک (همه‌ی روزهای هفته؛ داده‌ی نمونه) */
const weeklyHours: { doctorId: number; startTime: string; endTime: string }[] = [
    { doctorId: 1, startTime: "08:00", endTime: "20:00" },
    { doctorId: 2, startTime: "14:00", endTime: "18:00" },
    { doctorId: 3, startTime: "09:00", endTime: "18:00" },
    { doctorId: 4, startTime: "09:00", endTime: "13:00" },
    { doctorId: 5, startTime: "10:00", endTime: "14:00" },
];

// شناسه‌ها خودکار و یکتا ساخته می‌شوند (۷ روز × هر پزشک)
export const doctorSchedules: DoctorSchedule[] = weeklyHours.flatMap(
    ({ doctorId, startTime, endTime }, doctorIndex) =>
        [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
            id: doctorIndex * 7 + weekday + 1,
            doctorId,
            weekday,
            startTime,
            endTime,
            validFrom: "2026-01-01",
            validUntil: null,
            isActive: true,
        })),
);

/** استثناهای تاریخ‌دار (غیبت یا ساعت جایگزین) */
export const scheduleExceptions: ScheduleException[] = [];
