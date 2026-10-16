import {
    advisoryLock,
    hash32,
    withTransaction,
} from "@/lib/db/connection";
import { hashIdentifier } from "@/lib/db/crypto";
import {
    findAppointmentByRequestId,
    findPatientId,
    getDoctor,
    getOrCreatePatientId,
    getSpecialty,
    incrementCounter,
    insertAppointment,
    listBookedAppointments,
    listDoctors,
    listSpecialties,
} from "@/lib/db/repositories";
import { KioskError } from "@/lib/kiosk/errors";
import {
    isDoctorAvailableNow,
    isDoctorScheduledToday,
} from "@/lib/kiosk/schedule-service";
import { getServerNow } from "@/lib/time/server-clock";
import {
    getTehranDateKey,
    getTehranTimeWithoutSeconds,
} from "@/lib/time/tehran-time";
import { toPersianDigits } from "@/lib/utils/persian-digits";

import type {
    Appointment,
    Nationality,
    PreviousAppointmentLookupResult,
    PreviousAppointmentSummary,
} from "@/types/kiosk";

export type CreateAppointmentInput = {
    specialtyId: number;
    doctorId: number;
    nationality: Nationality;
    nationalId: string | null;
    mobile: string | null;
    hasSurgeryHistory?: boolean | null;
    requestId?: string | null;
};

/**
 * حداکثر نوبت فعال هر بیمار در یک روز (جمع همه‌ی پزشکان).
 * بیمار می‌تواند برای چند تخصص یا چند پزشک از یک تخصص نوبت بگیرد، ولی نه بی‌نهایت.
 */
const MAX_ACTIVE_APPOINTMENTS_PER_PATIENT_PER_DAY = 3;

/** فضای نام قفل‌ها (advisory lock) */
const LOCK_PATIENT = 1;
const LOCK_REQUEST = 2;

/**
 * ایجاد نوبت جدید
 * تاریخ و ساعت فقط از سرور (تهران) می‌آید.
 *
 * همه‌ی بررسی‌ها و ثبت در «یک تراکنش» انجام می‌شود و دو قفل دارد:
 * - قفل درخواست (requestId): دو ارسال هم‌زمان یک درخواست، یک نوبت می‌سازند
 * - قفل بیمار: دو ثبت هم‌زمان یک بیمار از سقف روزانه یا قاعده‌ی «یک نوبت برای هر پزشک» رد نمی‌شوند
 * شماره‌ی نوبت هم با ردیف شمارنده‌ی قفل‌شده گرفته می‌شود؛ پس شماره‌ی تکراری ساخته نمی‌شود.
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
        requestId = null,
    } = input;

    if (!nationalId && !mobile) {
        throw new KioskError("VALIDATION", "کد ملی یا شماره موبایل الزامی است");
    }

    return withTransaction(async () => {
        // تلاش دوباره‌ی همان درخواست (مثلاً پاسخ گم شده): همان نوبت قبلی برگردانده می‌شود
        if (requestId) {
            await advisoryLock(LOCK_REQUEST, hash32(requestId));

            const previous = await findAppointmentByRequestId(requestId);
            if (previous) {
                return previous;
            }
        }

        const specialty = await getSpecialty(specialtyId);
        if (!specialty || !specialty.isActive) {
            throw new KioskError("NOT_FOUND", "تخصص معتبر نیست");
        }

        const doctor = await getDoctor(doctorId);
        if (!doctor || !doctor.isActive || doctor.specialtyId !== specialtyId) {
            throw new KioskError("NOT_FOUND", "پزشک معتبر نیست");
        }

        if (doctor.requiresSurgeryHistory && hasSurgeryHistory === null) {
            throw new KioskError("VALIDATION", "پاسخ به سؤال سابقه جراحی لازم است");
        }

        const now = getServerNow();

        if (!(await isDoctorScheduledToday(doctorId, now))) {
            throw new KioskError("OUT_OF_SCHEDULE", "پزشک برای امروز برنامه حضور ندارد");
        }

        if (!(await isDoctorAvailableNow(doctorId, now))) {
            throw new KioskError("OUT_OF_SCHEDULE", "در حال حاضر خارج از ساعت حضور پزشک است");
        }

        const appointmentDate = getTehranDateKey(now);
        const appointmentTime = getTehranTimeWithoutSeconds(now);

        // قفل بر اساس هویت (hash)، پیش از ساخته شدن بیمار؛ پس بیمار تازه هم دو بار ساخته نمی‌شود
        const identityHash = nationalId
            ? hashIdentifier("nid", nationalId)
            : hashIdentifier("mob", mobile ?? "");
        await advisoryLock(LOCK_PATIENT, hash32(identityHash));

        const patientId = await getOrCreatePatientId({ nationality, nationalId, mobile });

        // نوبت‌های فعال همین بیمار در همین روز (همه‌ی پزشکان)
        const patientToday = await listBookedAppointments(patientId, appointmentDate);

        const duplicate = patientToday.find((item) => item.doctorId === doctorId);

        if (duplicate) {
            throw new KioskError(
                "DUPLICATE",
                `شما امروز برای این پزشک نوبت دارید (شماره ${toPersianDigits(duplicate.appointmentNumber)}). از بخش «نوبت قبلی دارم» استفاده کنید`
            );
        }

        if (patientToday.length >= MAX_ACTIVE_APPOINTMENTS_PER_PATIENT_PER_DAY) {
            throw new KioskError(
                "LIMIT",
                `شما امروز ${toPersianDigits(patientToday.length)} نوبت فعال دارید و به حداکثر مجاز رسیده‌اید. برای راهنمایی به پذیرش مراجعه کنید`
            );
        }

        return insertAppointment({
            patientId,
            specialtyId,
            doctorId,
            appointmentDate,
            appointmentTime,
            appointmentNumber: await incrementCounter(specialtyId, doctorId, appointmentDate),
            // پاسخ فقط برای پزشکی که سؤال جراحی دارد ذخیره می‌شود
            hasSurgeryHistory: doctor.requiresSurgeryHistory ? hasSurgeryHistory : null,
            requestId,
        });
    });
}

/**
 * همه‌ی نوبت‌های فعال «امروز» بیمار (به وقت تهران)، جدیدترین اول.
 */
export async function findTodaysAppointments(identity: {
    nationalId: string | null;
    mobile: string | null;
}): Promise<Appointment[]> {
    const patientId = await findPatientId(identity);

    if (patientId === null) {
        return [];
    }

    return listBookedAppointments(patientId, getTehranDateKey(getServerNow()));
}

function toSummary(
    appointment: Appointment,
    specialtyById: Map<number, PreviousAppointmentSummary["specialty"]>,
    doctorById: Map<number, PreviousAppointmentSummary["doctor"]>,
): PreviousAppointmentSummary {
    return {
        appointmentId: appointment.id,
        appointmentNumber: appointment.appointmentNumber,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        specialty: specialtyById.get(appointment.specialtyId) ?? null,
        doctor: doctorById.get(appointment.doctorId) ?? null,
        hasSurgeryHistory: appointment.hasSurgeryHistory,
    };
}

/** نوبت‌های فعال امروز، به‌همراه نام تخصص و پزشک (کلاینت دیگر به داده‌ی سرور دسترسی ندارد) */
export async function lookupPreviousAppointment(identity: {
    nationalId: string | null;
    mobile: string | null;
}): Promise<PreviousAppointmentLookupResult> {
    const items = await findTodaysAppointments(identity);

    const specialtyById = new Map(
        (await listSpecialties()).map((item) => [item.id, item]),
    );
    const doctorById = new Map(
        (await listDoctors()).map((item) => [item.id, item]),
    );

    return {
        found: items.length > 0,
        appointments: items.map((item) => toSummary(item, specialtyById, doctorById)),
    };
}
