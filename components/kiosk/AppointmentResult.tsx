"use client";

import Button from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/Icons";
import StatusPanel from "@/components/ui/StatusPanel";
import { formatPersianDateFull } from "@/lib/utils/persian-date";
import { toPersianDigits } from "@/lib/utils/persian-digits";

type AppointmentResultProps = {
    status: "loading" | "success" | "error";
    message?: string | null;
    appointmentNumber?: number | null;
    appointmentDate?: string | null;
    appointmentTime?: string | null;
    doctorName?: string | null;
    specialtyName?: string | null;
    onRetry?: () => void;
    /** مدت نمایش صفحه‌ی نوبت تا بسته‌شدن خودکار (برای نوار شمارش معکوس) */
    autoCloseMs?: number;
    onHome: () => void;
};

export default function AppointmentResult({
                                              status,
                                              message,
                                              appointmentNumber,
                                              appointmentDate,
                                              appointmentTime,
                                              doctorName,
                                              specialtyName,
                                              onRetry,
                                              autoCloseMs,
                                              onHome,
                                          }: AppointmentResultProps) {
    // در حال ثبت: عمداً دکمه‌ی خروج ندارد تا پاسخ سرور به کاربر بعدی نرسد
    if (status === "loading") {
        return (
            <StatusPanel
                tone="loading"
                title={message ?? "در حال ثبت نوبت…"}
                description="لطفاً چند لحظه صبر کنید"
            />
        );
    }

    if (status === "error") {
        return (
            <StatusPanel
                tone="error"
                title="نوبت ثبت نشد"
                description={`${message ?? "خطای ناشناخته"}. می‌توانید دوباره تلاش کنید یا به پذیرش مراجعه کنید.`}
            >
                {onRetry && (
                    <Button size="lg" onClick={onRetry}>
                        تلاش دوباره
                    </Button>
                )}
                <Button size="lg" variant="quiet" onClick={onHome}>
                    پایان
                </Button>
            </StatusPanel>
        );
    }

    const rows: { label: string; value: string | null | undefined }[] = [
        { label: "تخصص", value: specialtyName },
        { label: "پزشک", value: doctorName },
        { label: "تاریخ", value: appointmentDate ? formatPersianDateFull(appointmentDate) : null },
        { label: "ساعت ثبت", value: appointmentTime ? toPersianDigits(appointmentTime) : null },
    ];

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4">
            <div className="w-full overflow-hidden rounded-card bg-surface shadow-card">
                <div className="flex items-center gap-3 bg-success px-8 py-4 text-title font-bold text-white">
                    <CheckIcon className="size-8" />
                    نوبت شما ثبت شد
                </div>

                <div className="grid items-center md:grid-cols-[1fr_1.2fr]">
                    {/* شماره‌ی نوبت */}
                    <div className="px-8 py-6 text-center md:border-l-2 md:border-dashed md:border-line">
                        <p className="text-body text-ink-muted">شماره نوبت شما</p>

                        {appointmentNumber != null && (
                            <p className="text-ticket short:text-8xl font-bold tabular-nums text-brand">
                                {toPersianDigits(appointmentNumber)}
                            </p>
                        )}
                    </div>

                    {/* جزئیات */}
                    <dl className="grid gap-3 px-8 py-6 text-body">
                        {rows
                            .filter((row) => row.value)
                            .map((row) => (
                                <div key={row.label} className="flex items-center justify-between gap-6">
                                    <dt className="text-ink-muted">{row.label}</dt>
                                    <dd className="font-bold text-ink">{row.value}</dd>
                                </div>
                            ))}
                    </dl>
                </div>

                <p className="bg-brand-soft px-8 py-4 text-center text-body font-bold text-brand">
                    برای تکمیل پذیرش، به باجه‌ی پذیرش مراجعه کنید.
                </p>
            </div>

            {autoCloseMs && (
                <div
                    aria-hidden="true"
                    className="h-2 w-full max-w-md overflow-hidden rounded-full bg-line motion-reduce:hidden"
                >
                    <div
                        className="drain h-full rounded-full bg-brand"
                        style={{ animationDuration: `${autoCloseMs}ms` }}
                    />
                </div>
            )}

            <p className="text-hint text-ink-muted">این صفحه به‌طور خودکار بسته می‌شود</p>
        </div>
    );
}
