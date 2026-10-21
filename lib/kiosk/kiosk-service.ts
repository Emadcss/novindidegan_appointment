import {
    getDoctor,
    getSpecialty,
    listDoctors,
    listSpecialties,
} from "@/lib/db/repositories";
import { isDoctorAvailableNow } from "@/lib/kiosk/schedule-service";
import { getServerNow } from "@/lib/time/server-clock";

import type {
    Doctor,
    Specialty,
    SpecialtyWithAvailability,
} from "@/types/kiosk";

/**
 * تمام تخصص‌های فعال مرکز
 */
export async function getActiveSpecialties(): Promise<Specialty[]> {
    return (await listSpecialties()).filter((specialty) => specialty.isActive);
}

/** پزشکانی که همین لحظه در بازهٔ حضور مؤثر خود هستند. */
async function filterScheduledToday(
    doctors: Doctor[],
    date: Date,
): Promise<Doctor[]> {
    const flags = await Promise.all(
        doctors.map((doctor) => isDoctorAvailableNow(doctor.id, date)),
    );

    return doctors.filter((_, index) => flags[index]);
}

/**
 * پزشکان یک تخصص که همین لحظه در ساعت حضور خود هستند.
 */
export async function getAvailableDoctorsForSpecialty(
    specialtyId: number,
    date: Date = getServerNow(),
): Promise<Doctor[]> {
    const candidates = (await listDoctors()).filter(
        (doctor) => doctor.specialtyId === specialtyId && doctor.isActive,
    );

    return filterScheduledToday(candidates, date);
}

/**
 * تخصص‌هایی که حداقل یک پزشک حاضر دارند، به‌همراه تعداد پزشکان حاضر.
 */
export async function getAvailableSpecialtiesForDate(
    date: Date = getServerNow(),
): Promise<SpecialtyWithAvailability[]> {
    const activeDoctors = (await listDoctors()).filter((doctor) => doctor.isActive);
    const availableDoctors = await filterScheduledToday(activeDoctors, date);
    const specialties = await getActiveSpecialties();

    return specialties
        .map((specialty) => ({
            ...specialty,
            availableDoctorCount: availableDoctors.filter(
                (doctor) => doctor.specialtyId === specialty.id,
            ).length,
        }))
        .filter((specialty) => specialty.availableDoctorCount > 0);
}

export async function getSpecialtyById(
    specialtyId: number,
): Promise<Specialty | null> {
    return getSpecialty(specialtyId);
}

export async function getDoctorById(doctorId: number): Promise<Doctor | null> {
    return getDoctor(doctorId);
}
