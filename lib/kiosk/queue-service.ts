import { withTransaction } from "@/lib/db/connection";
import { incrementCounter } from "@/lib/db/repositories";
import { getTehranDateKey } from "@/lib/time/tehran-time";
import { getServerNow } from "@/lib/time/server-clock";

/**
 * شماره‌ی بعدی صف برای (تخصص، پزشک، روز تهران): هر پزشک صف مستقل خودش را دارد.
 *
 * شمارنده در دیتابیس و اتمیک است. اگر از قبل داخل تراکنش هستید (مثل ثبت نوبت)
 * فقط incrementCounter را صدا بزنید؛ این تابع برای استفاده‌ی مستقل است.
 */
export async function getNextAppointmentNumber(
    specialtyId: number,
    doctorId: number,
    date: Date = getServerNow(),
): Promise<number> {
    return withTransaction(() =>
        incrementCounter(specialtyId, doctorId, getTehranDateKey(date)),
    );
}
