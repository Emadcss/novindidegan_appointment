"use client";

import {formatPersianDateFull} from "@/lib/utils/persian-date";
import {toPersianDigits} from "@/lib/utils/persian-digits";

type AppointmentResultProps = {
    status: "loading" | "success" | "error";
    message?: string | null;
    appointmentNumber?: number | null;
    appointmentDate?: string | null;
    appointmentTime?: string | null;
    doctorName?: string | null;
    specialtyName?: string | null;
    onRetry?: () => void;
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
    onHome,
                                          }: AppointmentResultProps) {
    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
            <div className="flex min-h-72 w-full flex-col items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 p-10 text-center shadow-xl backdrop-blur-xl">
                {status === "loading" && (
                    <>
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/15 border-t-lightblue" />
                            <h1 className="mt-6 text-2xl font-bold md:text-3xl">
                                در حال ثبت نوبت...
                            </h1>
                            <p className="mt-3 text-white/60">لطفا صبر کنید</p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <h1 className="text-2xl font-bold text-emerald-300 md:text-3xl">
                            نوبت شما ثبت شد
                        </h1>

                        <div className='mt-6 space-y-2 text-lg text-white/90'>
                            {appointmentNumber != null && (
                                <p>
                                    شماره نوبت:{" "}
                                    <span className="font-bold">{toPersianDigits(appointmentNumber)}</span>
                                </p>
                            )}
                            {specialtyName && <p>تخصص: {specialtyName}</p>}
                            {doctorName && <p>پزشک: {doctorName}</p>}
                            {appointmentDate && <p>تاریخ: {formatPersianDateFull(appointmentDate)}</p>}
                            {appointmentTime && <p>ساعت: {toPersianDigits(appointmentTime)}</p>}
                        </div>

                        <p className="mt-6 max-w-xl text-base text-white/65">
                            پس از دریافت قبض به پذیرش مراجعه فرمایید
                        </p>
                    </>
                )}

                {status === "error" && (
                    <>
                        <h1 className="text-2xl font-bold text-red-300 md:text-3xl">
                            ثبت نوبت انجام نشد
                        </h1>
                        <p className="mt-4 max-w-xl text-base text-white/70">
                            {message ?? "خطای ناشناخته"}
                        </p>
                    </>
                )}
            </div>

            <div className="mt-6 flex w-full max-w-xl gap-3">
                {status === "error" && onRetry && (
                    <button
                        type="button"
                        onClick={onRetry}
                        className="min-h-16 flex-1 rounded-2xl bg-darkblue text-lg font-bold text-white"
                    >
                        تلاش مجدد
                    </button>
                )}

                <button
                    type="button"
                    onClick={onHome}
                    className="min-h-16 flex-1 rounded-2xl border border-white/20 bg-white/10 text-lg font-bold"
                >
                    بازگشت به صفحه شروع
                </button>
            </div>
        </div>
    );
}