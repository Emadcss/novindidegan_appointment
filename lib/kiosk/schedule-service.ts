import {
    doctors,
    doctorSchedules,
    scheduleExceptions,
} from "@/data/kiosk-data";

import type {
    DoctorSchedule,
    ScheduleException,
} from "@/types/kiosk";
import {compile} from "tailwindcss";

type TimeRange = {
    startTime: string;
    endTime: string;
};

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getWeekday(date: Date): number {
    return date.getDay();
}

function timeToMinutes(time: string): number {
    const [hours, minute] = time.split(":").map(Number);

    return hours * 60 + minute;
}

function isTimeInRange(
    currentTime: string,
    range: TimeRange,
): boolean {
    const current = timeToMinutes(currentTime);
    const start = timeToMinutes(range.startTime);
    const end = timeToMinutes(range.endTime);

    return current >= start && current < end;
}

/**
 * برنامه هفتگی معتبر پزشک در یک تاریخ مشخص
 */
export function getRegularSchedules(
    doctorId: number,
    date: Date
): DoctorSchedule[] {
    const dateString = formatDate(date);
    const weekday = getWeekday(date);

    return doctorSchedules.filter((schedule) => {
        if (schedule.doctorId !== doctorId) return false;
        if (!schedule.isActive) return false;
        if (schedule.weekday !== weekday) return false;
        if (dateString < schedule.validFrom) return false;
        if (
            schedule.validUntil &&
            dateString > schedule.validUntil
        ) return false;

        return true;
    });
}

/**
 * استثنای فعال پزشک در یک تاریخ مشخص
 */
export function getScheduleException(
    doctorId: number,
    date: Date
): ScheduleException | null {
    const dateString = formatDate(date);

    return (
        scheduleExceptions.find(
            (exception) =>
                exception.doctorId === doctorId &&
                exception.date === dateString &&
                exception.isActive
        ) ?? null
    );
}

/**
 * برنامه نهایی پزشک در یک روز
 *
 * اولویت:
 *
 * disabled
 * ↓
 * override
 * ↓
 * برنامه عادی هفتگی
 */
export function getEffectiveSchedules(
    doctorId: number,
    date: Date = new Date()
): TimeRange[] {
    const doctor = doctors.find(
        (doctor) => doctor.id === doctorId
    );

    if (!doctor || !doctor.isActive) {
        return [];
    }

    const exception = getScheduleException(
        doctorId,
        date
    );

    /**
     * پزشک برای این روز کاملاً غیرفعال شده.
     */
    if (exception?.type === "disabled") {
        return [];
    }

    /**
     * برنامه جایگزین مخصوص همین روز.
     */
    if (
        exception?.type === "override" &&
        exception.startTime &&
        exception.endTime
    ) {
        return [
            {
                startTime: exception.startTime,
                endTime: exception.endTime,
            },
        ];
    }

    /**
     * برنامه عادی هفتگی.
     */
    return getRegularSchedules(doctorId, date).map(
        (schedule) => ({
            startTime: schedule.startTime,
            endTime: schedule.endTime,
        })
    );
}

/**
 * آیا پزشک در این روز اصلاً برنامه دارد؟
 */
export function isDoctorScheduledToday(
    doctorId: number,
    date: Date = new Date()
): boolean {
    return (
        getEffectiveSchedules(doctorId, date).length > 0
            );
}

/**
 * آیا پزشک در همین لحظه در ساعت حضور خود قرار دارد؟
 */
export function isDoctorAvailableNow(
    doctorId: number,
    date: Date = new Date()
): boolean {
    const schedules = getEffectiveSchedules(
        doctorId,
        date
    );

    if (schedules.length === 0) {
        return false;
    }

    const currentTime = `${String(
        date.getHours()
    ).padStart(2, "0")}:${String(
        date.getMinutes()
    ).padStart(2, "0")}`;

    return schedules.some((schedule) =>
        isTimeInRange(currentTime, schedule)
    );
}

export function ggetDoctorAvailability(
    doctorId: number,
    date: Date = new Date()
) {
    const schedules = getEffectiveSchedules(
        doctorId,
        date
    );

    return {
        scheduled: schedules.length > 0,
        availableNow: schedules.some((schedule) => {
            const currentTime = `${String(
                date.getHours()
            ).padStart(2, "0")}:${String(
                date.getMinutes()
            ).padStart(2, "0")}`;

            return isTimeInRange(
                currentTime,
                schedule
            );
        }),
        schedules,
    };
}