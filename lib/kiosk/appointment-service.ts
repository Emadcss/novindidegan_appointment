import {
    appointments,
    doctors,
    patients,
    specialties,
} from "@/data/kiosk-data";

import {
    isDoctorAvailableNow,
    isDoctorScheduledToday,
} from "@/lib/kiosk/schedule-service";

import { getNextAppointmentNumber } from "@/lib/kiosk/queue-service";
import { getServerNow } from "@/lib/time/server-clock";
import {
    getTehranDateKey,
    getTehranTimeWithoutSeconds
} from "@/lib/time/tehran-time";

import type {
    Appointment,
    Nationality,
    Patient,
} from "@/types/kiosk";

/** اگر در types/kiosk.ts ندارید، همین را آنجا هم بگذارید */
export type CreateAppointmentInput = {
    specialtyId: number;
    doctorId: number;
    nationality: Nationality;
    nationalId: string | null;
    mobile: string | null;
    hasSurgeryHistory?: boolean | null;
};



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

    const now = getServerNow();

    if (!isDoctorScheduledToday(doctorId, now)) {
        throw new Error("پزشک برای امروز برنامه حضور ندارد");
    }

    if (!isDoctorAvailableNow(doctorId, now)) {
        throw new Error("در حال حاضر خارج از ساعت حضور پزشک است");
    }

    const appointmentDate = getTehranDateKey(now);
    const appointmentTime = getTehranTimeWithoutSeconds(now);

    const patient = findOrCreatePatient({
        nationality,
        nationalId,
        mobile,
    });

    const appointmentNumber = getNextAppointmentNumber(
        specialtyId,
        doctorId,
        now,
    );

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