"use client";

import DigitEntryForm, { type DigitEntryFormProps } from "@/components/kiosk/DigitEntryForm";
import { isValidIranianNationalId } from "@/lib/validators/national-id";

export default function NationalIdForm(props: DigitEntryFormProps) {
    return (
        <DigitEntryForm
            title="کد ملی خود را وارد کنید"
            hint="کد ۱۰ رقمی که روی کارت ملی نوشته شده است"
            fieldLabel="کد ملی"
            length={10}
            groups={[3, 3, 4]}
            validate={isValidIranianNationalId}
            validMessage="کد ملی معتبر است"
            invalidMessage="کد ملی معتبر نیست. ارقام را بررسی کنید."
            {...props}
        />
    );
}
