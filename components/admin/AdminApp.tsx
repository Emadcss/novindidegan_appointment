"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { FormEvent } from "react";

import { api } from "@/components/admin/api";
import { fa } from "@/components/admin/format";
import { useFetch } from "@/components/admin/hooks";
import AppointmentsPage from "@/components/admin/pages/AppointmentsPage";
import AuditPage from "@/components/admin/pages/AuditPage";
import DashboardPage from "@/components/admin/pages/DashboardPage";
import DoctorsPage from "@/components/admin/pages/DoctorsPage";
import KiosksPage from "@/components/admin/pages/KiosksPage";
import MonitoringPage from "@/components/admin/pages/MonitoringPage";
import ReportsPage from "@/components/admin/pages/ReportsPage";
import UsersPage from "@/components/admin/pages/UsersPage";
import type { AlertView, KioskView, User } from "@/components/admin/types";
import { Btn, Card, Field, Input, Notice } from "@/components/admin/ui";

type AuthState = {
  setupRequired: boolean;
  authenticated: boolean;
  user: User | null;
};

export type MonitoringData = {
  serverTime: string;
  kiosks: KioskView[];
  stateCounts: Record<string, number>;
  alerts: AlertView[];
  alertCounts: { critical: number; warning: number };
  thresholds: {
    offlineAfterSec: number;
    heartbeatIntervalSec: number;
    cycleSec: number;
  };
  webhookConfigured: boolean;
};

export const MonitoringContext = createContext<{
  data: MonitoringData | null;
  reload: () => void;
  error: string | null;
}>({
  data: null,
  reload: () => {},
  error: null,
});
export const useMonitoring = () => useContext(MonitoringContext);

type PageKey =
  | "dashboard"
  | "monitoring"
  | "kiosks"
  | "appointments"
  | "reports"
  | "doctors"
  | "users"
  | "audit";

const PAGES: { key: PageKey; label: string; adminOnly?: boolean }[] = [
  { key: "dashboard", label: "داشبورد" },
  { key: "monitoring", label: "پایش کیوسک‌ها" },
  { key: "kiosks", label: "کیوسک‌ها" },
  { key: "appointments", label: "نوبت‌ها" },
  { key: "reports", label: "گزارش‌ها" },
  { key: "doctors", label: "پزشکان و برنامه" },
  { key: "users", label: "کاربران", adminOnly: true },
  { key: "audit", label: "گزارش فعالیت‌ها", adminOnly: true },
];

function useHashPage(): [PageKey, (page: PageKey) => void] {
  const read = (): PageKey => {
    const key = window.location.hash.replace(/^#\/?/, "") as PageKey;
    return PAGES.some((page) => page.key === key) ? key : "dashboard";
  };
  const [page, setPage] = useState<PageKey>(() => {
    if (typeof window === "undefined") {
      return "dashboard";
    }

    return read();
  });

  useEffect(() => {
    const onChange = () => setPage(read());

    window.addEventListener("hashchange", onChange);

    return () => {
      window.removeEventListener("hashchange", onChange);
    };
  }, []);

  return [page, (next) => (window.location.hash = `/${next}`)];
}

/** بوق کوتاه برای هشدار بحرانی (پس از فعال‌سازی توسط کاربر) */
function beep(): void {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const context = new Ctx();
    for (let i = 0; i < 3; i += 1) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 880;
      gain.gain.value = 0.15;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime + i * 0.35);
      oscillator.stop(context.currentTime + i * 0.35 + 0.2);
    }
  } catch {
    // صدا پشتیبانی نمی‌شود
  }
}

// ---------------- ورود و راه‌اندازی ----------------

function AuthForm({
  mode,
  onDone,
}: {
  mode: "login" | "setup";
  onDone: () => void;
}) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post(mode === "setup" ? "/auth/setup" : "/auth/login", {
        username,
        displayName,
        password,
      });
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 p-6">
      <h1 className="text-center text-2xl font-bold text-brand">
        {mode === "setup"
          ? "راه‌اندازی اولیه‌ی پنل ادمین"
          : "ورود به پنل ادمین"}
      </h1>
      {mode === "setup" && (
        <Notice tone="info">
          هنوز هیچ کاربری ساخته نشده است. مدیر اصلی را بسازید؛ این صفحه بعد از
          ساخت غیرفعال می‌شود.
        </Notice>
      )}
      <form
        onSubmit={submit}
        className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6 shadow-card">
        <Field
          label="نام کاربری"
          hint={
            mode === "setup"
              ? "۳ تا ۳۲ نویسه‌ی لاتین (حرف کوچک، عدد، _ . -)"
              : undefined
          }>
          <Input
            dir="ltr"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>
        {mode === "setup" && (
          <Field label="نام نمایشی">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Field>
        )}
        <Field
          label="رمز عبور"
          hint={
            mode === "setup" ? "حداقل ۸ کاراکتر، شامل حرف و عدد" : undefined
          }>
          <Input
            dir="ltr"
            type="password"
            autoComplete={
              mode === "setup" ? "new-password" : "current-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <Notice tone="error">{error}</Notice>}
        <Btn
          variant="primary"
          type="submit"
          disabled={busy || !username || !password}>
          {busy
            ? "لطفاً صبر کنید…"
            : mode === "setup"
              ? "ساخت مدیر و ورود"
              : "ورود"}
        </Btn>
      </form>
    </main>
  );
}

function ChangePassword({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/auth/change-password", {
        currentPassword: current,
        newPassword: next,
      });
      setMessage({ tone: "success", text: "رمز عبور تغییر کرد" });
      setCurrent("");
      setNext("");
    } catch (caught) {
      setMessage({
        tone: "error",
        text: caught instanceof Error ? caught.message : "خطا",
      });
    }
  }

  return (
    <Card
      title="تغییر رمز عبور"
      actions={
        <Btn small variant="ghost" onClick={onClose}>
          بستن
        </Btn>
      }
      className="mb-5 max-w-md">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="رمز فعلی">
          <Input
            dir="ltr"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <Field label="رمز جدید" hint="حداقل ۸ کاراکتر، شامل حرف و عدد">
          <Input
            dir="ltr"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <Btn variant="primary" type="submit" disabled={!current || !next}>
          ذخیره
        </Btn>
      </form>
    </Card>
  );
}

// ---------------- قاب اصلی ----------------

function Shell({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [page, go] = useHashPage();
  const monitoring = useFetch<MonitoringData>("/monitoring", {
    refreshMs: 10_000,
  });
  const [soundOn, setSoundOn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const previousCritical = useRef<number | null>(null);

  const critical = monitoring.data?.alertCounts.critical ?? 0;
  const warning = monitoring.data?.alertCounts.warning ?? 0;

  useEffect(() => {
    if (monitoring.data === null) return;
    if (
      soundOn &&
      previousCritical.current !== null &&
      critical > previousCritical.current
    )
      beep();
    previousCritical.current = critical;
  }, [critical, monitoring.data, soundOn]);

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => undefined);
    onLogout();
  }, [onLogout]);

  const items = PAGES.filter(
    (item) => !item.adminOnly || user.role === "admin",
  );

  return (
    <MonitoringContext.Provider
      value={{
        data: monitoring.data,
        reload: monitoring.reload,
        error: monitoring.error,
      }}>
      <div className="flex min-h-dvh select-text bg-paper text-ink">
        <aside className="sticky top-0 flex h-dvh w-56 shrink-0 flex-col gap-1 border-l border-line bg-surface p-4">
          <div className="mb-4">
            <p className="font-logo text-xl text-brand">نوین دیدگان</p>
            <p className="text-xs text-ink-muted">پنل مدیریت کیوسک‌ها</p>
          </div>

          <nav className="flex flex-col gap-1" aria-label="منوی اصلی">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => go(item.key)}
                aria-current={page === item.key ? "page" : undefined}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-right text-sm font-medium ${page === item.key ? "bg-brand text-white" : "text-ink hover:bg-brand-soft"}`}>
                {item.label}
                {item.key === "monitoring" && critical + warning > 0 && (
                  <span
                    className={`rounded-full px-2 text-xs font-bold ${critical > 0 ? "bg-danger text-white" : "bg-warning text-white"}`}>
                    {fa(critical + warning)}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-2 text-xs">
            <Btn
              small
              variant={soundOn ? "primary" : "secondary"}
              onClick={() => {
                setSoundOn(!soundOn);
                if (!soundOn) beep();
              }}>
              {soundOn ? "🔔 صدای هشدار روشن" : "🔕 فعال‌سازی صدای هشدار"}
            </Btn>
            <p className="text-ink-muted">
              {user.displayName} ({user.role === "admin" ? "مدیر" : "ناظر"})
            </p>
            <div className="flex gap-1">
              <Btn
                small
                variant="ghost"
                onClick={() => setShowPassword(!showPassword)}>
                تغییر رمز
              </Btn>
              <Btn small variant="ghost" onClick={() => void logout()}>
                خروج
              </Btn>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-6">
          {monitoring.error && (
            <div className="mb-4">
              <Notice tone="error">{monitoring.error}</Notice>
            </div>
          )}
          {showPassword && (
            <ChangePassword onClose={() => setShowPassword(false)} />
          )}

          {page === "dashboard" && <DashboardPage onNavigate={go} />}
          {page === "monitoring" && <MonitoringPage user={user} />}
          {page === "kiosks" && <KiosksPage user={user} />}
          {page === "appointments" && <AppointmentsPage user={user} />}
          {page === "reports" && <ReportsPage />}
          {page === "doctors" && <DoctorsPage user={user} />}
          {page === "users" && user.role === "admin" && <UsersPage me={user} />}
          {page === "audit" && user.role === "admin" && <AuditPage />}
        </main>
      </div>
    </MonitoringContext.Provider>
  );
}

export default function AdminApp() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setAuth(await api.get<AuthState>("/auth/state"));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "خطا");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAuth() {
      try {
        const result = await api.get<AuthState>("/auth/state");

        if (!cancelled) {
          setAuth(result);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "خطا");
        }
      }
    }

    void loadAuth();

    const onUnauthorized = () => {
      void refresh();
    };

    window.addEventListener("admin:unauthorized", onUnauthorized);

    return () => {
      cancelled = true;
      window.removeEventListener("admin:unauthorized", onUnauthorized);
    };
  }, [refresh]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md select-text flex-col justify-center gap-4 p-6">
        <Notice tone="error">{error}</Notice>
        <Btn onClick={() => void refresh()}>تلاش دوباره</Btn>
      </main>
    );
  }
  if (!auth)
    return (
      <p className="p-10 text-center text-sm text-ink-muted">
        در حال بارگذاری…
      </p>
    );
  if (auth.setupRequired)
    return (
      <div className="select-text">
        <AuthForm mode="setup" onDone={() => void refresh()} />
      </div>
    );
  if (!auth.authenticated || !auth.user)
    return (
      <div className="select-text">
        <AuthForm mode="login" onDone={() => void refresh()} />
      </div>
    );

  return <Shell user={auth.user} onLogout={() => void refresh()} />;
}
