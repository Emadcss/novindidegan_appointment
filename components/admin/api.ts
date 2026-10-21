/** کلاینت API پنل ادمین */

export class AdminApiError extends Error {
    readonly status: number;
    readonly code: string;

    constructor(message: string, status: number, code: string) {
        super(message);
        this.name = "AdminApiError";
        this.status = status;
        this.code = code;
    }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;

    try {
        response = await fetch(`/api/admin${path}`, {
            method,
            credentials: "same-origin",
            cache: "no-store",
            headers: { "Content-Type": "application/json", "X-Admin-Request": "1" },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
    } catch {
        throw new AdminApiError("ارتباط با سرور برقرار نشد", 0, "NETWORK");
    }

    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.success) {
        if (response.status === 401 && json?.code === "NOT_AUTHENTICATED") {
            window.dispatchEvent(new Event("admin:unauthorized"));
        }
        throw new AdminApiError(json?.message ?? "خطای ناشناخته", response.status, json?.code ?? "ERROR");
    }

    return json.data as T;
}

export const api = {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
    put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
    patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
    del: <T>(path: string) => request<T>("DELETE", path),
};