"use client";

import { useEffect,useState } from "react";

import KioskNavigation from "@/components/ui/KioskNavigation";
import NumericKeypad from "@/components/ui/NumericKeypad";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import {isValidIranianNationalId} from "@/lib/validators/national-id";

type NationalIdFormProps = {
    value?: string;
    onSubmit: (nationalId: string) => void;
    onBack: () => void;
    onCancel: () => void;
    loading?: boolean;
    error?: string | null;
};

const MAX_LENGTH = 10;
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

export default function NationalIdForm({
                                           value = "",
                                           onSubmit,
                                           onBack,
                                           onCancel,
                                           loading = false,
                                           error = null,
                                       }: NationalIdFormProps) {
    const [nationalId, setNationalId] =
        useState(() => normalizeDigits(value));
    const [showIncompleteHint, setShowIncompleteHint] = useState(false);

    const isComplete = nationalId.length === MAX_LENGTH;
    const isValid = isComplete && isValidIranianNationalId(nationalId);
    const isInvalidComplete = isComplete && !isValid;

    useEffect(() => {
        setShowIncompleteHint(false);
        if (nationalId.length === 0 || isComplete) {
            return;
        }

        const timer = setTimeout(() => {
            setShowIncompleteHint(true);
        }, INCOMPLETE_HINT_DELAY);

        return () => clearTimeout(timer);
    }, [nationalId, isComplete]);

    function handleChange(nextValue: string) {
        if (loading) return;
        setNationalId(normalizeDigits(nextValue).slice(0, MAX_LENGTH));
    }

    function handleSubmit() {
        if (loading) return;
        if (!isValidIranianNationalId(nationalId)) return;
        onSubmit(nationalId);
    }

    return (
        <div className="mx-auto flex w-full max-w-xl flex-col">
            {/* Header */}
            <div className="mb-4 text-center">
                <h1 className="text-2xl font-bold md:text-3xl">
                    کد ملی خود را وارد کنید
                </h1>
            </div>

            {/* Display */}
            <div
                className="
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
                    backdrop-blur-xl"
                >
                <span dir="ltr"
                      className="
                      min-h-10
                      text-center
                      font-mono
                      text-3xl
                      font-bold
                      tracking-[0.3em]
                      text-white
                      tabular-nums
                      md:text-4xl
                      "
                      >
                    {nationalId
                        ? toPersianDigits(nationalId)
                        : "----------"}
                </span>
            </div>

            {/* Counter */}
            <div className={`
                mt-2 flex min-h-6 items-center justify-center gap-1.5 text-sm transition-colors
                ${
                    isValid
                        ? "font-medium text-emerald-400"
                        : isInvalidComplete
                            ? "font-medium text-red-400"
                        :showIncompleteHint
                            ? "font-medium text-amber-300"
                            : "text-white/50"
            }
            `}
            >
             <span>
                {toPersianDigits(String(nationalId.length))} از {" "}
                {toPersianDigits(String(MAX_LENGTH))} رقم
             </span>
                {isValid && <CheckIcon />}
                {isInvalidComplete && <span>(کدملی صحیح نیست)</span>}
                {showIncompleteHint && !isComplete && (
                    <span>(کد ملی را کامل وارد کنید)</span>
                )}
            </div>

            {/* Error */}

            {error && (
                <div
                    className="
                        mt-3
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
                    value={nationalId}
                    onChange={handleChange}
                    maxLength={MAX_LENGTH}
                    onSubmit={handleSubmit}
                    disabled={loading}
                    loading={loading}
                    submitEnabled={isValid}
                    submitLabel="تایید"
                    loadingLabel="در حال بررسی ..."
                    />
            </div>

            {/* Navigation */}

            <KioskNavigation
                onBack={onBack}
                onCancel={onCancel}
                disabled={loading}
            />
        </div>
    );
}