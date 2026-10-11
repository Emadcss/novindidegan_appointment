import {
    appointments,
    dailyAppointmentCounters,
    doctors,
    patients,
    specialties,
} from "@/data/kiosk-data";

import {
    isDoctorAvailableNow,
    isDoctorScheduledToday,
} from "@/lib/kiosk/schedule-service";

import type {
    Appointment,
    CreateAppointmentInput, // اگر در types نیست، پایین تعریف شده
    Nationality,
    Patient,
} from "@/types/kiosk";

export type { /* re-export اگر لازم */ };

/** اگر در types/kiosk.ts ندارید، همین را آنجا هم بگذارید */
export type CreateAppointmentInput = {
    specialtyId: number;
    doctorId: number;
    nationality: Nationality;
    nationalId: string | null;
    mobile: string | null;
    hasSurgeryHistory?: boolean | null;
};

/**
 * زمان مرجع کسب‌وکار — Asia/Tehran
 * بعداً می‌تواند از Database NOW() بیاید.
 */
function getTehranNow(): Date {
    return new Date(
        new Date().toLocaleString("en-US", {
            timeZone: "Asia/Tehran",
        })
    );
}

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

function nextId<T extends { id: number }>(items: T[]): number {
    if (items.length === 0) return 1;
    return Math.max(...items.map((item) => item.id)) + 1;
}

/**
 * پیدا کردن یا ساخت بیمار بر اساس کدملی / موبایل
 */
function findOrCreatePatient(input: {
    nationality: Nationality;
    nationalId: string | null;
    mobile: string | null;
}): Patient {
    const existing = patients.find((patient) => {
        if (input.nationalId && patient.nationalId === input.nationalId) {
            return true;
        }
        if (input.mobile && patient.mobile === input.mobile) {
            return true;
        }
        return false;
    });

    if (existing) {
        return existing;
    }

    const patient: Patient = {
        id: nextId(patients),
        nationality: input.nationality,
        nationalId: input.nationalId,
        mobile: input.mobile,
        createdAt: new Date().toISOString(),
    };

    patients.push(patient);
    return patient;
}

/**
 * شماره نوبت بعدی برای تخصص + پزشک + روز
 * (در حافظه؛ بعداً با Transaction دیتابیس Atomic می‌شود)
 */
function getNextAppointmentNumber(input: {
    specialtyId: number;
    doctorId: number;
    date: string;
}): number {
    const counter = dailyAppointmentCounters.find(
        (item) =>
            item.specialtyId === input.specialtyId &&
            item.doctorId === input.doctorId &&
            item.date === input.date
    );

    if (counter) {
        counter.lastNumber += 1;
        return counter.lastNumber;
    }

    const created = {
        id: nextId(dailyAppointmentCounters),
        specialtyId: input.specialtyId,
        doctorId: input.doctorId,
        date: input.date,
        lastNumber: 1,
    };

    dailyAppointmentCounters.push(created);
    return created.lastNumber;
}

/**
 * ایجاد نوبت جدید
 * تاریخ و ساعت فقط از سرور (تهران) می‌آید.
 */
export async function createAppointment(
    input: CreateAppointmentInput
): Promise<Appointment> {
    const {
        specialtyId,
        doctorId,
        nationality,
        nationalId,
        mobile,
        hasSurgeryHistory = null,
    } = input;

    if (!nationalId && !mobile) {
        throw new Error("کد ملی یا شماره موبایل الزامی است");
    }

    const specialty = specialties.find(
        (item) => item.id === specialtyId && item.isActive
    );
    if (!specialty) {
        throw new Error("تخصص معتبر نیست");
    }

    const doctor = doctors.find(
        (item) =>
            item.id === doctorId &&
            item.specialtyId === specialtyId &&
            item.isActive
    );
    if (!doctor) {
        throw new Error("پزشک معتبر نیست");
    }

    const now = getTehranNow();

    if (!isDoctorScheduledToday(doctorId, now)) {
        throw new Error("پزشک برای امروز برنامه حضور ندارد");
    }

    if (!isDoctorAvailableNow(doctorId, now)) {
        throw new Error("در حال حاضر خارج از ساعت حضور پزشک است");
    }

    const appointmentDate = formatDate(now);
    const appointmentTime = formatTime(now);

    const patient = findOrCreatePatient({
        nationality,
        nationalId,
        mobile,
    });

    const appointmentNumber = getNextAppointmentNumber({
        specialtyId,
        doctorId,
        date: appointmentDate,
    });

    const appointment: Appointment = {
        id: nextId(appointments),
        patientId: patient.id,
        specialtyId,
        doctorId,
        appointmentDate,
        appointmentTime,
        appointmentNumber,
        nationality,
        nationalId,
        mobile,
        hasSurgeryHistory,
        status: "booked",
        createdAt: new Date().toISOString(),
    };

    appointments.push(appointment);

    return appointment;
}