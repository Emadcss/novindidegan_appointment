import {
    doctors,
    specialties,
} from "@/data/kiosk-data";

import { isDoctorAvailableNow } from "@/lib/kiosk/schedule-service";

import type {
    Doctor,
    Specialty,
} from "@/types/kiosk";

import { getServerNow } from "@/lib/time/server-clock";

/**
 * تمام تخصص‌های فعال مرکز
 */
export function getActiveSpecialties(): Specialty[] {
    return specialties
        .filter((specialty) => specialty.isActive)
        .sort(
            (a, b) =>
                a.sortOrder - b.sortOrder
        );
}

/**
 * پزشکان یک تخصص که در تاریخ مشخص
 * برنامه کاری دارند.
 */
export function getAvailableDoctorsForSpecialty(
    specialtyId: number,
    date: Date = getServerNow(),
): Doctor[] {
    return doctors
        .filter((doctor) => {
            if (doctor.specialtyId !== specialtyId) {
                return false;
            }

            if (!doctor.isActive) {
                return false;
            }

            return isDoctorAvailableNow(
                doctor.id,
                date
            );
        })
        .sort(
            (a, b) =>
                a.sortOrder - b.sortOrder
        );
}

export function getAvailableSpecialtiesForDate(
    date: Date = getServerNow(),
): Specialty[] {
    return specialties
        .filter((specialty) => {
            if (!specialty.isActive) {
                return false;
            }

            return doctors.some((doctor) => {
                if (doctor.specialtyId !== specialty.id) {
                    return false;
                }

                if (!doctor.isActive) {
                    return false;
                }

                return isDoctorAvailableNow(
                    doctor.id,
                    date
                );
            });
        })
    .sort(
        (a, b) =>
            a.sortOrder - b.sortOrder
    );
}

/**
 * پیدا کردن تخصص
 */
export function getSpecialtyById(
    specialtyId: number
): Specialty | null {
    return (
        specialties.find(
            (specialty) =>
                specialty.id === specialtyId
        ) ?? null
    );
}

/**
 * پیدا کردن پزشک
 */
export function getDoctorById(
    doctorId: number
): Doctor | null {
    return (
        doctors.find(
            (doctor) =>
                doctor.id === doctorId
        ) ?? null
    );
}