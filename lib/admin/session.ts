import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "nd_admin_session";
const MAX_AGE_SEC = 60 * 60 * 12; // ۱۲ ساعت

function secret(): string {
    const s = process.env.ADMIN_SESSION_SECRET;
    if (!s || s.length < 16) {
        throw new Error("ADMIN_SESSION_SECRET تنظیم نشده است");
    }
    return s;
}

function sign(payload: string): string {
    return createHmac("sha256", secret()).update(payload).digest("hex");
}

export type AdminSession = {
    username: string;
    exp: number;
};

export function createSessionToken(username: string): string {
    const exp = Date.now() + MAX_AGE_SEC * 1000;
    const payload = Buffer.from(JSON.stringify({ username, exp })).toString(
        "base64url",
    );
    return `${payload}.${sign(payload)}`;
}

export function parseSessionToken(token: string): AdminSession | null {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;

    const expected = sign(payload);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    try {
        const data = JSON.parse(
            Buffer.from(payload, "base64url").toString("utf8"),
        ) as AdminSession;
        if (!data.username || !data.exp || data.exp < Date.now()) return null;
        return data;
    } catch {
        return null;
    }
}

export async function setAdminSession(username: string): Promise<void> {
    const jar = await cookies();
    jar.set(COOKIE, createSessionToken(username), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: MAX_AGE_SEC,
        secure: process.env.NODE_ENV === "production",
    });
}

export async function clearAdminSession(): Promise<void> {
    const jar = await cookies();
    jar.delete(COOKIE);
}

export async function getAdminSession(): Promise<AdminSession | null> {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return null;
    return parseSessionToken(token);
}

export async function requireAdminSession(): Promise<AdminSession> {
    const session = await getAdminSession();
    if (!session) {
        throw new Error("UNAUTHORIZED");
    }
    return session;
}