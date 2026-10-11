import {
    doctors,
    doctorSchedules,
    scheduleExceptions,
} from "@/data/kiosk-data";
import { getServerNow } from "@/lib/time/server-clock";
import { APP_TIMEZONE } from "@/lib/time/constants";

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

function getTehranDateParts(date: Date) {
    const parts = new Intl.DateTimeFormat("en-Us",{
        timeZone: APP_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);

    return Object.fromEntries(
        parts
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value])
    ) as Record<string, string>;
}

function formatDate(date: Date): string {
    const parts = getTehranDateParts(date);

    return `${parts.year}-${parts.month}-${parts.day}`;
}

function getWeekday(date: Date): number {
    const weekday = getTehranDateParts(date).weekday;
    const weekdays: Record<string, number> = {
        Sat: 0,
        Sun: 1,
        Mon: 2,
        Tue: 3,
        Wed: 4,
        Thu: 5,
        Fri: 6,
    };

    return weekdays[weekday];
}

function getTehranTime(date: Date): string {
    const parts = getTehranDateParts(date);

    return `${parts.hour}:${parts.minute}:${parts.second}`;
}

function timeToMinutes(time: string): number {
    const [hours, minute] = time.split(":").map(Number);

    return hours * 60 + minute;
}

function timeToSeconds(time: string): number {
    const [hours, minutes, seconds = 0] = time
        .split(":")
        .map(Number);

    return hours * 3600 + minutes * 60 + seconds;
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