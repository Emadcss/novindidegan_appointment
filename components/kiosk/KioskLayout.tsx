"use client";

import type { ReactNode } from "react";

import Header from "@/components/ui/Header";
import KioskBackdrop from "@/components/ui/KioskBackdrop";

type KioskLayoutProps = {
    compact: boolean;
    /** نوار مراحل (اختیاری) */
    progress?: ReactNode;
    /** لایه‌ی روی صفحه، مثل هشدار بی‌فعالیتی */
    overlay?: ReactNode;
    children: ReactNode;
};

/** قاب ثابت کیوسک: پس‌زمینه، هدر در گوشه‌ها، نوار مراحل و محتوای مرحله */
export default function KioskLayout({
                                        compact,
                                        progress,
                                        overlay,
                                        children,
                                    }: KioskLayoutProps) {
    return (
        <main
            className="relative min-h-dvh text-ink"
            onContextMenu={(event) => event.preventDefault()}
        >
            <KioskBackdrop />

            <div className="relative z-10 flex min-h-dvh flex-col">
                <Header compact={compact} />

                <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-4 short:pb-2 md:px-10">
                    <div className="flex flex-1 flex-col py-2">
                        {progress}

                        <div className="flex flex-1 flex-col">{children}</div>
                    </div>
                </div>
            </div>

            {overlay}
        </main>
    );
}
