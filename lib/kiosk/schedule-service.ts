import {
    findActiveException,
    getDoctor,
    listRegularSchedules,
} from "@/lib/db/repositories";
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
 * برنامه هفتگی معتبر پزشک برای تاریخ داده‌شده.
 */
export async function getRegularSchedules(
    doctorId: number,
    date: Date
): Promise<DoctorSchedule[]> {
    return listRegularSchedules(doctorId, getWeekday(date), formatDate(date));
}

/**
 * استثنای فعال پزشک برای تاریخ داده‌شده (غیبت یا ساعت جایگزین).
 */
export async function getScheduleException(
    doctorId: number,
    date: Date
): Promise<ScheduleException | null> {
    return findActiveException(doctorId, formatDate(date));
}

/**
 * برنامه نهایی پزشک در یک روز (با در نظر گرفتن استثنا).
 */
export async function getEffectiveSchedules(
    doctorId: number,
    date: Date = getTehranNow()
): Promise<TimeRange[]> {
    const doctor = await getDoctor(doctorId);

    if (!doctor || !doctor.isActive) {
        return [];
    }

    const exception = await getScheduleException(doctorId, date);

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
    const regular = await getRegularSchedules(doctorId, date);

    return regular.map((schedule) => ({
        startTime: schedule.startTime,
        endTime: schedule.endTime,
    }));
}

/**
 * آیا پزشک در این روز اصلاً برنامه دارد؟
 */
export async function isDoctorScheduledToday(
    doctorId: number,
    date: Date = getTehranNow()
): Promise<boolean> {
    return (await getEffectiveSchedules(doctorId, date)).length > 0;
}

/**
 * آیا پزشک در همین لحظه در ساعت حضور خود قرار دارد؟
 */
export async function isDoctorAvailableNow(
    doctorId: number,
    date: Date = getTehranNow()
): Promise<boolean> {
    const schedules = await getEffectiveSchedules(doctorId, date);

    if (schedules.length === 0) {
        return false;
    }

    const currentTime = getTehranTime(date);

    return schedules.some((schedule) => isTimeInRange(currentTime, schedule));
}

export async function getDoctorAvailability(
    doctorId: number,
    date: Date = getTehranNow()
) {
    const schedules = await getEffectiveSchedules(doctorId, date);
    const currentTime = getTehranTime(date);

    return {
        scheduled: schedules.length > 0,
        availableNow: schedules.some((schedule) =>
            isTimeInRange(currentTime, schedule)
        ),
        schedules,
    };
}
