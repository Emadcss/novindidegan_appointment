import type { NextRequest } from "next/server";

import { authenticate } from "@/lib/admin/auth";
import type { AuthInfo } from "@/lib/admin/auth";
import {
    ApiError,
    assertAdminHost,
    assertSameOrigin,
    errorToResponse,
} from "@/lib/admin/http";

export type Access = "public" | "viewer" | "admin";

export type Ctx = {
    request: NextRequest;
    url: URL;
    params: Record<string, string>;
    auth: AuthInfo | null;
};

export type Handler = (ctx: Ctx) => Promise<Response>;

type Route = {
    method: string;
    pattern: RegExp;
    keys: string[];
    access: Access;
    handler: Handler;
};

const routes: Route[] = [];

/** مسیر مثل «/kiosks/:id/check»؛ نقطه در مسیر عادی است (مثل export.csv) */
export function add(method: string, path: string, access: Access, handler: Handler): void {
    const keys: string[] = [];
    const source = path
        .replace(/[.]/g, "\\.")
        .replace(/:([a-zA-Z]+)/g, (_match, key: string) => {
            keys.push(key);
            return "([^/]+)";
        });

    routes.push({ method, pattern: new RegExp(`^${source}/?$`), keys, access, handler });
}

/** نقطه‌ی ورود همه‌ی درخواست‌های /api/admin/* */
export async function handleAdminRequest(request: NextRequest): Promise<Response> {
    try {
        assertAdminHost(request);

        const url = new URL(request.url);
        const path = url.pathname.replace(/^\/api\/admin/, "") || "/";
        const method = request.method.toUpperCase();

        let matched: { route: Route; params: Record<string, string> } | null = null;
        let pathExists = false;

        for (const route of routes) {
            const match = route.pattern.exec(path);
            if (!match) continue;

            pathExists = true;
            if (route.method !== method) continue;

            const params: Record<string, string> = {};
            route.keys.forEach((key, index) => {
                params[key] = decodeURIComponent(match[index + 1]);
            });
            matched = { route, params };
            break;
        }

        if (!matched) {
            throw pathExists
                ? new ApiError(405, "METHOD_NOT_ALLOWED", "روش درخواست مجاز نیست")
                : new ApiError(404, "NOT_FOUND", "مسیر پیدا نشد");
        }

        if (method !== "GET" && method !== "HEAD") assertSameOrigin(request);

        const auth = await authenticate(request);
        const { route, params } = matched;

        if (route.access !== "public") {
            if (!auth) throw new ApiError(401, "NOT_AUTHENTICATED", "ابتدا وارد شوید");
            if (route.access === "admin" && auth.admin.role !== "admin") {
                throw new ApiError(403, "FORBIDDEN", "دسترسی شما برای این کار کافی نیست");
            }
        }

        return await route.handler({ request, url, params, auth });
    } catch (error) {
        return errorToResponse(error, "خطا در /api/admin:");
    }
}