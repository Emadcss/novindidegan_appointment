import { withTransaction, isUniqueViolation } from "@/lib/db/connection";
import {
    countActiveAdmins,
    countAdmins,
    deleteSessionsForAdmin,
    getAdmin,
    listAdmins,
    listAudit,
    updateAdmin,
    writeAudit,
} from "@/lib/db/admin-repo";
import type { AdminRole } from "@/lib/db/admin-repo";
import {
    acknowledgeAlert,
    addKioskEvent,
    countUnresolvedAlerts,
    createKiosk,
    getKiosk,
    listAlerts,
    listKioskEvents,
    listKiosks,
    listUnresolvedAlertsForKiosk,
    revokeKioskToken,
    updateKiosk,
} from "@/lib/db/kiosk-repo";
import type { Kiosk, KioskInput } from "@/lib/db/kiosk-repo";
import { listDoctors } from "@/lib/db/repositories";
import { lastNumbersForDay, summaryReport } from "@/lib/db/report-repo";
import {
    clearSessionCookie,
    createFirstAdmin,
    createUser,
    login,
    logout,
    setSessionCookie,
} from "@/lib/admin/auth";
import {
    ApiError,
    bool,
    hostAddress,
    idParam,
    int,
    ok,
    readBody,
    requiredStr,
    str,
} from "@/lib/admin/http";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/admin/password";
import { add } from "@/lib/admin/router";
import type { Ctx } from "@/lib/admin/router";
import { issuePairingCode } from "@/lib/kiosk/kiosk-auth";
import { isDoctorAvailableNow } from "@/lib/kiosk/schedule-service";
import { MONITOR } from "@/lib/monitoring/config";
import { checkKioskNow } from "@/lib/monitoring/monitor";
import { getServerNow } from "@/lib/time/server-clock";
import { getTehranDateKey } from "@/lib/time/tehran-time";
import { addDays } from "@/lib/utils/jalali";

const me = (ctx: Ctx) => (ctx.auth as NonNullable<Ctx["auth"]>).admin;

async function audit(ctx: Ctx, action: string, target?: string, details?: unknown): Promise<void> {
    const admin = ctx.auth?.admin;
    await writeAudit({
        adminId: admin?.id ?? null,
        adminUsername: admin?.username ?? null,
        action,
        target: target ?? null,
        details: details === undefined ? null : JSON.stringify(details),
    });
}

// ======================= احراز هویت =======================

add("GET", "/auth/state", "public", async (ctx) =>
    ok({
        setupRequired: (await countAdmins()) === 0,
        authenticated: ctx.auth !== null,
        user: ctx.auth?.admin ?? null,
    }),
);

add("POST", "/auth/setup", "public", async (ctx) => {
    const body = await readBody(ctx.request);
    const admin = await createFirstAdmin({
        username: requiredStr(body, "username", "نام کاربری", { min: 3, max: 32 }),
        displayName: requiredStr(body, "displayName", "نام نمایشی", { min: 2, max: 60 }),
        password: String(body.password ?? ""),
    });
    await audit({ ...ctx, auth: { admin, tokenHash: "" } }, "setup", admin.username);

    const session = await login(admin.username, String(body.password), ctx.request.headers.get("user-agent"));
    const response = ok({ user: session.admin });
    setSessionCookie(response, ctx.request, session.token);
    return response;
});

add("POST", "/auth/login", "public", async (ctx) => {
    const body = await readBody(ctx.request);
    const session = await login(
        String(body.username ?? ""),
        String(body.password ?? ""),
        ctx.request.headers.get("user-agent"),
    );
    const response = ok({ user: session.admin });
    setSessionCookie(response, ctx.request, session.token);
    return response;
});

add("POST", "/auth/logout", "viewer", async (ctx) => {
    const auth = ctx.auth as NonNullable<Ctx["auth"]>;
    await logout(auth.tokenHash, auth.admin);
    const response = ok({ loggedOut: true });
    clearSessionCookie(response, ctx.request);
    return response;
});

add("POST", "/auth/change-password", "viewer", async (ctx) => {
    const admin = me(ctx);
    const body = await readBody(ctx.request);
    const full = await getAdmin(admin.id);

    if (!full || !(await verifyPassword(String(body.currentPassword ?? ""), full.passwordHash))) {
        throw new ApiError(400, "BAD_CREDENTIALS", "رمز فعلی اشتباه است");
    }
    const problem = validatePassword(String(body.newPassword ?? ""));
    if (problem) throw new ApiError(400, "VALIDATION", problem);

    await updateAdmin(admin.id, { passwordHash: await hashPassword(String(body.newPassword)) });
    await audit(ctx, "password.change", admin.username);
    return ok({ changed: true });
});

// ======================= کیوسک‌ها =======================

function describeKiosk(kiosk: Kiosk, now: number) {
    const secondsSinceSeen =
        kiosk.lastSeenAt === null ? null : Math.max(0, Math.round((now - new Date(kiosk.lastSeenAt).getTime()) / 1000));

    return { ...kiosk, secondsSinceSeen };
}

function parseKioskInput(body: Record<string, unknown>, partial: boolean): Partial<KioskInput> {
    const has = (key: string) => !partial || key in body;
    const result: Partial<KioskInput> = {};

    if (has("name")) result.name = requiredStr(body, "name", "نام کیوسک", { min: 2, max: 60 });
    if (has("location")) result.location = str(body, "location", "مکان", { optional: true, max: 100 });
    if (has("ipAddress")) result.ipAddress = hostAddress(body, "ipAddress", "نشانی IP کیوسک");
    if (has("port")) result.port = int(body, "port", "پورت کیوسک", { min: 1, max: 65535, optional: true });
    if (has("printerIp")) result.printerIp = hostAddress(body, "printerIp", "نشانی IP چاپگر");
    if (has("printerPort")) {
        result.printerPort = int(body, "printerPort", "پورت چاپگر", { min: 1, max: 65535, optional: true });
    }
    if (has("notes")) result.notes = str(body, "notes", "توضیحات", { optional: true, max: 500 });

    return result;
}

async function mustGetKiosk(idText: string | undefined): Promise<Kiosk> {
    const kiosk = await getKiosk(idParam(idText));
    if (!kiosk) throw new ApiError(404, "NOT_FOUND", "کیوسک پیدا نشد");
    return kiosk;
}

const duplicateName = () => new ApiError(409, "DUPLICATE_NAME", "کیوسکی با این نام وجود دارد");

add("GET", "/kiosks", "viewer", async () => {
    const now = Date.now();
    return ok((await listKiosks()).map((kiosk) => describeKiosk(kiosk, now)));
});

add("POST", "/kiosks", "admin", async (ctx) => {
    const input = parseKioskInput(await readBody(ctx.request), false) as KioskInput;

    try {
        const kiosk = await createKiosk({
            name: input.name,
            location: input.location ?? null,
            ipAddress: input.ipAddress ?? null,
            port: input.port ?? null,
            printerIp: input.printerIp ?? null,
            printerPort: input.printerPort ?? null,
            notes: input.notes ?? null,
        });
        await audit(ctx, "kiosk.create", kiosk.name);
        return ok(describeKiosk(kiosk, Date.now()), { status: 201 });
    } catch (error) {
        if (isUniqueViolation(error)) throw duplicateName();
        throw error;
    }
});

add("GET", "/kiosks/:id", "viewer", async (ctx) => {
    const kiosk = await mustGetKiosk(ctx.params.id);
    return ok({
        kiosk: describeKiosk(kiosk, Date.now()),
        events: await listKioskEvents(kiosk.id, 50),
        alerts: await listUnresolvedAlertsForKiosk(kiosk.id),
    });
});

add("PATCH", "/kiosks/:id", "admin", async (ctx) => {
    const kiosk = await mustGetKiosk(ctx.params.id);
    const body = await readBody(ctx.request);
    const patch: Partial<KioskInput> & { isActive?: boolean } = parseKioskInput(body, true);
    const isActive = bool(body, "isActive", "فعال بودن");
    if (isActive !== undefined) patch.isActive = isActive;

    try {
        await updateKiosk(kiosk.id, patch);
    } catch (error) {
        if (isUniqueViolation(error)) throw duplicateName();
        throw error;
    }

    await audit(ctx, "kiosk.update", kiosk.name, patch);
    return ok(describeKiosk((await getKiosk(kiosk.id)) as Kiosk, Date.now()));
});

add("POST", "/kiosks/:id/pairing-code", "admin", async (ctx) => {
    const kiosk = await mustGetKiosk(ctx.params.id);
    if (!kiosk.isActive) throw new ApiError(409, "INACTIVE", "کیوسک غیرفعال است");

    const { code, expiresAt } = await issuePairingCode(kiosk.id);
    await addKioskEvent({
        kioskId: kiosk.id,
        type: "pairing_code",
        severity: "info",
        message: `کد جفت‌سازی صادر شد (توسط ${me(ctx).username})`,
    });
    await audit(ctx, "kiosk.pairing_code", kiosk.name);

    return ok({ code, displayCode: `${code.slice(0, 4)}-${code.slice(4)}`, expiresAt });
});

add("POST", "/kiosks/:id/revoke", "admin", async (ctx) => {
    const kiosk = await mustGetKiosk(ctx.params.id);
    await revokeKioskToken(kiosk.id);
    await addKioskEvent({
        kioskId: kiosk.id,
        type: "revoked",
        severity: "warning",
        message: `جفت‌سازی کیوسک باطل شد (توسط ${me(ctx).username})`,
    });
    await audit(ctx, "kiosk.revoke", kiosk.name);
    return ok({ revoked: true });
});

add("POST", "/kiosks/:id/check", "admin", async (ctx) => {
    const kiosk = await mustGetKiosk(ctx.params.id);
    const updated = await checkKioskNow(kiosk.id);
    return ok(describeKiosk(updated as Kiosk, Date.now()));
});

// ======================= پایش و هشدارها =======================

add("GET", "/monitoring", "viewer", async () => {
    const now = Date.now();
    const kiosks = (await listKiosks()).map((kiosk) => describeKiosk(kiosk, now));
    const counts: Record<string, number> = {};
    for (const kiosk of kiosks) counts[kiosk.statusState] = (counts[kiosk.statusState] ?? 0) + 1;

    return ok({
        serverTime: new Date(now).toISOString(),
        kiosks,
        stateCounts: counts,
        alerts: await listAlerts({ status: "unresolved", limit: 100 }),
        alertCounts: await countUnresolvedAlerts(),
        thresholds: {
            offlineAfterSec: MONITOR.offlineAfterMs / 1000,
            heartbeatIntervalSec: MONITOR.heartbeatIntervalMs / 1000,
            cycleSec: MONITOR.cycleMs / 1000,
        },
        webhookConfigured: Boolean(process.env.ALERT_WEBHOOK_URL?.trim()),
    });
});

add("GET", "/alerts", "viewer", async (ctx) => {
    const status = ctx.url.searchParams.get("status");
    const limit = Number(ctx.url.searchParams.get("limit") ?? 100);

    return ok(
        await listAlerts({
            status: status === "resolved" ? "resolved" : status === "all" ? undefined : "unresolved",
            limit: Number.isFinite(limit) ? limit : 100,
        }),
    );
});

add("POST", "/alerts/:id/ack", "admin", async (ctx) => {
    const id = idParam(ctx.params.id);
    const acknowledged = await acknowledgeAlert(id, me(ctx).username, new Date().toISOString());
    if (!acknowledged) throw new ApiError(409, "NOT_OPEN", "هشدار باز نیست (قبلاً تأیید یا برطرف شده)");

    await audit(ctx, "alert.ack", String(id));
    return ok({ acknowledged: true });
});

// ======================= داشبورد =======================

add("GET", "/dashboard", "viewer", async () => {
    const now = getServerNow();
    const today = getTehranDateKey(now);
    const [todaySummary, weekSummary, doctors, lastNumbers, kiosks] = await Promise.all([
        summaryReport({ from: today, to: today }),
        summaryReport({ from: addDays(today, -6), to: today }),
        listDoctors(),
        lastNumbersForDay(today),
        listKiosks(),
    ]);

    const perDay = new Map(weekSummary.byDay.map((item) => [item.date, item.total]));
    const week = Array.from({ length: 7 }, (_, index) => {
        const date = addDays(today, index - 6);
        return { date, total: perDay.get(date) ?? 0 };
    });

    const doctorRows = await Promise.all(
        doctors
            .filter((doctor) => doctor.isActive)
            .map(async (doctor) => {
                const counts = todaySummary.byDoctor.find((item) => item.doctorId === doctor.id);
                return {
                    doctorId: doctor.id,
                    name: doctor.displayName,
                    presentNow: await isDoctorAvailableNow(doctor.id, now),
                    lastNumber: lastNumbers.get(doctor.id) ?? 0,
                    booked: counts?.booked ?? 0,
                    completed: counts?.completed ?? 0,
                };
            }),
    );

    const kioskCounts: Record<string, number> = {};
    for (const kiosk of kiosks) kioskCounts[kiosk.statusState] = (kioskCounts[kiosk.statusState] ?? 0) + 1;

    return ok({
        today,
        todayTotals: todaySummary.totals,
        week,
        doctors: doctorRows,
        kioskCounts,
        kioskTotal: kiosks.length,
        alertCounts: await countUnresolvedAlerts(),
        latestAlerts: await listAlerts({ status: "unresolved", limit: 5 }),
    });
});

// ======================= کاربران و ممیزی =======================

add("GET", "/users", "admin", async () => ok(await listAdmins()));

add("POST", "/users", "admin", async (ctx) => {
    const body = await readBody(ctx.request);
    const role = String(body.role ?? "viewer");
    if (role !== "admin" && role !== "viewer") throw new ApiError(400, "VALIDATION", "نقش نامعتبر است");

    try {
        const user = await createUser({
            username: requiredStr(body, "username", "نام کاربری", { min: 3, max: 32 }),
            displayName: requiredStr(body, "displayName", "نام نمایشی", { min: 2, max: 60 }),
            password: String(body.password ?? ""),
            role,
        });
        await audit(ctx, "user.create", user.username, { role });
        return ok(user, { status: 201 });
    } catch (error) {
        if (isUniqueViolation(error)) throw new ApiError(409, "DUPLICATE_USERNAME", "این نام کاربری قبلاً ثبت شده است");
        throw error;
    }
});

add("PATCH", "/users/:id", "admin", async (ctx) => {
    const id = idParam(ctx.params.id);
    const target = await getAdmin(id);
    if (!target) throw new ApiError(404, "NOT_FOUND", "کاربر پیدا نشد");

    const body = await readBody(ctx.request);
    const patch: { displayName?: string; role?: AdminRole; isActive?: boolean; passwordHash?: string } = {};

    if ("displayName" in body) patch.displayName = requiredStr(body, "displayName", "نام نمایشی", { min: 2, max: 60 });
    if ("role" in body) {
        if (body.role !== "admin" && body.role !== "viewer") throw new ApiError(400, "VALIDATION", "نقش نامعتبر است");
        patch.role = body.role;
    }
    const isActive = bool(body, "isActive", "فعال بودن");
    if (isActive !== undefined) patch.isActive = isActive;
    if ("password" in body) {
        const problem = validatePassword(String(body.password));
        if (problem) throw new ApiError(400, "VALIDATION", problem);
        patch.passwordHash = await hashPassword(String(body.password));
    }

    // نباید سیستم بدون مدیر فعال بماند و کسی نباید خودش را غیرفعال کند
    const losesAdmin =
        target.isActive &&
        target.role === "admin" &&
        (patch.isActive === false || (patch.role !== undefined && patch.role !== "admin"));
    if (losesAdmin) {
        if (target.id === me(ctx).id) throw new ApiError(409, "SELF", "نمی‌توانید نقش یا فعال بودن خودتان را کم کنید");
        if ((await countActiveAdmins()) <= 1) throw new ApiError(409, "LAST_ADMIN", "حداقل یک مدیر فعال باید بماند");
    }

    await withTransaction(async () => {
        await updateAdmin(id, patch);
        if (patch.isActive === false || patch.passwordHash || patch.role !== undefined) {
            await deleteSessionsForAdmin(id);
        }
    });

    await audit(ctx, "user.update", target.username, { ...patch, passwordHash: undefined, password: undefined });
    return ok((await listAdmins()).find((user) => user.id === id));
});

add("GET", "/audit", "admin", async (ctx) => {
    const limit = Number(ctx.url.searchParams.get("limit") ?? 100);
    return ok(await listAudit(Number.isFinite(limit) ? limit : 100));
});

export { audit, me };