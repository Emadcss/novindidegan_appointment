import {
    doctors,
    doctorSchedules,
    scheduleExceptions,
} from "@/data/kiosk-data";
import { getServerNow } from "@/lib/time/server-clock";
import {
    getTehranDateKey as formatDate,
    getTehranWeekday as getWeekday,
    getTehranTime,
    timeToSeconds
} from "@/lib/time/tehran-time";

import type {
    DoctorSchedule,
    ScheduleException,
} from "@/types/kiosk";

type TimeRange = {
    startTime: string;
    endTime: string;
};

// مثال ساده — بعداً می‌توانی دقیق‌تر کنی
function getTehranNow(): Date {
    // یا از DB: SELECT NOW() AT TIME ZONE 'Asia/Tehran'
    return getServerNow();
}

function isTimeInRange(
    currentTime: string,
    range: TimeRange,
): boolean {
    const current = timeToSeconds(currentTime);
    const start = timeToSeconds(range.startTime);
    const end = timeToSeconds(range.endTime);

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
        ) {
            return false;
        }

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
    date: Date = getTehranNow()
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
    date: Date = getTehranNow()
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
    date: Date = getTehranNow()
): boolean {
    const schedules = getEffectiveSchedules(
        doctorId,
        date
    );

    if (schedules.length === 0) {
        return false;
    }

    const currentTime = getTehranTime(date);

    return schedules.some((schedule) =>
        isTimeInRange(currentTime, schedule)
    );
}

export function getDoctorAvailability(
    doctorId: number,
    date: Date = getTehranNow()
) {
    const schedules = getEffectiveSchedules(
        doctorId,
        date
    );

    return {
        scheduled: schedules.length > 0,
        availableNow: schedules.some((schedule) => {
            const currentTime = getTehranTime(date);

            return isTimeInRange(
                currentTime,
                schedule
            );
        }),
        schedules,
    };
}