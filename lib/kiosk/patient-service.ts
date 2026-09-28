import { patients } from "@/data/kiosk-data";
import type { Nationality, Patient } from "@/types/kiosk";

type CreatePatientInput = {
    nationality: Nationality;
    nationalId: string | null;
    mobile: string | null;
}

export function findPatientByNationalId(
    nationalId: string,
): Patient | null {
    return (
        patients.find(
            (patient) => patient.nationalId === nationalId
        ) ?? null
    );
}

export function findPatientByMobile(
    mobile: string,
): Patient | null {
    return (
        patients.find(
            (patient) => patient.mobile === mobile
        ) ?? null
    );
}

export function findPatient(
    nationality: Nationality,
    nationalId: string | null,
    mobile: string | null,
): Patient | null {
    if (nationality === "iranian" && nationalId) {
        return findPatientByNationalId(nationalId);
    }

    if (nationality === "foreign" && mobile) {
        return findPatientByMobile(mobile);
    }

    return null;
}

export function createPatient(
    input: CreatePatientInput,
): Patient {
    const existingPatient = findPatient(
        input.nationality,
        input.nationalId,
        input.mobile,
    );

    if (existingPatient) {
        return existingPatient;
    }

    const nextId =
        patients.length > 0
            ? Math.max(...patients.map((patient) => patient.id)) + 1
            : 1;

    const patient: Patient = {
        id: nextId,
        nationality: input.nationality,
        nationalId: input.nationalId,
        mobile: input.mobile,
        createdAt: new Date().toISOString(),
    };

    patients.push(patient);

    return patient;
}