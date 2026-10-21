"use client";

import { useEffect, useState, type ReactNode } from "react";

import Button from "@/components/ui/Button";
import DigitField from "@/components/ui/DigitField";
import { AlertIcon, CheckIcon } from "@/components/ui/Icons";
import NumericKeypad from "@/components/ui/NumericKeypad";
import Screen from "@/components/ui/Screen";
import { normalizeDigits, toPersianDigits } from "@/lib/utils/persian-digits";

export type DigitEntryFormProps = {
    value?: string;
    onSubmit: (value: string) => void;
    onBack: () => void;
    onCancel: () => void;
    loading?: boolean;
    error?: string | null;
};

type DigitEntryConfig = {
    title: string;
    hint: string;
    fieldLabel: string;
    length: number;
    groups: number[];
    validate: (value: string) => boolean;
    validMessage: string;
    invalidMessage: string;
};

const INCOMPLETE_HINT_DELAY = 2000;

/**
 * فرم مشترک ورود عدد (کد ملی و موبایل).
 * منطق، چیدمان و پیام‌ها یک‌جاست؛ دو فرم فقط تنظیمات می‌دهند.
 */
export default function DigitEntryForm({
    title,
    hint,
    fieldLabel,
    length,
    groups,
    validate,
    validMessage,
    invalidMessage,
    value = "",
    onSubmit,
    onBack,
    onCancel,
    loading = false,
    error = null,
}: DigitEntryFormProps & DigitEntryConfig) {
    const [digits, setDigits] = useState(() => normalizeDigits(value).slice(0, length));
    const [hintFor, setHintFor] = useState<string | null>(null);

    const isComplete = digits.length === length;
    const isValid = isComplete && validate(digits);
    const isInvalidComplete = isComplete && !isValid;
    const remaining = length - digits.length;
    const showIncompleteHint = hintFor === digits && digits.length > 0 && !isComplete;

    // اگر کاربر مکث کند، یادآوری می‌کنیم چند رقم مانده است
    useEffect(() => {
        if (digits.length === 0 || isComplete) return;

        const timer = window.setTimeout(() => setHintFor(digits), INCOMPLETE_HINT_DELAY);
        return () => window.clearTimeout(timer);
    }, [digits, isComplete]);

    function handleChange(next: string) {
        if (loading) return;
        setDigits(normalizeDigits(next).slice(0, length));
    }

    function handleSubmit() {
        if (loading || !validate(digits)) return;
        onSubmit(digits);
    }

    let message: { tone: string; icon: ReactNode; text: string };

    if (isValid) {
        message = { tone: "text-success", icon: <CheckIcon className="size-6" />, text: validMessage };
    } else if (isInvalidComplete) {
        message = { tone: "text-danger", icon: <AlertIcon className="size-6" />, text: invalidMessage };
    } else if (showIncompleteHint) {
        message = {
            tone: "text-warning",
            icon: <AlertIcon className="size-6" />,
            text: `${toPersianDigits(remaining)} رقم دیگر لازم است`,
        };
    } else {
        message = {
            tone: "text-ink-muted",
            icon: null,
            text: `${toPersianDigits(digits.length)} از ${toPersianDigits(length)} رقم`,
        };
    }

    return (
        <Screen title={title} onBack={onBack} onCancel={onCancel} navDisabled={loading}>
            <div className="grid flex-1 content-start items-center gap-5 sm:gap-10 lg:grid-cols-[1fr_22rem]">
                <div className="flex flex-col items-center gap-3 sm:gap-5 short:sm:gap-3">
                    <p className="text-center text-base text-ink-muted sm:text-body">{hint}</p>

                    <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        enterKeyHint="go"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        dir="ltr"
                        aria-label={fieldLabel}
                        value={toPersianDigits(digits)}
                        maxLength={length}
                        disabled={loading}
                        onChange={(event) => handleChange(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                handleSubmit();
                            }
                        }}
                        className={`w-full max-w-sm rounded-control border-2 bg-surface px-3 py-3 text-center text-xl font-bold tracking-[0.25em] tabular-nums outline-none disabled:opacity-60 sm:hidden ${
                            isValid
                                ? "border-success bg-success-soft text-success"
                                : isInvalidComplete
                                    ? "border-danger bg-danger-soft text-danger"
                                    : "border-line-strong text-ink focus:border-brand"
                        }`}
                    />

                    <div className="hidden sm:block">
                        <DigitField
                            value={digits}
                            length={length}
                            groups={groups}
                            label={fieldLabel}
                            status={isValid ? "valid" : isInvalidComplete ? "invalid" : "idle"}
                        />
                    </div>

                    <p
                        role="status"
                        aria-live="polite"
                        className={`flex min-h-8 items-center gap-2 text-base font-bold sm:min-h-10 sm:text-body ${message.tone}`}
                    >
                        {message.icon}
                        {message.text}
                    </p>

                    {error && (
                        <p
                            role="alert"
                            className="w-full max-w-xl rounded-control bg-danger-soft px-5 py-4 text-center text-body font-bold text-danger"
                        >
                            {error}
                        </p>
                    )}
                </div>

                <div className="mx-auto flex w-full max-w-sm flex-col gap-3 sm:gap-4 short:sm:gap-3">
                    <div className="hidden sm:block">
                        <NumericKeypad
                            value={digits}
                            onChange={handleChange}
                            maxLength={length}
                            disabled={loading}
                        />
                    </div>

                    <Button
                        size="lg"
                        fullWidth
                        disabled={!isValid}
                        loading={loading}
                        onClick={handleSubmit}
                    >
                        تأیید و ادامه
                    </Button>
                </div>
            </div>
        </Screen>
    );
}
