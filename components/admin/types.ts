import type { KioskState, MonitorIssue, PrinterStatus, Severity } from "@/lib/monitoring/types";

export type Role = "admin" | "viewer";
export type User = { id: number; username: string; displayName: string; role: Role; isActive: boolean; lastLoginAt: string | null; lockedUntil: string | null };

export type KioskView = {
    id: number;
    name: string;
    location: string | null;
    ipAddress: string | null;
    port: number | null;
    printerIp: string | null;
    printerPort: number | null;
    notes: string | null;
    isActive: boolean;
    paired: boolean;
    pairingPending: boolean;
    lastSeenAt: string | null;
    secondsSinceSeen: number | null;
    lastHeartbeat: { step: string; appVersion: string | null; screen: { width: number; height: number } | null; recentErrors: number; clockDriftMs: number | null; online: boolean | null } | null;
    statusState: KioskState;
    statusIssues: MonitorIssue[];
    statusCheckedAt: string | null;
    networkLatencyMs: number | null;
    printerStatus: PrinterStatus | null;
};

export type AlertView = {
    id: number;
    kioskId: number;
    kioskName?: string;
    code: string;
    severity: Severity;
    message: string;
    status: "open" | "acknowledged" | "resolved";
    openedAt: string;
    resolvedAt: string | null;
    acknowledgedBy: string | null;
};

export type EventView = { id: number; occurredAt: string; type: string; severity: Severity; message: string };

export type AppointmentView = {
    id: number;
    date: string;
    time: string;
    number: number;
    status: string;
    doctorId: number;
    doctorName: string;
    specialtyName: string;
    kioskName: string | null;
    nationality: string;
    identityKind: string | null;
    identityMasked: string | null;
};

export type Counts = { total: number; booked: number; completed: number; cancelled: number; noShow: number };

export type SpecialtyRow = { id: number; name: string; slug: string; icon: string | null; isActive: boolean };
export type DoctorRow = { id: number; specialtyId: number; firstName: string; lastName: string; displayName: string; requiresSurgeryHistory: boolean; isActive: boolean };
export type ScheduleRow = { id: number; doctorId: number; weekday: number; startTime: string; endTime: string };
export type ExceptionRow = { id: number; doctorId: number; date: string; type: "disabled" | "override"; startTime: string | null; endTime: string | null; reason: string | null };