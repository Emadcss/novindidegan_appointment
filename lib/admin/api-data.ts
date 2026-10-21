import { decryptText } from "@/lib/db/crypto";
import { isUniqueViolation, withTransaction } from "@/lib/db/connection";
import {
    createDoctor,
    createSpecialty,
    deactivateException,
    listAllSchedules,
    listExceptionsFrom,
    replaceException,
    replaceWeeklySchedule,
    updateDoctor,
    updateSpecialty,
} from "@/lib/db/catalog-admin-repo";
import type { ScheduleRange } from "@/lib/db/catalog-admin-repo";
import {
    listConnectivityEvents,
    lastConnectivityEventBefore,
    listKiosks,
} from "@/lib/db/kiosk-repo";
import { getDoctor, getSpecialty, listDoctors, listSpecialties } from "@/lib/db/repositories";
import {
    getAppointmentAdmin,
    listAppointmentsAdmin,
    summaryReport,
    updateAppointmentStatus,
} from "@/lib/db/report-repo";
import type { AppointmentFilter, AppointmentRow } from "@/lib/db/report-repo";
import { audit, me } from "@/lib/admin/api-core";
import {
    ApiError,
    bool,
    hourMinute,
    idParam,
    int,
    isoDate,
    ok,
    readBody,
    requiredStr,
    str,
} from "@/lib/admin/http";
import { add } from "@/lib/admin/router";
import type { Ctx } from "@/lib/admin/router";
import { computeUptime } from "@/lib/monitoring/uptime";
import { getServerNow } from "@/lib/time/server-clock";
import { getTehranDateKey } from "@/lib/time/tehran-time";
import { addDays, formatJalali } from "@/lib/utils/jalali";

const MAX_RANGE_DAYS = 366;
const STATUSES = ["booked", "completed", "cancelled", "no_show"];
export const STATUS_LABELS: Record<string, string> = {
    booked: "در انتظار",
    completed: "انجام‌شده",
    cancelled: "لغو‌شده",
    no_show: "عدم مراجعه",
};

// ----------------------- ابزار -----------------------

function dayDiff(from: string, to: string): number {
    return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
}

function parseRange(ctx: Ctx): { from: string; to: string } {
    const today = getTehranDateKey(getServerNow());
    const from = isoDate(ctx.url.searchParams.get("from"), "از تاریخ", today);
    const to = isoDate(ctx.url.searchParams.get("to"), "تا تاریخ", from);

    if (to < from) throw new ApiError(400, "VALIDATION", "تاریخ پایان قبل از تاریخ شروع است");
    if (dayDiff(from, to) > MAX_RANGE_DAYS) {
        throw new ApiError(400, "VALIDATION", `بازه‌ی گزارش حداکثر ${MAX_RANGE_DAYS} روز است`);
    }
    return { from, to };
}

function optionalInt(ctx: Ctx, key: string): number | undefined {
    const raw = ctx.url.searchParams.get(key);
    if (raw === null || raw === "") return undefined;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) throw new ApiError(400, "VALIDATION", `${key} نامعتبر است`);
    return value;
}

function parseFilter(ctx: Ctx): AppointmentFilter {
    const { from, to } = parseRange(ctx);
    const status = ctx.url.searchParams.get("status") ?? undefined;
    if (status && !STATUSES.includes(status)) throw new ApiError(400, "VALIDATION", "وضعیت نامعتبر است");

    return {
        from,
        to,
        status: status || undefined,
        doctorId: optionalInt(ctx, "doctorId"),
        specialtyId: optionalInt(ctx, "specialtyId"),
        kioskId: optionalInt(ctx, "kioskId"),
        number: optionalInt(ctx, "number"),
    };
}

/** ۳ رقم اول و ۲ رقم آخر؛ بقیه پنهان */
export function maskValue(value: string, head: number, tail: number): string {
    if (value.length <= head + tail) return value;
    return `${value.slice(0, head)}${"•".repeat(value.length - head - tail)}${value.slice(-tail)}`;
}

function identityOf(row: AppointmentRow, reveal: boolean): { kind: string; value: string } | null {
    try {
        if (row.nationalIdEnc) {
            const plain = decryptText(row.nationalIdEnc);
            return { kind: "کد ملی", value: reveal ? plain : maskValue(plain, 3, 2) };
        }
        if (row.mobileEnc) {
            const plain = decryptText(row.mobileEnc);
            return { kind: "موبایل", value: reveal ? plain : maskValue(plain, 4, 2) };
        }
    } catch {
        return { kind: "نامشخص", value: "(کلید رمزنگاری با دیتابیس هم‌خوان نیست)" };
    }
    return null;
}

function publicAppointment(row: AppointmentRow) {
    const identity = identityOf(row, false);
    return {
        id: row.id,
        date: row.appointmentDate,
        time: row.appointmentTime,
        number: row.appointmentNumber,
        status: row.status,
        doctorId: row.doctorId,
        doctorName: row.doctorName,
        specialtyName: row.specialtyName,
        kioskName: row.kioskName,
        nationality: row.nationality,
        identityKind: identity?.kind ?? null,
        identityMasked: identity?.value ?? null,
        createdAt: row.createdAt,
    };
}

/** سلول CSV؛ در برابر تزریق فرمول اکسل (=,+,-,@) محافظت می‌شود */
export function csvCell(value: unknown): string {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// ======================= گزارش‌ها =======================

add("GET", "/reports/summary", "viewer", async (ctx) => {
    const range = parseRange(ctx);
    const report = await summaryReport(range);
    const days = dayDiff(range.from, range.to);
    const peak = [...report.byHour].sort((a, b) => b.total - a.total)[0] ?? null;
    const busiestDay = [...report.byDay].sort((a, b) => b.total - a.total)[0] ?? null;
    const resolved = report.totals.completed + report.totals.noShow;

    return ok({
        ...report,
        days,
        averagePerDay: Math.round((report.totals.total / days) * 10) / 10,
        peakHour: peak,
        busiestDay,
        noShowRate: resolved === 0 ? null : Math.round((report.totals.noShow / resolved) * 1000) / 10,
    });
});

add("GET", "/reports/appointments", "viewer", async (ctx) => {
    const filter = parseFilter(ctx);
    const pageSize = Math.min(Math.max(Number(ctx.url.searchParams.get("pageSize") ?? 50), 1), 200);
    const page = Math.max(Number(ctx.url.searchParams.get("page") ?? 1), 1);
    const result = await listAppointmentsAdmin(filter, pageSize, (page - 1) * pageSize);

    return ok({
        total: result.total,
        page,
        pageSize,
        rows: result.rows.map(publicAppointment),
    });
});

add("GET", "/reports/export.csv", "viewer", async (ctx) => {
    const filter = parseFilter(ctx);
    const { rows } = await listAppointmentsAdmin(filter, 20_000, 0);

    const lines = [
        ["ردیف", "تاریخ شمسی", "تاریخ میلادی", "ساعت ثبت", "شماره نوبت", "تخصص", "پزشک", "وضعیت", "ملیت", "هویت (پنهان‌شده)", "کیوسک"]
            .map(csvCell)
            .join(","),
        ...rows.map((row, index) => {
            const identity = identityOf(row, false);
            return [
                index + 1,
                formatJalali(row.appointmentDate, { latinDigits: true }),
                row.appointmentDate,
                row.appointmentTime,
                row.appointmentNumber,
                row.specialtyName,
                row.doctorName,
                STATUS_LABELS[row.status] ?? row.status,
                row.nationality === "iranian" ? "ایرانی" : "غیرایرانی",
                identity?.value ?? "",
                row.kioskName ?? "",
            ]
                .map(csvCell)
                .join(",");
        }),
    ];

    await audit(ctx, "report.export", `${filter.from}..${filter.to}`, { rows: rows.length });

    return new Response(`\uFEFF${lines.join("\r\n")}\r\n`, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="appointments-${filter.from}_${filter.to}.csv"`,
            "Cache-Control": "no-store",
        },
    });
});

add("GET", "/reports/kiosk-uptime", "viewer", async (ctx) => {
    const range = parseRange(ctx);
    const startMs = Date.parse(`${range.from}T00:00:00+03:30`);
    const endMs = Math.min(Date.parse(`${range.to}T23:59:59.999+03:30`), Date.now());

    const rows = [];
    for (const kiosk of await listKiosks()) {
        const activeSince = Date.parse(kiosk.pairedAt ?? kiosk.createdAt);
        const from = Math.max(startMs, activeSince);
        if (from >= endMs) {
            rows.push({ kioskId: kiosk.id, name: kiosk.name, measured: false });
            continue;
        }

        const events = await listConnectivityEvents(kiosk.id, new Date(from).toISOString(), new Date(endMs).toISOString());
        const before = await lastConnectivityEventBefore(kiosk.id, new Date(from).toISOString());
        const result = computeUptime(
            events.map((event) => ({ type: event.type, at: Date.parse(event.occurredAt) })),
            from,
            endMs,
            before?.type === "went_offline",
        );

        rows.push({ kioskId: kiosk.id, name: kiosk.name, measured: true, ...result });
    }
    return ok({ range, rows });
});

// ======================= نوبت‌ها =======================

add("PATCH", "/appointments/:id", "admin", async (ctx) => {
    const id = idParam(ctx.params.id);
    const body = await readBody(ctx.request);
    const status = String(body.status ?? "");
    if (!STATUSES.includes(status)) throw new ApiError(400, "VALIDATION", "وضعیت نامعتبر است");

    const current = await getAppointmentAdmin(id);
    if (!current) throw new ApiError(404, "NOT_FOUND", "نوبت پیدا نشد");

    try {
        await updateAppointmentStatus(id, status);
    } catch (error) {
        if (isUniqueViolation(error)) {
            throw new ApiError(409, "DUPLICATE", "این بیمار همین پزشک را امروز نوبت فعال دیگری دارد");
        }
        throw error;
    }

    await audit(ctx, "appointment.status", `#${id}`, { from: current.status, to: status });
    return ok(publicAppointment((await getAppointmentAdmin(id)) as AppointmentRow));
});

add("POST", "/appointments/:id/reveal", "admin", async (ctx) => {
    const id = idParam(ctx.params.id);
    const row = await getAppointmentAdmin(id);
    if (!row) throw new ApiError(404, "NOT_FOUND", "نوبت پیدا نشد");

    const identity = identityOf(row, true);
    await audit(ctx, "appointment.reveal_identity", `#${id}`);
    return ok({ kind: identity?.kind ?? null, value: identity?.value ?? null });
});

// ======================= پزشکان، برنامه‌ها، استثناها =======================

add("GET", "/catalog", "viewer", async () => {
    const today = getTehranDateKey(getServerNow());
    return ok({
        today,
        specialties: await listSpecialties(),
        doctors: await listDoctors(),
        schedules: await listAllSchedules(),
        exceptions: await listExceptionsFrom(today),
    });
});

add("POST", "/specialties", "admin", async (ctx) => {
    const body = await readBody(ctx.request);
    const name = requiredStr(body, "name", "نام تخصص", { min: 2, max: 60 });
    const icon = str(body, "icon", "آیکن", { optional: true, max: 20 });
    const slugInput = str(body, "slug", "شناسه‌ی لاتین", { optional: true, max: 40 });
    if (slugInput && !/^[a-z0-9-]{2,40}$/.test(slugInput)) {
        throw new ApiError(400, "VALIDATION", "شناسه‌ی لاتین فقط حرف کوچک لاتین، عدد و - باشد");
    }

    try {
        const id = await createSpecialty({ name, slug: slugInput ?? `spec-${Date.now().toString(36)}`, icon });
        await audit(ctx, "specialty.create", name);
        return ok({ id }, { status: 201 });
    } catch (error) {
        if (isUniqueViolation(error)) throw new ApiError(409, "DUPLICATE", "شناسه‌ی لاتین تکراری است");
        throw error;
    }
});

add("PATCH", "/specialties/:id", "admin", async (ctx) => {
    const id = idParam(ctx.params.id);
    const body = await readBody(ctx.request);
    const patch: Parameters<typeof updateSpecialty>[1] = {};

    if ("name" in body) patch.name = requiredStr(body, "name", "نام تخصص", { min: 2, max: 60 });
    if ("icon" in body) patch.icon = str(body, "icon", "آیکن", { optional: true, max: 20 });
    const isActive = bool(body, "isActive", "فعال بودن");
    if (isActive !== undefined) patch.isActive = isActive;
    if ("sortOrder" in body) patch.sortOrder = int(body, "sortOrder", "ترتیب", { min: 0, max: 9999 }) as number;

    if (!(await updateSpecialty(id, patch))) throw new ApiError(404, "NOT_FOUND", "تخصص پیدا نشد");
    await audit(ctx, "specialty.update", `#${id}`, patch);
    return ok({ updated: true });
});

add("POST", "/doctors", "admin", async (ctx) => {
    const body = await readBody(ctx.request);
    const specialtyId = int(body, "specialtyId", "تخصص", { min: 1 }) as number;
    if (!(await getSpecialty(specialtyId))) throw new ApiError(400, "VALIDATION", "تخصص انتخاب‌شده وجود ندارد");

    const firstName = requiredStr(body, "firstName", "نام", { min: 1, max: 40 });
    const lastName = requiredStr(body, "lastName", "نام خانوادگی", { min: 1, max: 60 });
    const displayName =
        str(body, "displayName", "نام نمایشی", { optional: true, max: 100 }) ?? `دکتر ${firstName} ${lastName}`;

    const id = await createDoctor({
        specialtyId,
        firstName,
        lastName,
        displayName,
        requiresSurgeryHistory: bool(body, "requiresSurgeryHistory", "سؤال سابقه‌ی جراحی") ?? false,
    });
    await audit(ctx, "doctor.create", displayName);
    return ok({ id }, { status: 201 });
});

add("PATCH", "/doctors/:id", "admin", async (ctx) => {
    const id = idParam(ctx.params.id);
    const body = await readBody(ctx.request);
    const patch: Parameters<typeof updateDoctor>[1] = {};

    if ("specialtyId" in body) {
        patch.specialtyId = int(body, "specialtyId", "تخصص", { min: 1 }) as number;
        if (!(await getSpecialty(patch.specialtyId))) throw new ApiError(400, "VALIDATION", "تخصص انتخاب‌شده وجود ندارد");
    }
    if ("firstName" in body) patch.firstName = requiredStr(body, "firstName", "نام", { min: 1, max: 40 });
    if ("lastName" in body) patch.lastName = requiredStr(body, "lastName", "نام خانوادگی", { min: 1, max: 60 });
    if ("displayName" in body) patch.displayName = requiredStr(body, "displayName", "نام نمایشی", { min: 2, max: 100 });
    const surgery = bool(body, "requiresSurgeryHistory", "سؤال سابقه‌ی جراحی");
    if (surgery !== undefined) patch.requiresSurgeryHistory = surgery;
    const isActive = bool(body, "isActive", "فعال بودن");
    if (isActive !== undefined) patch.isActive = isActive;

    if (!(await updateDoctor(id, patch))) throw new ApiError(404, "NOT_FOUND", "پزشک پیدا نشد");
    await audit(ctx, "doctor.update", `#${id}`, patch);
    return ok({ updated: true });
});

function parseRanges(body: Record<string, unknown>): ScheduleRange[] {
    if (!Array.isArray(body.ranges)) throw new ApiError(400, "VALIDATION", "فهرست ساعت‌ها لازم است");
    if (body.ranges.length > 70) throw new ApiError(400, "VALIDATION", "تعداد بازه‌ها بیش از حد است");

    const ranges: ScheduleRange[] = body.ranges.map((raw: unknown) => {
        const item = (raw ?? {}) as Record<string, unknown>;
        const weekday = Number(item.weekday);
        if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
            throw new ApiError(400, "VALIDATION", "روز هفته باید ۰ (شنبه) تا ۶ (جمعه) باشد");
        }
        const startTime = hourMinute(item.startTime, "ساعت شروع");
        const endTime = hourMinute(item.endTime, "ساعت پایان");
        if (endTime <= startTime) throw new ApiError(400, "VALIDATION", "ساعت پایان باید بعد از شروع باشد");
        return { weekday, startTime, endTime };
    });

    const sorted = [...ranges].sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
    for (let i = 1; i < sorted.length; i += 1) {
        if (sorted[i].weekday === sorted[i - 1].weekday && sorted[i].startTime < sorted[i - 1].endTime) {
            throw new ApiError(400, "VALIDATION", "بازه‌های یک روز نباید هم‌پوشانی داشته باشند");
        }
    }
    return sorted;
}

add("PUT", "/doctors/:id/schedule", "admin", async (ctx) => {
    const id = idParam(ctx.params.id);
    if (!(await getDoctor(id))) throw new ApiError(404, "NOT_FOUND", "پزشک پیدا نشد");

    const ranges = parseRanges(await readBody(ctx.request));
    await withTransaction(() => replaceWeeklySchedule(id, ranges, getTehranDateKey(getServerNow())));
    await audit(ctx, "schedule.update", `#${id}`, { ranges: ranges.length });
    return ok({ updated: true, ranges: ranges.length });
});

add("POST", "/doctors/:id/exceptions", "admin", async (ctx) => {
    const id = idParam(ctx.params.id);
    if (!(await getDoctor(id))) throw new ApiError(404, "NOT_FOUND", "پزشک پیدا نشد");

    const body = await readBody(ctx.request);
    const today = getTehranDateKey(getServerNow());
    const date = isoDate(typeof body.date === "string" ? body.date : null, "تاریخ");
    if (date < today) throw new ApiError(400, "VALIDATION", "تاریخ استثنا نباید گذشته باشد");

    const type = body.type;
    if (type !== "disabled" && type !== "override") throw new ApiError(400, "VALIDATION", "نوع استثنا نامعتبر است");

    let startTime: string | null = null;
    let endTime: string | null = null;
    if (type === "override") {
        startTime = hourMinute(body.startTime, "ساعت شروع");
        endTime = hourMinute(body.endTime, "ساعت پایان");
        if (endTime <= startTime) throw new ApiError(400, "VALIDATION", "ساعت پایان باید بعد از شروع باشد");
    }

    const exceptionId = await withTransaction(() =>
        replaceException({
            doctorId: id,
            date,
            type,
            startTime,
            endTime,
            reason: str(body, "reason", "علت", { optional: true, max: 200 }),
        }),
    );
    await audit(ctx, "exception.add", `#${id} ${date}`, { type });
    return ok({ id: exceptionId }, { status: 201 });
});

add("POST", "/doctors/:id/absent-today", "admin", async (ctx) => {
    const id = idParam(ctx.params.id);
    if (!(await getDoctor(id))) throw new ApiError(404, "NOT_FOUND", "پزشک پیدا نشد");

    const today = getTehranDateKey(getServerNow());
    const exceptionId = await withTransaction(() =>
        replaceException({ doctorId: id, date: today, type: "disabled", startTime: null, endTime: null, reason: "غیبت امروز" }),
    );
    await audit(ctx, "exception.absent_today", `#${id}`);
    return ok({ id: exceptionId });
});

add("DELETE", "/exceptions/:id", "admin", async (ctx) => {
    const id = idParam(ctx.params.id);
    if (!(await deactivateException(id))) throw new ApiError(404, "NOT_FOUND", "استثنا پیدا نشد");
    await audit(ctx, "exception.remove", `#${id}`);
    return ok({ removed: true });
});

export { me, addDays };