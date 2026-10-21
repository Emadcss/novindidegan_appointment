import { NextRequest, NextResponse } from "next/server";

import { isKioskError } from "@/lib/kiosk/errors";

export class ApiError extends Error {
    readonly status: number;
    readonly code: string;

    constructor(status: number, code: string, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
    }
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
    return NextResponse.json({ success: true, data }, init);
}

export function fail(status: number, code: string, message: string): NextResponse {
    return NextResponse.json({ success: false, code, message }, { status });
}

/** خطای شناخته‌شده → پاسخ؛ خطای ناشناخته فقط لاگ می‌شود و پیام داخلی به کاربر نمی‌رسد */
export function errorToResponse(error: unknown, label: string): NextResponse {
    if (error instanceof ApiError) return fail(error.status, error.code, error.message);
    if (isKioskError(error)) return fail(error.status, error.code, error.message);

    console.error(label, error);
    return fail(500, "INTERNAL", "خطای داخلی سرور");
}

// ---------------- امنیت درخواست ----------------

function hostnameOf(hostHeader: string): string {
    const host = hostHeader.trim().toLowerCase();

    if (host.startsWith("[")) {
        return host.slice(0, host.indexOf("]") + 1);
    }
    return host.split(":")[0];
}

/**
 * پنل ادمین فقط از نام‌های میزبان مجاز باز می‌شود (پیش‌فرض: خود سرور).
 * کیوسک‌ها با نشانی IP شبکه به سرور وصل می‌شوند، پس نمی‌توانند /admin را باز کنند.
 * ⚠ این یک لایه‌ی کمکی است (هدر Host از راه برنامه‌نویسی قابل جعل است)؛ حفاظت اصلی ورود با رمز
 * و بستن دسترسی شبکه است.
 */
export function assertAdminHost(request: NextRequest): void {
    const configuredHosts = (process.env.ADMIN_ALLOWED_HOSTS ?? "localhost,127.0.0.1,[::1]")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
    const vercelProductionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ?.trim()
        .toLowerCase();
    const allowed = new Set([
        ...configuredHosts,
        ...(vercelProductionHost ? [vercelProductionHost] : []),
    ]);
    const host = hostnameOf(request.headers.get("host") ?? "");

    if (!allowed.has(host)) {
        throw new ApiError(
            403,
            "HOST_NOT_ALLOWED",
            "پنل ادمین از این نشانی در دسترس نیست. از خود سیستم میزبان وارد شوید.",
        );
    }
}

/** درخواست‌های تغییر‌دهنده باید از خود پنل بیایند (محافظ CSRF) */
export function assertSameOrigin(request: NextRequest): void {
    if (request.headers.get("x-admin-request") !== "1") {
        throw new ApiError(403, "CSRF", "درخواست نامعتبر است");
    }

    const origin = request.headers.get("origin");
    if (origin) {
        const host = request.headers.get("host");
        let originHost = "";
        try {
            originHost = new URL(origin).host;
        } catch {
            // مبدأ نامعتبر
        }
        if (!host || originHost !== host) {
            throw new ApiError(403, "CSRF", "مبدأ درخواست نامعتبر است");
        }
    }
}

export function isSecureRequest(request: NextRequest): boolean {
    return (
        request.nextUrl.protocol === "https:" ||
        request.headers.get("x-forwarded-proto") === "https"
    );
}

// ---------------- خواندن و اعتبارسنجی ورودی ----------------

export async function readBody(request: NextRequest): Promise<Record<string, unknown>> {
    const body: unknown = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new ApiError(400, "VALIDATION", "درخواست نامعتبر است");
    }
    return body as Record<string, unknown>;
}

const invalid = (label: string, why: string) =>
    new ApiError(400, "VALIDATION", `${label}: ${why}`);

export function str(
    body: Record<string, unknown>,
    key: string,
    label: string,
    options: { min?: number; max?: number; optional?: boolean } = {},
): string | null {
    const raw = body[key];

    if (raw === undefined || raw === null || raw === "") {
        if (options.optional) return null;
        throw invalid(label, "الزامی است");
    }
    if (typeof raw !== "string") throw invalid(label, "باید متن باشد");

    const value = raw.trim();
    if (options.min !== undefined && value.length < options.min) {
        throw invalid(label, `حداقل ${options.min} کاراکتر`);
    }
    if (options.max !== undefined && value.length > options.max) {
        throw invalid(label, `حداکثر ${options.max} کاراکتر`);
    }
    if (value === "" && !options.optional) throw invalid(label, "الزامی است");

    return value === "" ? null : value;
}

export function requiredStr(
    body: Record<string, unknown>,
    key: string,
    label: string,
    options: { min?: number; max?: number } = {},
): string {
    return str(body, key, label, options) as string;
}

export function int(
    body: Record<string, unknown>,
    key: string,
    label: string,
    options: { min?: number; max?: number; optional?: boolean } = {},
): number | null {
    const raw = body[key];

    if (raw === undefined || raw === null || raw === "") {
        if (options.optional) return null;
        throw invalid(label, "الزامی است");
    }

    const value = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
    if (typeof value !== "number" || !Number.isInteger(value)) {
        throw invalid(label, "باید عدد صحیح باشد");
    }
    if (options.min !== undefined && value < options.min) throw invalid(label, `حداقل ${options.min}`);
    if (options.max !== undefined && value > options.max) throw invalid(label, `حداکثر ${options.max}`);

    return value;
}

export function bool(body: Record<string, unknown>, key: string, label: string): boolean | undefined {
    const raw = body[key];
    if (raw === undefined) return undefined;
    if (typeof raw !== "boolean") throw invalid(label, "باید درست/نادرست باشد");
    return raw;
}

/** شناسه‌ی عددی از مسیر */
export function idParam(value: string | undefined): number {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "VALIDATION", "شناسه‌ی نامعتبر");
    return id;
}

const HOST_PATTERN =
    /^(?:(?:\d{1,3}\.){3}\d{1,3}|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/;

/** نشانی IPv4 یا نام میزبان */
export function hostAddress(
    body: Record<string, unknown>,
    key: string,
    label: string,
): string | null {
    const value = str(body, key, label, { optional: true, max: 253 });
    if (value === null) return null;

    if (!HOST_PATTERN.test(value)) throw invalid(label, "نشانی IP یا نام میزبان معتبر نیست");

    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value) && value.split(".").some((part) => Number(part) > 255)) {
        throw invalid(label, "هر بخش نشانی IP باید ۰ تا ۲۵۵ باشد");
    }
    return value;
}

export function isoDate(
    value: string | null | undefined,
    label: string,
    fallback?: string,
): string {
    const text = value ?? fallback;
    if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text))) {
        throw invalid(label, "تاریخ معتبر نیست");
    }
    return text;
}

export function hourMinute(value: unknown, label: string): string {
    if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
        throw invalid(label, "ساعت باید به شکل HH:MM باشد");
    }
    return value;
}