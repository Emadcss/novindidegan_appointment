"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { toPersianDigits } from "@/lib/utils/persian-digits";

type IdleWarningProps = {
    /** ثانیه‌های باقی‌مانده تا بازگشت خودکار */
    seconds: number;
    onContinue: () => void;
    /** پاک‌کردن فوری اطلاعات و بازگشت به صفحه‌ی اول */
    onCancel: () => void;
};

/**
 * پیش از پاک شدن اطلاعات به‌خاطر بی‌فعالیتی هشدار می‌دهد.
 * تا لمس یکی از دکمه‌ها، لمس‌های دیگر نادیده گرفته می‌شود
 * (تا لمسِ بستن، به دکمه‌ی زیر پنجره نشت نکند).
 */
export default function IdleWarning({ seconds, onContinue, onCancel }: IdleWarningProps) {
    const [remaining, setRemaining] = useState(seconds);

    useEffect(() => {
        const id = window.setInterval(() => {
            setRemaining((value) => Math.max(0, value - 1));
        }, 1000);

        return () => window.clearInterval(id);
    }, []);

    return (
        <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="idle-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 sm:p-6"
        >
            <div className="w-full max-w-2xl rounded-card bg-surface p-5 text-center shadow-card sm:p-10">
                <h2 id="idle-title" className="text-2xl font-bold text-ink sm:text-heading">
                    هنوز اینجا هستید؟
                </h2>

                <p className="mt-3 text-base text-ink-muted sm:mt-4 sm:text-body">
                    اگر کاری انجام ندهید، {toPersianDigits(remaining)} ثانیه‌ی دیگر به صفحه‌ی اول
                    برمی‌گردید و اطلاعات واردشده پاک می‌شود.
                </p>

                <div className="mt-5 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                    <Button size="lg" onClick={onContinue}>
                        ادامه می‌دهم
                    </Button>

                    <Button size="lg" variant="quiet" onClick={onCancel}>
                        انصراف و پاک کردن اطلاعات
                    </Button>
                </div>
            </div>
        </div>
    );
}
