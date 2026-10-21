"use client";

import Button from "@/components/ui/Button";
import { ChevronRightIcon } from "@/components/ui/Icons";

type KioskNavigationProps = {
    onBack: () => void;
    onCancel: () => void;
    backLabel?: string;
    cancelLabel?: string;
    disabled?: boolean;
};

/**
 * ناوبری ثابت پایین هر صفحه.
 * «بازگشت» سمت شروع (راست) و «انصراف» سمت مقابل است؛ جای آن‌ها در همه‌ی صفحه‌ها یکسان می‌ماند.
 * «انصراف» عمدتاً کم‌رنگ است تا با عمل اصلی اشتباه گرفته نشود.
 */
export default function KioskNavigation({
    onBack,
    onCancel,
    backLabel = "بازگشت",
    cancelLabel = "انصراف",
    disabled = false,
}: KioskNavigationProps) {
    return (
        <nav aria-label="پیمایش" className="sticky bottom-0 z-20 -mx-4 mt-4 flex items-center justify-between gap-3 bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mx-0 sm:mt-0 sm:gap-4 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-8 short:sm:pt-3">
            <Button
                variant="secondary"
                icon={<ChevronRightIcon className="size-7" />}
                onClick={onBack}
                disabled={disabled}
            >
                {backLabel}
            </Button>

            <Button variant="quiet" onClick={onCancel} disabled={disabled}>
                {cancelLabel}
            </Button>
        </nav>
    );
}
