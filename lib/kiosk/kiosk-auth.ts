import { createHash, randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

import {
    completePairing,
    findKioskByPairingHash,
    findKioskByTokenHash,
    setPairingCode,
} from "@/lib/db/kiosk-repo";
import type { Kiosk } from "@/lib/db/kiosk-repo";
import { KioskError } from "@/lib/kiosk/errors";

/** هویت کیوسک (جفت‌سازی با کد یک‌بارمصرف و توکن در کوکی) */

export const KIOSK_COOKIE = "kiosk_token";
const PAIRING_TTL_MS = 24 * 3600_000;
// بدون حروف و ارقام گیج‌کننده (0 O 1 I L)
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const PAIRING_ATTEMPT_WINDOW_MS = 60_000;
const PAIRING_MAX_ATTEMPTS = 10;

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

export function normalizePairingCode(code: string): string {
    return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function generatePairingCode(): string {
    const bytes = randomBytes(8);
    let code = "";
    for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
    return code;
}

/** کد جفت‌سازی تازه برای یک کیوسک (کد قبلی باطل می‌شود). متن کد فقط همین‌جا برمی‌گردد. */
export async function issuePairingCode(kioskId: number): Promise<{ code: string; expiresAt: string }> {
    const code = generatePairingCode();
    const expiresAt = new Date(Date.now() + PAIRING_TTL_MS).toISOString();

    await setPairingCode(kioskId, sha256(code), expiresAt);
    return { code, expiresAt };
}

const globalForPair = globalThis as unknown as { __pairAttempts?: number[] };

function tooManyAttempts(): boolean {
    const attempts = (globalForPair.__pairAttempts ??= []);
    const cutoff = Date.now() - PAIRING_ATTEMPT_WINDOW_MS;

    while (attempts.length && attempts[0] < cutoff) attempts.shift();
    attempts.push(Date.now());

    return attempts.length > PAIRING_MAX_ATTEMPTS;
}

export type PairResult =
    | { ok: true; kiosk: Kiosk; token: string }
    | { ok: false; reason: "RATE_LIMITED" | "INVALID_CODE" };

/** کد را می‌پذیرد، توکن می‌سازد و کیوسک را جفت می‌کند (کد دیگر قابل استفاده نیست) */
export async function pairWithCode(rawCode: string): Promise<PairResult> {
    if (tooManyAttempts()) return { ok: false, reason: "RATE_LIMITED" };

    const code = normalizePairingCode(rawCode);
    if (code.length !== 8) return { ok: false, reason: "INVALID_CODE" };

    const now = new Date().toISOString();
    const kiosk = await findKioskByPairingHash(sha256(code), now);
    if (!kiosk) return { ok: false, reason: "INVALID_CODE" };

    const token = randomBytes(32).toString("hex");
    await completePairing(kiosk.id, sha256(token), now);

    return { ok: true, kiosk, token };
}

export function setKioskCookie(response: NextResponse, token: string): void {
    response.cookies.set({
        name: KIOSK_COOKIE,
        value: token,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 10 * 365 * 24 * 3600,
    });
}

/** کیوسکِ جفت‌شده‌ی این درخواست (یا null) */
export async function resolveKiosk(request: NextRequest): Promise<Kiosk | null> {
    const token = request.cookies.get(KIOSK_COOKIE)?.value;
    return token ? findKioskByTokenHash(sha256(token)) : null;
}

/** اگر REQUIRE_KIOSK_PAIRING=true باشد، فقط کیوسک‌های جفت‌شده مجازند */
export function pairingRequired(): boolean {
    return process.env.REQUIRE_KIOSK_PAIRING === "true";
}

export async function authorizeKiosk(request: NextRequest): Promise<Kiosk | null> {
    const kiosk = await resolveKiosk(request);

    if (!kiosk && pairingRequired()) {
        throw new KioskError("UNPAIRED", "این دستگاه به‌عنوان کیوسک ثبت نشده است. با مدیر سیستم تماس بگیرید.");
    }
    return kiosk;
}