import { query } from "@/lib/db/connection";
import type { Row } from "@/lib/db/connection";
import { toBool, toIso } from "@/lib/db/util";

/** کاربران پنل ادمین، نشست‌ها و گزارش ممیزی (audit) */

export type AdminRole = "admin" | "viewer";

export type AdminUser = {
    id: number;
    username: string;
    displayName: string;
    role: AdminRole;
    isActive: boolean;
    failedLogins: number;
    lockedUntil: string | null;
    lastLoginAt: string | null;
    createdAt: string;
};

export type AdminUserWithHash = AdminUser & { passwordHash: string };

function toAdmin(row: Row): AdminUserWithHash {
    return {
        id: Number(row.id),
        username: String(row.username),
        displayName: String(row.display_name),
        passwordHash: String(row.password_hash),
        role: String(row.role) as AdminRole,
        isActive: toBool(row.is_active),
        failedLogins: Number(row.failed_logins),
        lockedUntil: toIso(row.locked_until),
        lastLoginAt: toIso(row.last_login_at),
        createdAt: toIso(row.created_at) as string,
    };
}

/** بدون هش رمز؛ برای ارسال به رابط */
export function publicAdmin(user: AdminUserWithHash): AdminUser {
    const { passwordHash: _hash, ...rest } = user;
    void _hash;
    return rest;
}

export async function countAdmins(): Promise<number> {
    const rows = await query("SELECT COUNT(*) AS n FROM admin_users");
    return Number(rows[0]?.n ?? 0);
}

export async function countActiveAdmins(): Promise<number> {
    const rows = await query(
        "SELECT COUNT(*) AS n FROM admin_users WHERE role = 'admin' AND is_active = TRUE",
    );
    return Number(rows[0]?.n ?? 0);
}

export async function findAdminByUsername(
    username: string,
): Promise<AdminUserWithHash | null> {
    const rows = await query("SELECT * FROM admin_users WHERE username = $1", [username]);
    return rows[0] ? toAdmin(rows[0]) : null;
}

export async function getAdmin(id: number): Promise<AdminUserWithHash | null> {
    const rows = await query("SELECT * FROM admin_users WHERE id = $1", [id]);
    return rows[0] ? toAdmin(rows[0]) : null;
}

export async function listAdmins(): Promise<AdminUser[]> {
    const rows = await query("SELECT * FROM admin_users ORDER BY id");
    return rows.map((row) => publicAdmin(toAdmin(row)));
}

export async function createAdmin(input: {
    username: string;
    displayName: string;
    passwordHash: string;
    role: AdminRole;
}): Promise<AdminUserWithHash> {
    const rows = await query(
        `INSERT INTO admin_users (username, display_name, password_hash, role, created_at)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [input.username, input.displayName, input.passwordHash, input.role, new Date().toISOString()],
    );
    return toAdmin(rows[0]);
}

export async function updateAdmin(
    id: number,
    patch: {
        displayName?: string;
        role?: AdminRole;
        isActive?: boolean;
        passwordHash?: string;
    },
): Promise<void> {
    const sets: string[] = [];
    const params: (string | number | boolean | null)[] = [];
    const add = (column: string, value: string | number | boolean | null) => {
        params.push(value);
        sets.push(`${column} = $${params.length}`);
    };

    if (patch.displayName !== undefined) add("display_name", patch.displayName);
    if (patch.role !== undefined) add("role", patch.role);
    if (patch.isActive !== undefined) add("is_active", patch.isActive);
    if (patch.passwordHash !== undefined) {
        add("password_hash", patch.passwordHash);
        add("failed_logins", 0);
        add("locked_until", null);
    }
    if (sets.length === 0) return;

    params.push(id);
    await query(`UPDATE admin_users SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
}

export async function recordLoginSuccess(id: number, now: string): Promise<void> {
    await query(
        "UPDATE admin_users SET failed_logins = 0, locked_until = NULL, last_login_at = $2 WHERE id = $1",
        [id, now],
    );
}

/** شمارنده‌ی ورود ناموفق را زیاد می‌کند و در صورت رسیدن به سقف، حساب را قفل می‌کند */
/** وقتی مدت قفل گذشته، شمارنده‌ی شکست‌ها از صفر شروع شود */
export async function clearLoginFailures(id: number): Promise<void> {
    await query("UPDATE admin_users SET failed_logins = 0, locked_until = NULL WHERE id = $1", [id]);
}

export async function recordLoginFailure(
    id: number,
    maxFailures: number,
    lockUntilIfExceeded: string,
): Promise<{ failedLogins: number; lockedUntil: string | null }> {
    const rows = await query(
        `UPDATE admin_users
         SET failed_logins = failed_logins + 1,
             locked_until = CASE WHEN failed_logins + 1 >= $2 THEN $3 ELSE locked_until END
         WHERE id = $1
         RETURNING failed_logins, locked_until`,
        [id, maxFailures, lockUntilIfExceeded],
    );
    return {
        failedLogins: Number(rows[0]?.failed_logins ?? 0),
        lockedUntil: toIso(rows[0]?.locked_until),
    };
}

// ---------------- نشست‌ها ----------------

export async function createSession(input: {
    adminId: number;
    tokenHash: string;
    expiresAt: string;
    userAgent: string | null;
}): Promise<void> {
    await query(
        `INSERT INTO admin_sessions (token_hash, admin_id, created_at, expires_at, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [input.tokenHash, input.adminId, new Date().toISOString(), input.expiresAt, input.userAgent],
    );
}

export async function findSession(
    tokenHash: string,
    now: string,
): Promise<{ sessionId: number; expiresAt: string; admin: AdminUserWithHash } | null> {
    const rows = await query(
        `SELECT s.id AS session_id, s.expires_at AS session_expires_at, u.*
         FROM admin_sessions s
         JOIN admin_users u ON u.id = s.admin_id
         WHERE s.token_hash = $1 AND s.expires_at > $2`,
        [tokenHash, now],
    );
    const row = rows[0];
    if (!row) return null;

    return {
        sessionId: Number(row.session_id),
        expiresAt: toIso(row.session_expires_at) as string,
        admin: toAdmin(row),
    };
}

export async function extendSession(sessionId: number, expiresAt: string): Promise<void> {
    await query("UPDATE admin_sessions SET expires_at = $2 WHERE id = $1", [sessionId, expiresAt]);
}

export async function deleteSession(tokenHash: string): Promise<void> {
    await query("DELETE FROM admin_sessions WHERE token_hash = $1", [tokenHash]);
}

export async function deleteSessionsForAdmin(adminId: number): Promise<void> {
    await query("DELETE FROM admin_sessions WHERE admin_id = $1", [adminId]);
}

export async function deleteExpiredSessions(now: string): Promise<void> {
    await query("DELETE FROM admin_sessions WHERE expires_at <= $1", [now]);
}

// ---------------- ممیزی ----------------

export type AuditEntry = {
    id: number;
    occurredAt: string;
    adminUsername: string | null;
    action: string;
    target: string | null;
    details: string | null;
};

export async function writeAudit(input: {
    adminId: number | null;
    adminUsername: string | null;
    action: string;
    target?: string | null;
    details?: string | null;
}): Promise<void> {
    await query(
        `INSERT INTO audit_log (occurred_at, admin_id, admin_username, action, target, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
            new Date().toISOString(),
            input.adminId,
            input.adminUsername,
            input.action,
            input.target ?? null,
            input.details ?? null,
        ],
    );
}

export async function listAudit(limit: number): Promise<AuditEntry[]> {
    const rows = await query(
        "SELECT * FROM audit_log ORDER BY id DESC LIMIT $1",
        [Math.min(Math.max(limit, 1), 500)],
    );
    return rows.map((row) => ({
        id: Number(row.id),
        occurredAt: toIso(row.occurred_at) as string,
        adminUsername: row.admin_username === null ? null : String(row.admin_username),
        action: String(row.action),
        target: row.target === null ? null : String(row.target),
        details: row.details === null ? null : String(row.details),
    }));
}