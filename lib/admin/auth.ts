import { createHash, randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

import {
    clearLoginFailures,
    countAdmins,
    createAdmin,
    createSession,
    deleteExpiredSessions,
    deleteSession,
    extendSession,
    findAdminByUsername,
    findSession,
    publicAdmin,
    recordLoginFailure,
    recordLoginSuccess,
    writeAudit,
} from "@/lib/db/admin-repo";
import type { AdminRole, AdminUser } from "@/lib/db/admin-repo";
import { ApiError, isSecureRequest } from "@/lib/admin/http";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/admin/password";

export const SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 12 * 3600_000;
const EXTEND_WHEN_BELOW_MS = 6 * 3600_000;
const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 10 * 60_000;

export const hashToken = (token: string): string =>
    createHash("sha256").update(token).digest("hex");

export function normalizeUsername(raw: string): string {
    return raw.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
    return /^[a-z0-9_.-]{3,32}$/.test(username)
        ? null
        : "نام کاربری باید ۳ تا ۳۲ نویسه‌ی لاتین (حرف کوچک، عدد، _ . -) باشد";
}

// یک هش ساختگی تا زمان پاسخ برای کاربر ناموجود هم مثل کاربر موجود باشد
const DUMMY_HASH_PROMISE = hashPassword("dummy-password-for-timing");

export type AuthInfo = { admin: AdminUser; tokenHash: string };

/** از کوکی نشست، ادمین را پیدا می‌کند (و نشست را تمدید). null = وارد نشده */
export async function authenticate(request: NextRequest): Promise<AuthInfo | null> {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const tokenHash = hashToken(token);
    const now = new Date();
    const found = await findSession(tokenHash, now.toISOString());

    if (!found || !found.admin.isActive) return null;

    const remaining = new Date(found.expiresAt).getTime() - now.getTime();
    if (remaining < EXTEND_WHEN_BELOW_MS) {
        await extendSession(found.sessionId, new Date(now.getTime() + SESSION_TTL_MS).toISOString());
    }

    return { admin: publicAdmin(found.admin), tokenHash };
}

export async function login(
    usernameRaw: string,
    password: string,
    userAgent: string | null,
): Promise<{ token: string; admin: AdminUser }> {
    const username = normalizeUsername(usernameRaw);
    const user = await findAdminByUsername(username);
    const generic = new ApiError(401, "BAD_CREDENTIALS", "نام کاربری یا رمز عبور اشتباه است");

    if (!user) {
        await verifyPassword(password, await DUMMY_HASH_PROMISE);
        throw generic;
    }

    const now = new Date();

    if (user.lockedUntil && new Date(user.lockedUntil) > now) {
        const minutes = Math.ceil((new Date(user.lockedUntil).getTime() - now.getTime()) / 60_000);
        throw new ApiError(
            429,
            "LOCKED",
            `به‌علت چند بار رمز اشتباه، ورود تا ${minutes} دقیقه‌ی دیگر قفل است`,
        );
    }
    if (user.lockedUntil) await clearLoginFailures(user.id); // قفل تمام شده است

    const passwordOk = await verifyPassword(password, user.passwordHash);

    if (!passwordOk || !user.isActive) {
        if (user.isActive) {
            const result = await recordLoginFailure(
                user.id,
                MAX_FAILED_LOGINS,
                new Date(now.getTime() + LOCK_MS).toISOString(),
            );
            await writeAudit({ adminId: user.id, adminUsername: user.username, action: "login_failed" });

            if (result.lockedUntil && new Date(result.lockedUntil) > now) {
                throw new ApiError(
                    429,
                    "LOCKED",
                    "به‌علت چند بار رمز اشتباه، ورود ۱۰ دقیقه قفل شد",
                );
            }
        }
        throw generic;
    }

    await recordLoginSuccess(user.id, now.toISOString());

    const token = randomBytes(32).toString("hex");
    await createSession({
        adminId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
        userAgent: userAgent?.slice(0, 200) ?? null,
    });
    await deleteExpiredSessions(now.toISOString());
    await writeAudit({ adminId: user.id, adminUsername: user.username, action: "login" });

    return { token, admin: publicAdmin(user) };
}

export async function logout(tokenHash: string, admin: AdminUser): Promise<void> {
    await deleteSession(tokenHash);
    await writeAudit({ adminId: admin.id, adminUsername: admin.username, action: "logout" });
}

/** اولین مدیر؛ فقط وقتی هیچ کاربری وجود ندارد */
export async function createFirstAdmin(input: {
    username: string;
    displayName: string;
    password: string;
}): Promise<AdminUser> {
    if ((await countAdmins()) > 0) {
        throw new ApiError(409, "ALREADY_SETUP", "مدیر اولیه قبلاً ساخته شده است");
    }
    return createUser({ ...input, role: "admin" });
}

export async function createUser(input: {
    username: string;
    displayName: string;
    password: string;
    role: AdminRole;
}): Promise<AdminUser> {
    const username = normalizeUsername(input.username);
    const problem = validateUsername(username) ?? validatePassword(input.password);
    if (problem) throw new ApiError(400, "VALIDATION", problem);

    const created = await createAdmin({
        username,
        displayName: input.displayName,
        passwordHash: await hashPassword(input.password),
        role: input.role,
    });
    return publicAdmin(created);
}

export function setSessionCookie(response: NextResponse, request: NextRequest, token: string): void {
    response.cookies.set({
        name: SESSION_COOKIE,
        value: token,
        httpOnly: true,
        sameSite: "lax",
        secure: isSecureRequest(request),
        path: "/",
        maxAge: SESSION_TTL_MS / 1000,
    });
}

export function clearSessionCookie(response: NextResponse, request: NextRequest): void {
    response.cookies.set({
        name: SESSION_COOKIE,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: isSecureRequest(request),
        path: "/",
        maxAge: 0,
    });
}