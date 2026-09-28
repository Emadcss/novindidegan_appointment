import { appointments, } from "@/data/kiosk-data";
import { getDoctorById, getSpecialtyById } from "@/lib/kiosk/kiosk-service";
import { isDoctorAvailableNow } from "@/lib/kiosk/schedule-service";
import {createPatient,} from "@/lib/kiosk/patient-service";
import {getNextAppointmentNumber} from "@/lib/kiosk/queue-service";
import type {Appointment, Nationality} from "@/types/kiosk";

type CreateAppointmentInput = {
    specialtyId: number;
    doctorId: number;
    nationality: Nationality
    nationalId?: string | null;
    mobile?: string | null;
    hasSurgeryHistory?: boolean | null;
    appointmentDate?: Date;
};

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export function createAppointment(
    input: CreateAppointmentInput
): Appointment {
    const now = new Date();
    const appointmentDate =
        input.appointmentDate ?? now;
    const nationalId =
        input.nationalId ?? null;
    const mobile =
        input.mobile ?? null;

    /*
   * -------------------------
   * Basic validation
   * -------------------------
   */

    if (
        input.nationality === "iranian" &&
        !nationalId
    ) {
        throw new Error(
            "کد ملی الزامی است"
        );
    }

    if (
        input.nationality === "foreign" &&
        !mobile
    ) {
        throw new Error(
            "شماره موبایل الزامی است"
        );
    }

    /*
   * -------------------------
   * Validate specialty
   * -------------------------
   */

    const specialty =
        getSpecialtyById(
            input.specialtyId
        );
    if (!specialty || !specialty.isActive) {
        throw new Error(
            "تخصص انتخاب شده معتبر نیست"
        );
    }

    /*
   * -------------------------
   * Validate doctor
   * -------------------------
   */

    const doctor =
        getDoctorById(
            input.doctorId
        );
    if (!doctor || !doctor.isActive) {
        throw new Error(
            "پزشک انتخاب شده معتبر نیست"
        );
    }

    /*
 * Doctor must belong to
 * selected specialty.
 */

    if (
        doctor.specialtyId !==
        input.specialtyId
    ) {
        throw new Error(
            "پزشک متعلق به این تخصص نیست"
        );
    }

    /*
   * -------------------------
   * Validate current schedule
   * -------------------------
   *
   * This is intentionally checked
   * on the server immediately before
   * creating the appointment.
   */

    if (
        !isDoctorAvailableNow(
            input.doctorId,
            now
        )
    ) {
        throw new Error(
            "در حال حاضر امکان دریافت نوبت برای این پزشک وچود ندارد"
        );
    }

    /*
   * -------------------------
   * Surgery history
   * -------------------------
   */

    let  hasSurgeryHistory: boolean | null = null;

    if (doctor.requiresSurgeryHistory) {
        if (
            typeof input.hasSurgeryHistory !== "boolean"
        ) {
            throw new Error(
                "وضعیت سابقه جراحی مشخص نشده است"
            );
        }

        hasSurgeryHistory =
            input.hasSurgeryHistory;
    }

    /*
   * -------------------------
   * Patient
   * -------------------------
   */

    const patient = createPatient({
        nationality:
            input.nationality,
        nationalId:
            input.nationality === "iranian"
                ? nationalId
                : null,
        mobile:
            input.nationality === "foreign"
                ? mobile
                : null,
    });

    /*
   * -------------------------
   * Queue number
   * -------------------------
   */

    const appointmentNumber =
        getNextAppointmentNumber(
            input.specialtyId,
            input.doctorId,
            appointmentDate
        );

    /*
   * -------------------------
   * Appointment
   * -------------------------
   */

    const nextId =
        appointments.length > 0
            ? Math.max(
                ...appointments.map(
                    (appointment) => appointment.id
                )
            ) + 1
            : 1;

    const appointment: Appointment = {
        id: nextId,
        patientId: patient.id,
        specialtyId: input.specialtyId,
        doctorId: input.doctorId,
        appointmentDate:
            formatDate(appointmentDate),
        appointmentNumber,
        nationality:
            input.nationality,
        nationalId:
            input.nationality === "iranian"
                ? nationalId
                : null,
        mobile:
            input.nationality === "foreign"
                ? mobile
                : null,
        hasSurgeryHistory,
        status: "booked",
        createdAt:
            now.toISOString(),
    };

    appointments.push(appointment);

    return appointment;
}