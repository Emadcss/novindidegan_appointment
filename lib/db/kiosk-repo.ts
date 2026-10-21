import { query } from "@/lib/db/connection";
import type { Row } from "@/lib/db/connection";
import {
    parseJson,
    toBool,
    toIso,
    toNullableNumber,
    toNullableString,
} from "@/lib/db/util";
import type {
    HeartbeatPayload,
    KioskState,
    MonitorIssue,
    PrinterStatus,
    Severity,
} from "@/lib/monitoring/types";

/** کیوسک‌ها، رویدادها و هشدارهای پایش */

export type Kiosk = {
    id: number;
    name: string;
    location: string | null;
    ipAddress: string | null;
    port: number | null;
    printerIp: string | null;
    printerPort: number | null;
    notes: string | null;
    isActive: boolean;
    /** یک‌بار جفت شده و توکن دارد؟ */
    paired: boolean;
    pairedAt: string | null;
    /** کد جفت‌سازی فعال و منقضی‌نشده دارد؟ */
    pairingPending: boolean;
    lastSeenAt: string | null;
    lastHeartbeat: HeartbeatPayload | null;
    statusState: KioskState;
    statusIssues: MonitorIssue[];
    statusCheckedAt: string | null;
    networkLatencyMs: number | null;
    printerStatus: PrinterStatus | null;
    createdAt: string;
};

function toKiosk(row: Row, now: string): Kiosk {
    const pairingExpires = toIso(row.pairing_expires_at);

    return {
        id: Number(row.id),
        name: String(row.name),
        location: toNullableString(row.location),
        ipAddress: toNullableString(row.ip_address),
        port: toNullableNumber(row.port),
        printerIp: toNullableString(row.printer_ip),
        printerPort: toNullableNumber(row.printer_port),
        notes: toNullableString(row.notes),
        isActive: toBool(row.is_active),
        paired: row.token_hash !== null && row.token_hash !== undefined,
        pairedAt: toIso(row.paired_at),
        pairingPending:
            row.pairing_code_hash !== null &&
            row.pairing_code_hash !== undefined &&
            pairingExpires !== null &&
            pairingExpires > now,
        lastSeenAt: toIso(row.last_seen_at),
        lastHeartbeat: parseJson<HeartbeatPayload | null>(row.last_heartbeat, null),
        statusState: String(row.status_state) as KioskState,
        statusIssues: parseJson<MonitorIssue[]>(row.status_issues, []),
        statusCheckedAt: toIso(row.status_checked_at),
        networkLatencyMs: toNullableNumber(row.network_latency_ms),
        printerStatus: parseJson<PrinterStatus | null>(row.printer_status, null),
        createdAt: toIso(row.created_at) as string,
    };
}

const nowIso = () => new Date().toISOString();

export async function listKiosks(): Promise<Kiosk[]> {
    const now = nowIso();
    const rows = await query("SELECT * FROM kiosks ORDER BY id");
    return rows.map((row) => toKiosk(row, now));
}

export async function getKiosk(id: number): Promise<Kiosk | null> {
    const rows = await query("SELECT * FROM kiosks WHERE id = $1", [id]);
    return rows[0] ? toKiosk(rows[0], nowIso()) : null;
}

export type KioskInput = {
    name: string;
    location: string | null;
    ipAddress: string | null;
    port: number | null;
    printerIp: string | null;
    printerPort: number | null;
    notes: string | null;
};

export async function createKiosk(input: KioskInput): Promise<Kiosk> {
    const rows = await query(
        `INSERT INTO kiosks (name, location, ip_address, port, printer_ip, printer_port, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
            input.name,
            input.location,
            input.ipAddress,
            input.port,
            input.printerIp,
            input.printerPort,
            input.notes,
            nowIso(),
        ],
    );
    return toKiosk(rows[0], nowIso());
}

export async function updateKiosk(
    id: number,
    patch: Partial<KioskInput> & { isActive?: boolean },
): Promise<void> {
    const columns: Record<string, string> = {
        name: "name",
        location: "location",
        ipAddress: "ip_address",
        port: "port",
        printerIp: "printer_ip",
        printerPort: "printer_port",
        notes: "notes",
        isActive: "is_active",
    };
    const sets: string[] = [];
    const params: (string | number | boolean | null)[] = [];

    for (const [key, column] of Object.entries(columns)) {
        const value = (patch as Record<string, string | number | boolean | null | undefined>)[key];
        if (value === undefined) continue;
        params.push(value);
        sets.push(`${column} = $${params.length}`);
    }
    if (sets.length === 0) return;

    params.push(id);
    await query(`UPDATE kiosks SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
}

// ---------------- جفت‌سازی ----------------

export async function setPairingCode(
    id: number,
    codeHash: string,
    expiresAt: string,
): Promise<void> {
    await query(
        "UPDATE kiosks SET pairing_code_hash = $2, pairing_expires_at = $3 WHERE id = $1",
        [id, codeHash, expiresAt],
    );
}

export async function findKioskByPairingHash(
    codeHash: string,
    now: string,
): Promise<Kiosk | null> {
    const rows = await query(
        `SELECT * FROM kiosks
         WHERE pairing_code_hash = $1 AND pairing_expires_at > $2 AND is_active = TRUE`,
        [codeHash, now],
    );
    return rows[0] ? toKiosk(rows[0], now) : null;
}

/** توکن تازه ثبت و کد جفت‌سازی مصرف می‌شود (توکن قبلی خودبه‌خود باطل است) */
export async function completePairing(
    id: number,
    tokenHash: string,
    now: string,
): Promise<void> {
    await query(
        `UPDATE kiosks
         SET token_hash = $2, paired_at = $3, pairing_code_hash = NULL, pairing_expires_at = NULL
         WHERE id = $1`,
        [id, tokenHash, now],
    );
}

export async function revokeKioskToken(id: number): Promise<void> {
    await query(
        `UPDATE kiosks
         SET token_hash = NULL, paired_at = NULL, pairing_code_hash = NULL, pairing_expires_at = NULL
         WHERE id = $1`,
        [id],
    );
}

export async function findKioskByTokenHash(tokenHash: string): Promise<Kiosk | null> {
    const rows = await query(
        "SELECT * FROM kiosks WHERE token_hash = $1 AND is_active = TRUE",
        [tokenHash],
    );
    return rows[0] ? toKiosk(rows[0], nowIso()) : null;
}

// ---------------- نبض و وضعیت ----------------

export async function recordHeartbeat(
    id: number,
    now: string,
    payload: HeartbeatPayload,
): Promise<void> {
    await query(
        "UPDATE kiosks SET last_seen_at = $2, last_heartbeat = $3 WHERE id = $1",
        [id, now, JSON.stringify(payload)],
    );
}

export async function saveEvaluation(
    id: number,
    input: {
        state: KioskState;
        issues: MonitorIssue[];
        checkedAt: string;
        networkLatencyMs: number | null;
        printer: PrinterStatus | null;
    },
): Promise<void> {
    await query(
        `UPDATE kiosks
         SET status_state = $2, status_issues = $3, status_checked_at = $4,
             network_latency_ms = $5, printer_status = $6
         WHERE id = $1`,
        [
            id,
            input.state,
            JSON.stringify(input.issues),
            input.checkedAt,
            input.networkLatencyMs,
            input.printer ? JSON.stringify(input.printer) : null,
        ],
    );
}

// ---------------- رویدادها ----------------

export type KioskEvent = {
    id: number;
    kioskId: number;
    occurredAt: string;
    type: string;
    severity: Severity;
    message: string;
};

function toEvent(row: Row): KioskEvent {
    return {
        id: Number(row.id),
        kioskId: Number(row.kiosk_id),
        occurredAt: toIso(row.occurred_at) as string,
        type: String(row.type),
        severity: String(row.severity) as Severity,
        message: String(row.message),
    };
}

export async function addKioskEvent(input: {
    kioskId: number;
    type: string;
    severity: Severity;
    message: string;
    occurredAt?: string;
}): Promise<void> {
    await query(
        `INSERT INTO kiosk_events (kiosk_id, occurred_at, type, severity, message)
         VALUES ($1, $2, $3, $4, $5)`,
        [input.kioskId, input.occurredAt ?? nowIso(), input.type, input.severity, input.message],
    );
}

export async function listKioskEvents(kioskId: number, limit: number): Promise<KioskEvent[]> {
    const rows = await query(
        "SELECT * FROM kiosk_events WHERE kiosk_id = $1 ORDER BY id DESC LIMIT $2",
        [kioskId, Math.min(Math.max(limit, 1), 500)],
    );
    return rows.map(toEvent);
}

/** رویدادهای قطع/وصل در یک بازه (برای محاسبه‌ی آپ‌تایم)، قدیمی به جدید */
export async function listConnectivityEvents(
    kioskId: number,
    fromIso: string,
    toIsoValue: string,
): Promise<KioskEvent[]> {
    const rows = await query(
        `SELECT * FROM kiosk_events
         WHERE kiosk_id = $1 AND type IN ('went_offline', 'came_online')
           AND occurred_at >= $2 AND occurred_at <= $3
         ORDER BY occurred_at, id`,
        [kioskId, fromIso, toIsoValue],
    );
    return rows.map(toEvent);
}

/** آخرین رویداد قطع/وصل پیش از یک زمان (وضعیت ابتدای بازه) */
export async function lastConnectivityEventBefore(
    kioskId: number,
    beforeIso: string,
): Promise<KioskEvent | null> {
    const rows = await query(
        `SELECT * FROM kiosk_events
         WHERE kiosk_id = $1 AND type IN ('went_offline', 'came_online') AND occurred_at < $2
         ORDER BY occurred_at DESC, id DESC LIMIT 1`,
        [kioskId, beforeIso],
    );
    return rows[0] ? toEvent(rows[0]) : null;
}

// ---------------- هشدارها ----------------

export type Alert = {
    id: number;
    kioskId: number;
    kioskName?: string;
    code: string;
    severity: Severity;
    message: string;
    status: "open" | "acknowledged" | "resolved";
    openedAt: string;
    resolvedAt: string | null;
    acknowledgedAt: string | null;
    acknowledgedBy: string | null;
    notifiedAt: string | null;
};

function toAlert(row: Row): Alert {
    return {
        id: Number(row.id),
        kioskId: Number(row.kiosk_id),
        kioskName: row.kiosk_name === undefined ? undefined : String(row.kiosk_name),
        code: String(row.code),
        severity: String(row.severity) as Severity,
        message: String(row.message),
        status: String(row.status) as Alert["status"],
        openedAt: toIso(row.opened_at) as string,
        resolvedAt: toIso(row.resolved_at),
        acknowledgedAt: toIso(row.acknowledged_at),
        acknowledgedBy: toNullableString(row.acknowledged_by),
        notifiedAt: toIso(row.notified_at),
    };
}

const ALERT_SELECT = `SELECT a.*, k.name AS kiosk_name FROM monitoring_alerts a
                      JOIN kiosks k ON k.id = a.kiosk_id`;

/** هشدار تازه می‌سازد؛ اگر از همین نوع هنوز حل‌نشده است، هیچ‌کاری نمی‌کند (created: false) */
export async function openAlert(input: {
    kioskId: number;
    code: string;
    severity: Severity;
    message: string;
}): Promise<{ alert: Alert; created: boolean }> {
    const inserted = await query(
        `INSERT INTO monitoring_alerts (kiosk_id, code, severity, message, opened_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [input.kioskId, input.code, input.severity, input.message, nowIso()],
    );

    const rows = await query(
        `${ALERT_SELECT} WHERE a.kiosk_id = $1 AND a.code = $2 AND a.status <> 'resolved'`,
        [input.kioskId, input.code],
    );

    return { alert: toAlert(rows[0]), created: inserted.length > 0 };
}

export async function listUnresolvedAlertsForKiosk(kioskId: number): Promise<Alert[]> {
    const rows = await query(
        `${ALERT_SELECT} WHERE a.kiosk_id = $1 AND a.status <> 'resolved' ORDER BY a.id`,
        [kioskId],
    );
    return rows.map(toAlert);
}

export async function resolveAlert(id: number, now: string): Promise<void> {
    await query(
        "UPDATE monitoring_alerts SET status = 'resolved', resolved_at = $2 WHERE id = $1 AND status <> 'resolved'",
        [id, now],
    );
}

export async function acknowledgeAlert(id: number, by: string, now: string): Promise<boolean> {
    const rows = await query(
        `UPDATE monitoring_alerts
         SET status = 'acknowledged', acknowledged_by = $2, acknowledged_at = $3
         WHERE id = $1 AND status = 'open' RETURNING id`,
        [id, by, now],
    );
    return rows.length > 0;
}

export async function markAlertNotified(id: number, now: string): Promise<void> {
    await query("UPDATE monitoring_alerts SET notified_at = $2 WHERE id = $1", [id, now]);
}

export async function listAlerts(filter: {
    status?: "unresolved" | "resolved";
    kioskId?: number;
    limit: number;
}): Promise<Alert[]> {
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (filter.status === "unresolved") where.push("a.status <> 'resolved'");
    if (filter.status === "resolved") where.push("a.status = 'resolved'");
    if (filter.kioskId !== undefined) {
        params.push(filter.kioskId);
        where.push(`a.kiosk_id = $${params.length}`);
    }
    params.push(Math.min(Math.max(filter.limit, 1), 500));

    const rows = await query(
        `${ALERT_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""}
         ORDER BY a.id DESC LIMIT $${params.length}`,
        params,
    );
    return rows.map(toAlert);
}

export async function countUnresolvedAlerts(): Promise<{ critical: number; warning: number }> {
    const rows = await query(
        `SELECT severity, COUNT(*) AS n FROM monitoring_alerts
         WHERE status <> 'resolved' GROUP BY severity`,
    );
    const count = (severity: string) =>
        Number(rows.find((row) => row.severity === severity)?.n ?? 0);

    return { critical: count("critical"), warning: count("warning") };
}