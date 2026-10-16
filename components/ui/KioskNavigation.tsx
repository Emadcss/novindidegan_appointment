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
        <nav aria-label="پیمایش" className="flex items-center justify-between gap-4 pt-8 short:pt-3">
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
