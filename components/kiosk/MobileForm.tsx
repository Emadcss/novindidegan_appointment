"use client";

import DigitEntryForm, { type DigitEntryFormProps } from "@/components/kiosk/DigitEntryForm";
import { isValidIranianMobile } from "@/lib/validators/mobile";

export default function MobileForm(props: DigitEntryFormProps) {
    return (
        <DigitEntryForm
            title="شماره موبایل خود را وارد کنید"
            hint="شماره‌ی ایرانی؛ ۱۱ رقم و شروع با ۰۹"
            fieldLabel="شماره موبایل"
            length={11}
            groups={[4, 3, 4]}
            validate={isValidIranianMobile}
            validMessage="شماره‌ی موبایل معتبر است"
            invalidMessage="شماره‌ی موبایل معتبر نیست. باید ۱۱ رقم باشد و با ۰۹ شروع شود."
            {...props}
        />
    );
}
