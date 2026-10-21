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
    className={`kiosk-portrait-header flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 short:px-6 sm:flex-nowrap sm:gap-6 sm:px-8 ${
        compact ? "py-2 short:py-1" : "py-3 sm:py-4"
      }`}
    >
      {/* هویت مرکز: گوشه‌ی راست */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <Image
          src="/novindidegan.png"
          alt="لوگوی کلینیک فوق تخصصی نوین دیدگان"
          width={96}
          height={96}
          priority
          className={compact ? "size-12 short:size-11 sm:size-16 sm:short:size-14" : "size-12 sm:size-24"}
        />

        <div className="flex flex-col leading-tight text-brand">
          <span className={`font-logo text-xs sm:text-base ${compact ? "sm:text-body short:sm:text-hint" : "sm:text-title"}`}>
            کلینیک فوق تخصصی
          </span>
          <span className={`font-logo text-lg sm:text-2xl ${compact ? "sm:text-heading short:sm:text-title" : "sm:text-display"}`}>
            نوین دیدگان
          </span>
        </div>
      </div>

      {/* ساعت و وضعیت ارتباط: گوشه‌ی چپ */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        {syncFailed && (
          <p
            role="status"
            className="rounded-full bg-warning-soft px-3 py-1 text-xs font-bold text-warning sm:px-5 sm:py-2 sm:text-hint"
          >
            ارتباط با سرور برقرار نیست
          </p>
        )}

        {now && (
          <div className="flex flex-col items-end leading-tight">
            <span dir="ltr" className="text-base font-bold tabular-nums text-ink sm:text-heading short:sm:text-title">
              {toPersianDigits(formatPersianTimeWithSeconds(now))}
            </span>
            <span className="text-[0.65rem] text-ink-muted sm:text-hint">{formatPersianDateFull(now)}</span>
          </div>
        )}
      </div>
    </header>
  );
}
