"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {formatPersianDateFull, formatPersianTimeWithSeconds} from "@/lib/utils/persian-date";
import {toPersianDigits} from "@/lib/utils/persian-digits";

type HeaderProps = {
  compact?: boolean;
};

export default function Header({compact = false}: HeaderProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const updateTime = () => setNow(new Date());
    updateTime();
    const interval = setInterval(
      updateTime,
      1000
    );

    return () => clearInterval(interval);
  }, []);

  return (
    <header
      className={`
        flex
        w-full
        flex-row
        items-center
        justify-between
        gap-4
        ${compact ? "py-1" : "py-2"}
      `}
    >
      {/* ==========================================
          Logo
          ========================================== */}

      <div className="flex shrink-0 flex-row items-center gap-2">
        <Image
          src="/novindidegan.png"
          alt="لوگوی کلینیک فوق تخصصی نوین دیدگان"
          width={100}
          height={50}
          priority
          className={`
            h-auto
            ${compact ? "w-14" : "w-18 lg:w-22.5"}`}
        />

        <div className="flex flex-col items-center leading-none">
          <h1
            className={`
              font-ghasem
              bg-linear-30
              from-darkblue
              to-lightblue
              bg-clip-text
              text-transparent
              ${compact ? "text-sm" : "text-lg md:text-xl lg:text-2xl"}
            `}
          >
            کلینیک فوق تخصصی
          </h1>

          <h1
            className={`
              font-ghasem
              mt-0.5
              bg-linear-30
              from-darkblue
              to-lightblue
              bg-clip-text
              text-transparent
              ${compact ? "text-3xl" : "text-5xl md:text-6xl lg:text-2xl"}
            `}
          >
            نوین دیدگان
          </h1>
        </div>
      </div>

      {/* ==========================================
          Date / Time / System Status
          ========================================== */}

      <div className="flex items-center gap-2">

        {/* Date & Time */}

        {now && (
          <div
            className={`
              hidden
              flex-row
              items-end
              rounded-2xl
              border
              border-novingray
              bg-white/4
              backdrop-blur-xl
              sm:flex
              ${compact ? "px-3 py-1" : "px-4 py-2"}
            `}
          >
            <span className={`text-novinpink ${compact ? "text-[10px]" : "text-xs"}`}>
              {formatPersianDateFull(now)}
            </span>

            <span
              dir="ltr"
              className={`
                font-mono
                font-semibold
                tracking-wider
                text-white/90
                tabular-nums
                ${compact ? "mt-0 text-base" : "mt-0.5 text-lg"}
              `}
            >
              {toPersianDigits(formatPersianTimeWithSeconds(now))}
            </span>
          </div>
        )}

        {/* System Status */}

        <div
          className={`
            flex
            items-center
            gap-2
            rounded-full
            border
            border-emerald-400/10
            bg-white/4
            backdrop-blur-xl
            ${compact ? "px-3 py-2" : "px-4 py-3 md:px-5"}
          `}
          >
              <span
            className="
              relative
              flex
              h-2.5
              w-2.5
              shrink-0
              rounded-full
              bg-emerald-400
            "
          >
            <span
              className="
                absolute
                inset-0
                animate-ping
                rounded-full
                bg-emerald-400/60
              "
            />
          </span>

          <span className={`
            hidden
            text-white/55
            md:block
            ${compact ? "text-xs" : "text-sm"}
          `}
          >
            سیستم آماده است
          </span>
        </div>
      </div>
    </header>
  );
}
