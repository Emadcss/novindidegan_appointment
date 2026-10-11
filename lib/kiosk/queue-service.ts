import { dailyAppointmentCounters } from "@/data/kiosk-data";
import { getTehranDateKey } from "@/lib/time/tehran-time";
import { getServerNow } from "@/lib/time/server-clock";

/**
 * شماره بعدی برای ترکیب تخصص + پزشک + روز تهران.
 *
 * فعلاً شمارنده در حافظه است؛ در مرحله دیتابیس باید
 * این عملیات به تراکنش/افزایش اتمیک دیتابیس منتقل شود.
 */
export function getNextAppointmentNumber(
    specialtyId: number,
    doctorId: number,
    date: Date = getServerNow(),
): number {
    const appointmentDate = getTehranDateKey(date);

    let counter = dailyAppointmentCounters.find(
        (item) =>
            item.specialtyId === specialtyId &&
            item.doctorId === doctorId &&
            item.date === appointmentDate,
    );

    if (!counter) {
        counter = {
            id:
                dailyAppointmentCounters.length > 0
                    ? Math.max(
                          ...dailyAppointmentCounters.map(
                              (item) => item.id,
                          ),
                      ) + 1
                    : 1,
            specialtyId,
            doctorId,
            date: appointmentDate,
            lastNumber: 0,
        };

        dailyAppointmentCounters.push(counter);
    }

    counter.lastNumber += 1;

    return counter.lastNumber;
}
