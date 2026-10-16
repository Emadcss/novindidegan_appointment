import {
    advisoryLock,
    hash32,
    query,
    withTransaction,
} from "@/lib/db/connection";
import { hashIdentifier } from "@/lib/db/crypto";
import { LATEST_SCHEMA_VERSION } from "@/lib/db/migrations";
import {
    getOrCreatePatientId,
    incrementCounter,
    insertAppointment,
    listRegularSchedules,
} from "@/lib/db/repositories";
import { createAppointment } from "@/lib/kiosk/appointment-service";
import { isKioskError } from "@/lib/kiosk/errors";
import { getAvailableDoctorsForSpecialty, getActiveSpecialties } from "@/lib/kiosk/kiosk-service";
import { getServerNow } from "@/lib/time/server-clock";
import { getTehranDateKey, getTehranWeekday } from "@/lib/time/tehran-time";

export type CheckResult = { name: string; ok: boolean; detail?: string };

/** تاریخ و شناسه‌های ساختگی؛ هیچ‌وقت با داده‌ی واقعی تداخل ندارند */
const FAKE_DAY = "2099-01-01";
const FAKE_ID = 999_001;

const looksUnique = (error: unknown): boolean =>
    /unique|duplicate key/i.test(String((error as Error)?.message ?? error)) ||
    (error as { code?: string })?.code === "23505";

async function check(
    results: CheckResult[],
    name: string,
    fn: () => Promise<string | void>,
): Promise<void> {
    try {
        const detail = await fn();
        results.push({ name, ok: true, detail: detail ?? undefined });
    } catch (error) {
        results.push({
            name,
            ok: false,
            detail: error instanceof Error ? error.message : String(error),
        });
    }
}

function expect(condition: unknown, message: string): void {
    if (!condition) throw new Error(message);
}

/** نوبت‌ها و بیماران آزمایشی را (با شناسه‌ی دقیق) حذف می‌کند؛ هیچ داده‌ی واقعی لمس نمی‌شود */
async function deleteTestPatients(patientIds: number[]): Promise<void> {
    for (const id of patientIds) {
        await query("DELETE FROM appointments WHERE patient_id = $1", [id]);
        await query("DELETE FROM patients WHERE id = $1", [id]);
    }
}

async function cleanupFake(): Promise<void> {
    await query("DELETE FROM appointments WHERE appointment_date = $1", [FAKE_DAY]);
    await query("DELETE FROM daily_counters WHERE specialty_id >= $1", [FAKE_ID]);
}

/**
 * خودآزمایی دیتابیس (فقط حالت توسعه).
 * بخش‌های پایه با داده‌ی ساختگی انجام می‌شوند و بعدش پاک می‌شوند.
 * بخش e2e (با e2e: true) ثبت نوبت واقعی را هم‌زمان آزمایش می‌کند و شماره‌های امروز
 * را کمی جلو می‌برد؛ نوبت‌های آزمایشی پاک و شمارنده به حالت قبل برمی‌گردد.
 */
export async function runDbSelfCheck(options: {
    e2e: boolean;
}): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    await cleanupFake();

    await check(results, "اتصال و نسخه‌ی دیتابیس", async () => {
        try {
            const rows = await query("SELECT version() AS v");
            return String(rows[0]?.v ?? "");
        } catch {
            const rows = await query("SELECT 1 AS one");
            expect(Number(rows[0]?.one) === 1, "کوئری ساده جواب نداد");
            return "نسخه نامشخص";
        }
    });

    await check(results, "مهاجرت‌ها به آخرین نسخه رسیده‌اند", async () => {
        const rows = await query("SELECT MAX(version) AS v FROM schema_migrations");
        expect(
            Number(rows[0]?.v) === LATEST_SCHEMA_VERSION,
            `نسخه‌ی دیتابیس ${rows[0]?.v}، انتظار ${LATEST_SCHEMA_VERSION}`,
        );
        return `نسخه ${LATEST_SCHEMA_VERSION}`;
    });

    await check(results, "داده‌ی اولیه (تخصص و پزشک) وارد شده است", async () => {
        const doctors = await query("SELECT COUNT(*) AS n FROM doctors");
        const specialties = await query("SELECT COUNT(*) AS n FROM specialties");
        expect(Number(doctors[0]?.n) > 0 && Number(specialties[0]?.n) > 0, "جدول‌ها خالی‌اند");
        return `${specialties[0]?.n} تخصص، ${doctors[0]?.n} پزشک`;
    });

    await check(results, "قالب تاریخ و ساعت (DATE به‌صورت متن، ساعت HH:MM)", async () => {
        const now = getServerNow();
        const schedules = await listRegularSchedules(1, getTehranWeekday(now), getTehranDateKey(now));
        expect(schedules.length > 0, "برای پزشک ۱ امروز برنامه‌ای نیست (از گرفتن این بررسی صرف‌نظر کنید یا برنامه را ببینید)");
        expect(/^\d{4}-\d{2}-\d{2}$/.test(schedules[0].validFrom), `validFrom: ${schedules[0].validFrom}`);
        expect(/^\d{2}:\d{2}$/.test(schedules[0].startTime), `startTime: ${schedules[0].startTime}`);
        return `${schedules[0].validFrom} / ${schedules[0].startTime}`;
    });

    await check(results, "شمارنده‌ی هم‌زمان: ۲۰ درخواست موازی، شماره‌ها ۱ تا ۲۰", async () => {
        const numbers = await Promise.all(
            Array.from({ length: 20 }, () =>
                withTransaction(() => incrementCounter(FAKE_ID, FAKE_ID, FAKE_DAY)),
            ),
        );
        const sorted = [...numbers].sort((a, b) => a - b);
        expect(
            sorted.every((n, i) => n === i + 1),
            `شماره‌ها: ${sorted.join(",")}`,
        );
        return "بدون تکرار و بدون سوراخ";
    });

    await check(results, "خطا وسط تراکنش: همه‌چیز برمی‌گردد (rollback)", async () => {
        try {
            await withTransaction(async () => {
                await incrementCounter(FAKE_ID + 1, FAKE_ID, FAKE_DAY);
                throw new Error("خطای عمدی");
            });
        } catch {
            // انتظار می‌رفت
        }
        const rows = await query(
            "SELECT COUNT(*) AS n FROM daily_counters WHERE specialty_id = $1",
            [FAKE_ID + 1],
        );
        expect(Number(rows[0]?.n) === 0, "شمارنده بعد از خطا باقی مانده است");
    });

    const createdPatientIds: number[] = [];
    let patientId = 0;

    await check(results, "ساخت هم‌زمان بیمار: ۱۰ درخواست، فقط یک بیمار", async () => {
        const identity = `selfcheck-${Date.now()}`;
        const ids = await Promise.all(
            Array.from({ length: 10 }, () =>
                withTransaction(async () => {
                    await advisoryLock(1, hash32(identity));
                    return getOrCreatePatientId({
                        nationality: "iranian",
                        nationalId: identity,
                        mobile: null,
                    });
                }),
            ),
        );
        expect(new Set(ids).size === 1, `شناسه‌ها: ${[...new Set(ids)].join(",")}`);
        patientId = ids[0];
        createdPatientIds.push(patientId);
    });

    await check(results, "محدودیت‌های یکتایی خود دیتابیس کار می‌کنند", async () => {
        const base = {
            patientId,
            specialtyId: 1,
            doctorId: 1,
            appointmentDate: FAKE_DAY,
            appointmentTime: "10:00",
            appointmentNumber: 1,
            hasSurgeryHistory: null,
            requestId: null,
        };
        await insertAppointment(base);

        // بیمار دومِ واقعی، تا خطا حتماً «یکتایی» باشد نه کلید خارجی
        const otherPatientId = await withTransaction(() =>
            getOrCreatePatientId({
                nationality: "iranian",
                nationalId: `selfcheck-other-${Date.now()}`,
                mobile: null,
            }),
        );
        createdPatientIds.push(otherPatientId);

        let sameNumberRejected = false;
        try {
            await insertAppointment({ ...base, patientId: otherPatientId });
        } catch (error) {
            sameNumberRejected = looksUnique(error);
        }
        expect(sameNumberRejected, "شماره‌ی تکراری برای (تخصص، پزشک، روز) پذیرفته شد");

        let sameDoctorRejected = false;
        try {
            await insertAppointment({ ...base, appointmentNumber: 2 });
        } catch (error) {
            sameDoctorRejected = looksUnique(error);
        }
        expect(sameDoctorRejected, "دو نوبت فعال برای یک بیمار و یک پزشک در یک روز پذیرفته شد");
    });

    await cleanupFake();
    await deleteTestPatients(createdPatientIds);

    if (!options.e2e) {
        results.push({
            name: "ثبت نوبت واقعی هم‌زمان (e2e)",
            ok: true,
            detail: "اجرا نشد؛ برای اجرا ?e2e=1 را به آدرس اضافه کنید",
        });
        return results;
    }

    // ---------------- e2e: خود createAppointment زیر فشار هم‌زمان ----------------
    const now = getServerNow();
    const today = getTehranDateKey(now);

    const available: { id: number; specialtyId: number; requiresSurgeryHistory: boolean }[] = [];
    for (const specialty of await getActiveSpecialties()) {
        for (const doctor of await getAvailableDoctorsForSpecialty(specialty.id, now)) {
            available.push({
                id: doctor.id,
                specialtyId: specialty.id,
                requiresSurgeryHistory: doctor.requiresSurgeryHistory,
            });
        }
    }

    if (available.length === 0) {
        results.push({
            name: "ثبت نوبت واقعی هم‌زمان (e2e)",
            ok: false,
            detail: "الان هیچ پزشکی در ساعت حضور خود نیست؛ در ساعتی که پزشکی حاضر است دوباره اجرا کنید",
        });
        return results;
    }

    const doctor = available[0];
    const readCounter = async (doctorId: number, specialtyId: number) => {
        const rows = await query(
            "SELECT last_number FROM daily_counters WHERE specialty_id = $1 AND doctor_id = $2 AND day = $3",
            [specialtyId, doctorId, today],
        );
        return rows[0] ? Number(rows[0].last_number) : null;
    };
    const tag = `selfcheck-${Date.now()}`;
    const baseCounters = new Map<number, number | null>();
    for (const item of available) {
        baseCounters.set(item.id, await readCounter(item.id, item.specialtyId));
    }

    const usedIdentities: string[] = [];
    const book = (identity: string, item: typeof doctor, requestId: string | null = null) => {
        usedIdentities.push(identity);
        return createAppointment({
            specialtyId: item.specialtyId,
            doctorId: item.id,
            nationality: "iranian",
            nationalId: identity,
            mobile: null,
            hasSurgeryHistory: item.requiresSurgeryHistory ? false : null,
            requestId,
        });
    };
    const settle = (promises: Promise<unknown>[]) => Promise.allSettled(promises);

    await check(results, "e2e: ۱۵ بیمار مختلف هم‌زمان نزد یک پزشک، شماره‌ها پشت سر هم", async () => {
        const base = baseCounters.get(doctor.id) ?? 0;
        const outcome = await settle(
            Array.from({ length: 15 }, (_, i) => book(`${tag}-a${i}`, doctor)),
        );
        const ok = outcome.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ appointmentNumber: number }>[];
        expect(ok.length === 15, `${15 - ok.length} درخواست ناموفق`);
        const numbers = ok.map((r) => r.value.appointmentNumber).sort((a, b) => a - b);
        expect(numbers.every((n, i) => n === base + i + 1), `شماره‌ها: ${numbers.join(",")} (پایه ${base})`);
        return `${base + 1} تا ${base + 15}`;
    });

    await check(results, "e2e: ۵ ثبت هم‌زمان یک بیمار نزد یک پزشک، فقط یکی موفق", async () => {
        const outcome = await settle(
            Array.from({ length: 5 }, () => book(`${tag}-dup`, doctor)),
        );
        const okCount = outcome.filter((r) => r.status === "fulfilled").length;
        const duplicates = outcome.filter(
            (r) => r.status === "rejected" && isKioskError(r.reason) && r.reason.code === "DUPLICATE",
        ).length;
        expect(okCount === 1 && duplicates === 4, `موفق: ${okCount}، DUPLICATE: ${duplicates}`);
    });

    await check(results, "e2e: ۵ درخواست هم‌زمان با requestId یکسان، همان یک نوبت", async () => {
        const outcome = await settle(
            Array.from({ length: 5 }, () => book(`${tag}-idem`, doctor, `${tag}-req`)),
        );
        const values = outcome.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ id: number }>[];
        expect(values.length === 5, `${5 - values.length} درخواست ناموفق`);
        expect(new Set(values.map((r) => r.value.id)).size === 1, "نوبت‌های متفاوت ساخته شد");
    });

    await check(results, "e2e: سقف روزانه (۳) زیر درخواست هم‌زمان رعایت می‌شود", async () => {
        if (available.length < 4) return "رد شد (کمتر از ۴ پزشک حاضر)";
        const outcome = await settle(available.map((item) => book(`${tag}-lim`, item)));
        const okCount = outcome.filter((r) => r.status === "fulfilled").length;
        const limited = outcome.filter(
            (r) => r.status === "rejected" && isKioskError(r.reason) && r.reason.code === "LIMIT",
        ).length;
        expect(okCount === 3 && limited === available.length - 3, `موفق: ${okCount}، LIMIT: ${limited}`);
    });

    // پاک‌سازی دقیق: فقط بیماران و نوبت‌های همین آزمایش
    const e2ePatientIds: number[] = [];
    for (const identity of new Set(usedIdentities)) {
        const rows = await query("SELECT id FROM patients WHERE national_id_hash = $1", [
            hashIdentifier("nid", identity),
        ]);
        if (rows[0]) e2ePatientIds.push(Number(rows[0].id));
    }
    await deleteTestPatients(e2ePatientIds);

    // شمارنده‌ها به حالت قبل از آزمایش برمی‌گردند
    for (const item of available) {
        const base = baseCounters.get(item.id);
        if (base === null || base === undefined) {
            await query(
                "DELETE FROM daily_counters WHERE specialty_id = $1 AND doctor_id = $2 AND day = $3",
                [item.specialtyId, item.id, today],
            );
        } else {
            await query(
                "UPDATE daily_counters SET last_number = $4 WHERE specialty_id = $1 AND doctor_id = $2 AND day = $3",
                [item.specialtyId, item.id, today, base],
            );
        }
    }

    return results;
}
