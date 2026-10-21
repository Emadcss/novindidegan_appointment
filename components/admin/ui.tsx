"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

import { STATE_LABELS } from "@/lib/monitoring/types";
import type { KioskState, Severity } from "@/lib/monitoring/types";

/** اجزای پایه‌ی پنل ادمین (فشرده‌تر از کیوسک؛ از همان توکن‌های رنگ) */

export function Card({
  title,
  actions,
  children,
  className = "",
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-surface p-5 shadow-card ${className}`}>
      {(title || actions) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-lg font-bold text-ink">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

const TONES = {
  green: "bg-success-soft text-success",
  red: "bg-danger-soft text-danger",
  amber: "bg-warning-soft text-warning",
  blue: "bg-brand-soft text-brand",
  gray: "bg-line text-ink-muted",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({
  tone = "gray",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export const STATE_TONE: Record<KioskState, Tone> = {
  online: "green",
  warning: "amber",
  critical: "red",
  offline: "red",
  never_connected: "gray",
  disabled: "gray",
};

export function StateBadge({ state }: { state: KioskState }) {
  return <Badge tone={STATE_TONE[state]}>{STATE_LABELS[state]}</Badge>;
}

export const SEVERITY_TONE: Record<Severity, Tone> = {
  critical: "red",
  warning: "amber",
  info: "blue",
};
export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "بحرانی",
  warning: "هشدار",
  info: "اطلاع",
};

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  small?: boolean;
};

export function Btn({
  variant = "secondary",
  small = false,
  className = "",
  ...rest
}: BtnProps) {
  const styles = {
    primary: "bg-brand text-white hover:bg-brand-strong",
    secondary:
      "border border-line-strong bg-surface text-ink hover:bg-brand-soft",
    danger: "bg-danger text-white hover:opacity-90",
    ghost: "text-brand hover:bg-brand-soft",
  }[variant];

  return (
    <button
      type="button"
      className={`rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${small ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"} ${styles} ${className}`}
      {...rest}
    />
  );
}

const inputClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} className={`${inputClass} ${props.className ?? ""}`} />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${inputClass} ${props.className ?? ""}`} />
  );
}

export function Notice({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  const styles = {
    error: "bg-danger-soft text-danger",
    success: "bg-success-soft text-success",
    info: "bg-brand-soft text-brand",
  }[tone];
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${styles}`}>
      {children}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg bg-paper px-4 py-8 text-center text-sm text-ink-muted">
      {children}
    </p>
  );
}

export function Loading() {
  return (
    <p className="py-8 text-center text-sm text-ink-muted">
      در حال بارگذاری...
    </p>
  );
}

export function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="rounded-xl bg-paper p-4">
      <p className="text-xs text-ink-muted">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${tone ? TONES[tone].split(" ")[1] : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}

export function Table({
  head,
  children,
}: {
  head: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-right text-xs text-ink-muted">
            {head.map((title) => (
              <th key={title} className="px-3 py-2 font-medium">
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-line/60 [&>tr>td]:px-3 [&>tr>td]:py-2">
          {children}
        </tbody>
      </table>
    </div>
  );
}

/** نمودار میله‌ای ساده (بدون کتابخانه) */
export function BarChart({
  items,
  formatValue,
}: {
  items: { label: string; value: number }[];
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="flex h-40 items-end gap-1.5" role="img" aria-label="نمودار">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] text-ink-muted">
            {formatValue ? formatValue(item.value) : item.value}
          </span>
          <div
            className="w-full rounded-t bg-brand/80"
            style={{
              height: `${Math.max(
                (item.value / max) * 100,
                item.value > 0 ? 4 : 0,
              )}%`,
            }}
            title={`${item.label}: ${item.value}`}
          />
          <span className="truncate text-[10px] text-ink-muted">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
