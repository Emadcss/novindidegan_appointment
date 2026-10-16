"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { formatPersianDateFull, formatPersianTimeWithSeconds } from "@/lib/utils/persian-date";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import {
  getServerNow,
  isServerTimeSynced,
  syncServerTime,
} from "@/lib/time/client-clock";
import { SERVER_TIME_RESYNC_MS } from "@/lib/time/constants";

type HeaderProps = {
  compact?: boolean;
};

export default function Header({ compact = false }: HeaderProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [syncFailed, setSyncFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function applySync() {
      return syncServerTime()
          .then(() => {
            if (cancelled) return;
            setNow(getServerNow());
            setSyncFailed(false);
          })
          .catch(() => {
            if (!cancelled) setSyncFailed(true);
          });
    }

    applySync();

    const tick = window.setInterval(() => {
      if (isServerTimeSynced()) {
        setNow(getServerNow());
      }
    }, 1000);

    const resync = window.setInterval(applySync, SERVER_TIME_RESYNC_MS);

    return () => {
      cancelled = true;
      window.clearInterval(tick);
      window.clearInterval(resync);
    };
  }, []);

  return (
      <header
          className={`flex w-full items-center justify-between gap-6 px-8 short:px-6 ${
              compact ? "py-2 short:py-1" : "py-4"
          }`}
      >
        {/* هویت مرکز: گوشه‌ی راست */}
        <div className="flex items-center gap-4">
          <Image
              src="/novindidegan.png"
              alt="لوگوی کلینیک فوق تخصصی نوین دیدگان"
              width={96}
              height={96}
              priority
              className={compact ? "size-16 short:size-14" : "size-24"}
          />

          <div className="flex flex-col leading-tight text-brand">
          <span className={`font-logo ${compact ? "text-body short:text-hint" : "text-title"}`}>
            کلینیک فوق تخصصی
          </span>
            <span className={`font-logo ${compact ? "text-heading short:text-title" : "text-display"}`}>
            نوین دیدگان
          </span>
          </div>
        </div>

        {/* ساعت و وضعیت ارتباط: گوشه‌ی چپ */}
        <div className="flex items-center gap-4">
          {syncFailed && (
              <p
                  role="status"
                  className="rounded-full bg-warning-soft px-5 py-2 text-hint font-bold text-warning"
              >
                ارتباط با سرور برقرار نیست
              </p>
          )}

          {now && (
              <div className="flex flex-col items-end leading-tight">
            <span dir="ltr" className="text-heading short:text-title font-bold tabular-nums text-ink">
              {toPersianDigits(formatPersianTimeWithSeconds(now))}
            </span>
                <span className="text-hint text-ink-muted">{formatPersianDateFull(now)}</span>
              </div>
          )}
        </div>
      </header>
  );
}
