"use client"

import {useEffect, useState} from "react";

import KioskNavigation from "@/components/ui/KioskNavigation";
import NumericKeypad from "@/components/ui/NumericKeypad";
import {toPersianDigits} from "@/lib/utils/persian-digits";
import {isValidIranianMobile} from "@/lib/validators/mobile";

type MobileFormProps = {
    value?: string;
    onSubmit: (mobile: string) => void;
    onBack: () => void;
    onCancel: () => void;
    loading?: boolean;
    error?: string | null;
};

const MAX_LENGTH = 11;
const INCOMPLETE_HINT_DELAY = 2000;

function normalizeDigits(value: string): string {
    return value
        .replace(/[۰-۹]/g, (digit) =>
            String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
        )
        .replace(/[٠-٩]/g, (digit) =>
            String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))
        )
        .replace(/\D/g, "");
}

function CheckIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M20 6L9 17l-5-5" />
        </svg>
    );
}

export default function MobileForm({
    value = "",
    onSubmit,
    onBack,
    onCancel,
    loading = false,
    error = null,
                                   }: MobileFormProps) {
    const [mobile, setMobile] = useState(() =>
    normalizeDigits(value)
    );

    const [showIncompleteHint, setShowIncompleteHint] =
        useState(false);

    const isComplete =
        mobile.length === MAX_LENGTH;

    const isValid =
        isComplete && isValidIranianMobile(mobile);

    const isInvalidComplete =
        isComplete && !isValid;

    useEffect(() => {
        setShowIncompleteHint(false);

        if (
            mobile.length === 0 ||
            isComplete
        ) {
            return;
        }

        const timer = setTimeout(() => {
            setShowIncompleteHint(true);
        }, INCOMPLETE_HINT_DELAY);

        return () => clearTimeout(timer);
    }, [mobile, isComplete]);

    function handleChange(nextValue: string) {
        if (loading) {
            return;
        }

     setMobile(
         normalizeDigits(nextValue).slice(
             0,
             MAX_LENGTH
         )
     );
    }

    function handleSubmit() {
        if (loading) {
            return;
        }

        if (!isValidIranianMobile(mobile)) {
            return;
        }

        onSubmit(mobile);
    }

    return (
        <div className="mx-auto flex w-full max-w-xl flex-col">
            {/* Header */}

            <div className='mb-4 text-center'>
                <h1 className='text-2xl font-bold md:text-3xl'>
                    شماره موبایل خود را وارد کنید
                </h1>
                <p className='mt-2 text-sm text-white/55 md:text-base'>
                    شماره موبایل خود را به همراه پیش شماره وارد کنید
                </p>
            </div>

         {/* Display */}

        <div className='
            mx-auto
            flex
            min-h-[4.5rem]
            w-full
            max-w-xl
            items-center
            justify-center
            rounded-2xl
            border
            border-white/20
            bg-white/10
            px-4
            py-3
            shadow-xl
            backdrop-blur-xl
        '
        >
            <span
                dir='ltr'
                className="
                    min-h-10
                    text-center
                    font-mono
                    text-3xl
                    font-bold
                    tracking-[0.2em]
                    text-white
                    tabular-nums
                    md:text-4xl
                "
            >
             {mobile
                ? toPersianDigits(mobile)
                : "-----------"}
            </span>
        </div>

            {/* Counter / Validation */}

            <div className={`
                mt-2
                flex
                min-h-6
                items-center
                justify-center
                gap-1.5
                text-sm
                transition-colors
                ${
                    isValid
                        ? "font-medium text-emerald-400"
                        :isInvalidComplete
                            ? "font-medium text-red-400"
                            : showIncompleteHint
                                ? "font-medium text-amber-300"
                                : "text-white/50"
                }
            `}
            >
                <span>
                    {toPersianDigits(
                        String(mobile.length)
                    )}{" "}
                    از{" "}
                    {toPersianDigits(
                        String(MAX_LENGTH)
                    )}{" "}
                    رقم
                </span>

                {isValid && <CheckIcon />}

                {isInvalidComplete && (
                    <span>
                        شماره موبایل صحیح نیست
                    </span>
                )}

                {showIncompleteHint &&
                !isComplete && (
                    <span>
                        شماره موبایل را کامل وارد کنید
                    </span>
                    )}
            </div>

            {/* Server / API Error */}

            {error && (
                <div
                    className="mt-3
                    rounded-2xl
                    border
                    border-red-400/20
                    bg-red-500/10
                    px-4
                    py-3
                    text-center
                    text-sm
                    font-medium
                    text-red-200
                   "
                >
                    {error}
                </div>
            )}

            {/* Keypad */}

            <div className="mt-4">
                <NumericKeypad
                    value={mobile}
                    onChange={handleChange}
                    maxLength={MAX_LENGTH}
                    onSubmit={handleSubmit}
                    disabled={loading}
                    loading={loading}
                    submitEnabled={isValid}
                    submitLabel="تایید"
                    loadingLabel="در حال بررسی..."
                />
            </div>

            {/* Navigation */}

            <KioskNavigation
                onBack={onBack}
                onCancel={onCancel}
                disabled={loading}
            />
        </div>
    )
}