
import {
    findActiveException,
    getDoctor,
    listRegularSchedules,
} from "@/lib/db/repositories";

import { getServerNow } from "@/lib/time/server-clock";

import {
    getTehranDateKey,
    getTehranWeekday,
    getTehranTime,
    timeToSeconds,
} from "@/lib/time/tehran-time";

import type {
    DoctorSchedule,
    ScheduleException,
} from "@/types/kiosk";

type TimeRange = {
    startTime: string;
    endTime: string;
};

function getTehranNow(): Date {
    return getServerNow();
}

function isTimeInRange(
    currentTime: string,
    range: TimeRange,
): boolean {
    const current = timeToSeconds(currentTime);
    const start = timeToSeconds(range.startTime);
    const end = timeToSeconds(range.endTime);

    // شروع بازه شامل می‌شود؛ زمان پایان شامل نمی‌شود.
    return current >= start && current < end;
}

/**
 * همه برنامه‌های هفتگی معتبر پزشک را برای تاریخ مشخص می‌خواند.
 * فیلتر فعال‌بودن و بازه اعتبار باید در listRegularSchedules اعمال شود.
 */
export async function getRegularSchedules(
    doctorId: number,
    date: Date,
): Promise<DoctorSchedule[]> {
    const weekday = getTehranWeekday(date);
    const dateKey = getTehranDateKey(date);

    return listRegularSchedules(doctorId, weekday, dateKey);
}

/**
 * استثنای فعال پزشک در تاریخ موردنظر؛
 * مثلاً تعطیلی یک‌روزه یا ساعت جایگزین.
 */
export async function getScheduleException(
    doctorId: number,
    date: Date,
): Promise<ScheduleException | null> {
    return findActiveException(doctorId, getTehranDateKey(date));
}

/**
 * برنامه نهایی پزشک در یک روز.
 * استثنای disabled تمام شیفت‌های عادی را حذف می‌کند.
 * استثنای override برنامه عادی را با یک بازه جایگزین می‌کند.
 */
export async function getEffectiveSchedules(
    doctorId: number,
    date: Date = getTehranNow(),
): Promise<TimeRange[]> {
    const doctor = await getDoctor(doctorId);

    if (!doctor || !doctor.isActive) {
        return [];
    }

    const exception = await getScheduleException(doctorId, date);

    if (exception?.type === "disabled") {
        return [];
    }

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

    const regular = await getRegularSchedules(doctorId, date);

    return regular
        .map((schedule) => ({
            startTime: schedule.startTime,
            endTime: schedule.endTime,
        }))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/**
 * آیا پزشک در آن تاریخ دست‌کم یک شیفت دارد؟
 */
export async function isDoctorScheduledToday(
    doctorId: number,
    date: Date = getTehranNow(),
): Promise<boolean> {
    const schedules = await getEffectiveSchedules(doctorId, date);
    return schedules.length > 0;
}

/**
 * آیا پزشک همین حالا داخل یکی از شیفت‌های خود است؟
 */
export async function isDoctorAvailableNow(
    doctorId: number,
    date: Date = getTehranNow(),
): Promise<boolean> {
    const schedules = await getEffectiveSchedules(doctorId, date);
    const currentTime = getTehranTime(date);

    return schedules.some((schedule) =>
        isTimeInRange(currentTime, schedule),
    );
}

/**
 * اطلاعات کامل حضور برای استفاده در API یا رابط کیوسک.
 */
export async function getDoctorAvailability(
    doctorId: number,
    date: Date = getTehranNow(),
) {
    const schedules = await getEffectiveSchedules(doctorId, date);
    const currentTime = getTehranTime(date);

    return {
        scheduled: schedules.length > 0,
        availableNow: schedules.some((schedule) =>
            isTimeInRange(currentTime, schedule),
        ),
        schedules,
    };
}
