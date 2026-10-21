"use client";

import { useState } from "react";

import { api } from "@/components/admin/api";
import { useMonitoring } from "@/components/admin/AdminApp";
import {
  EVENT_LABELS,
  fa,
  formatDateTime,
  relativeTime,
} from "@/components/admin/format";
import { useFetch, useNow } from "@/components/admin/hooks";
import type {
  AlertView,
  EventView,
  KioskView,
  User,
} from "@/components/admin/types";
import {
  Badge,
  Btn,
  Card,
  Empty,
  Loading,
  Notice,
  SEVERITY_LABEL,
  SEVERITY_TONE,
  Stat,
  StateBadge,
} from "@/components/admin/ui";
import { STATE_LABELS } from "@/lib/monitoring/types";
import type { KioskState, PrinterStatus } from "@/lib/monitoring/types";

const PAPER: Record<
  string,
  { text: string; tone: "green" | "amber" | "red" | "gray" }
> = {
  ok: { text: "کاغذ کافی", tone: "green" },
  near_end: { text: "کاغذ رو به اتمام", tone: "amber" },
  end: { text: "کاغذ تمام شده", tone: "red" },
  unknown: { text: "کاغذ نامشخص", tone: "gray" },
};

function PrinterLine({
  kiosk,
  printer,
}: {
  kiosk: KioskView;
  printer: PrinterStatus | null;
}) {
  if (!kiosk.printerIp)
    return <p className="text-xs text-ink-muted">چاپگر تعریف نشده است.</p>;

  const address = `${kiosk.printerIp}:${fa(kiosk.printerPort ?? 9100)}`;
  if (!printer)
    return (
      <p className="text-xs text-ink-muted" dir="rtl">
        چاپگر {address}: هنوز بررسی نشده
      </p>
    );
  if (!printer.reachable)
    return (
      <p className="text-xs text-danger">
        چاپگر {address}: در دسترس نیست ({printer.error})
      </p>
    );
  if (!printer.supported) {
    return (
      <p className="text-xs text-ink-muted">
        چاپگر {address}: روشن است ولی وضعیت کاغذ را گزارش نمی‌دهد
      </p>
    );
  }

  const paper = PAPER[printer.paper];
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-ink-muted">چاپگر {address}:</span>
      <Badge tone={paper.tone}>{paper.text}</Badge>
      {printer.coverOpen && <Badge tone="red">درب باز</Badge>}
      {printer.online === false && <Badge tone="red">آفلاین</Badge>}
      {printer.error && <Badge tone="red">{printer.error}</Badge>}
      {printer.online &&
        !printer.coverOpen &&
        !printer.error &&
        printer.paper === "ok" && <Badge tone="green">سالم</Badge>}
    </div>
  );
}

function KioskCard({
  kiosk,
  isAdmin,
  onChanged,
}: {
  kiosk: KioskView;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const now = useNow(5_000);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detail = useFetch<{ events: EventView[] }>(
    open ? `/kiosks/${kiosk.id}` : null,
  );

  async function checkNow() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/kiosks/${kiosk.id}/check`);
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  const border = {
    online: "border-success/40",
    warning: "border-warning",
    critical: "border-danger",
    offline: "border-danger",
    never_connected: "border-line",
    disabled: "border-line",
  }[kiosk.statusState];
  const heartbeat = kiosk.lastHeartbeat;

  return (
    <article
      className={`flex flex-col gap-3 rounded-2xl border-2 bg-surface p-4 shadow-card ${border}`}
      aria-label={`کیوسک ${kiosk.name}`}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-bold">{kiosk.name}</h3>
          {kiosk.location && (
            <p className="text-xs text-ink-muted">{kiosk.location}</p>
          )}
        </div>
        <StateBadge state={kiosk.statusState} />
      </header>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-ink-muted">آخرین وضعیت</dt>
        <dd>
          {kiosk.lastSeenAt ? relativeTime(kiosk.lastSeenAt, now) : "هیچ‌وقت"}
        </dd>
        <dt className="text-ink-muted">نشانی کیوسک</dt>
        <dd dir="ltr" className="text-right">
          {kiosk.ipAddress
            ? `${kiosk.ipAddress}${kiosk.port ? ":" + kiosk.port : ""}`
            : "—"}
        </dd>
        <dt className="text-ink-muted">شبکه</dt>
        <dd>
          {kiosk.ipAddress && kiosk.port
            ? kiosk.networkLatencyMs !== null
              ? `پاسخ‌گو (${fa(kiosk.networkLatencyMs)} میلی‌ثانیه)`
              : kiosk.statusCheckedAt
                ? "بی‌پاسخ"
                : "بررسی نشده"
            : "تعریف نشده"}
        </dd>
        <dt className="text-ink-muted">صفحه‌ی فعلی</dt>
        <dd dir="ltr" className="text-right">
          {heartbeat?.step ?? "—"}
        </dd>
      </dl>

      <PrinterLine kiosk={kiosk} printer={kiosk.printerStatus} />

      {kiosk.statusIssues.length > 0 && (
        <ul className="flex flex-col gap-1">
          {kiosk.statusIssues.map((issue) => (
            <li key={issue.code} className="flex items-start gap-2 text-xs">
              <Badge tone={SEVERITY_TONE[issue.severity]}>
                {SEVERITY_LABEL[issue.severity]}
              </Badge>
              <span>{issue.message}</span>
            </li>
          ))}
        </ul>
      )}

      {!kiosk.paired && kiosk.isActive && (
        <Notice tone="info">
          این کیوسک هنوز جفت نشده است (بخش «کیوسک‌ها» ← کد جفت‌سازی).
        </Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}

      <footer className="mt-auto flex flex-wrap gap-2">
        {isAdmin && kiosk.isActive && (
          <Btn small onClick={() => void checkNow()} disabled={busy}>
            {busy ? "در حال بررسی…" : "بررسی همین حالا"}
          </Btn>
        )}
        <Btn small variant="ghost" onClick={() => setOpen(!open)}>
          {open ? "بستن تاریخچه" : "تاریخچه‌ی رویدادها"}
        </Btn>
      </footer>

      {open && (
        <div className="border-t border-line pt-3">
          {detail.loading ? (
            <Loading />
          ) : detail.data?.events.length === 0 ? (
            <p className="text-xs text-ink-muted">رویدادی ثبت نشده است.</p>
          ) : (
            <ul className="flex max-h-60 flex-col gap-1.5 overflow-y-auto text-xs">
              {detail.data?.events.map((event) => (
                <li key={event.id} className="flex gap-2">
                  <span className="shrink-0 text-ink-muted">
                    {formatDateTime(event.occurredAt)}
                  </span>
                  <Badge tone={SEVERITY_TONE[event.severity]}>
                    {EVENT_LABELS[event.type] ?? event.type}
                  </Badge>
                  <span>{event.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

function AlertRow({
  alert,
  isAdmin,
  onChanged,
}: {
  alert: AlertView;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const now = useNow(10_000);

  async function acknowledge() {
    await api.post(`/alerts/${alert.id}/ack`).catch(() => undefined);
    onChanged();
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg bg-paper px-3 py-2 text-sm">
      <Badge tone={SEVERITY_TONE[alert.severity]}>
        {SEVERITY_LABEL[alert.severity]}
      </Badge>
      <span className="font-bold">{alert.kioskName}</span>
      <span className="min-w-0 flex-1">{alert.message}</span>
      <span className="text-xs text-ink-muted">
        {relativeTime(alert.openedAt, now)}
      </span>
      {alert.status === "acknowledged" ? (
        <Badge tone="blue">تأیید شد ({alert.acknowledgedBy})</Badge>
      ) : (
        isAdmin && (
          <Btn small onClick={() => void acknowledge()}>
            تأیید دیدن
          </Btn>
        )
      )}
    </li>
  );
}

export default function MonitoringPage({ user }: { user: User }) {
  const { data, reload, error } = useMonitoring();
  const isAdmin = user.role === "admin";

  if (!data) return error ? <Empty>{error}</Empty> : <Loading />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">وضعیت کیوسک‌ها</h1>
        <p className="text-xs text-ink-muted">
          به‌روزرسانی خودکار هر ۱۰ ثانیه · کیوسک بعد از{" "}
          {fa(data.thresholds.offlineAfterSec)} ثانیه عدم اعلان فعال «قطع» حساب
          می‌شود
          {" · "}اعلان بیرونی (webhook):{" "}
          {data.webhookConfigured ? "فعال" : "تنظیم نشده"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {(Object.keys(STATE_LABELS) as KioskState[]).map((state) => (
          <Stat
            key={state}
            label={STATE_LABELS[state]}
            value={fa(data.stateCounts[state] ?? 0)}
            tone={
              state === "online"
                ? "green"
                : state === "warning"
                  ? "amber"
                  : state === "critical" || state === "offline"
                    ? (data.stateCounts[state] ?? 0) > 0
                      ? "red"
                      : undefined
                    : undefined
            }
          />
        ))}
      </div>

      <Card title={`هشدارهای باز (${fa(data.alerts.length)})`}>
        {data.alerts.length === 0 ? (
          <p className="text-sm text-success">
            همه‌چیز سالم است؛ هشدار بازی وجود ندارد.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.alerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                isAdmin={isAdmin}
                onChanged={reload}
              />
            ))}
          </ul>
        )}
      </Card>

      {data.kiosks.length === 0 ? (
        <Empty>
          هنوز کیوسکی تعریف نشده است. از بخش «کیوسک‌ها» اولین کیوسک را اضافه
          کنید.
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.kiosks.map((kiosk) => (
            <KioskCard
              key={kiosk.id}
              kiosk={kiosk}
              isAdmin={isAdmin}
              onChanged={reload}
            />
          ))}
        </div>
      )}
    </div>
  );
}
