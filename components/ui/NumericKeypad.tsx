"use client"

type  NumericKeypadProps = {
    value: string;
    onChange: (value: string) => void;
    maxLength?: number;
    onSubmit?: () => void;
    disabled?: boolean;
    loading?: boolean;
    submitEnabled?: boolean;
    submitLabel?: string;
    loadingLabel?: string;
};

const KEYS = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["backspace", "0", "submit"],
] as const;

function BackspaceIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
            <path d="M18 9l-6 6" />
            <path d="M12 9l6 6" />
        </svg>
    );
}

export default function NumericKeypad({
    value,
    onChange,
    maxLength = 11,
    onSubmit,
    disabled = false,
    loading = false,
    submitEnabled,
    submitLabel = "تایید",
    loadingLabel = "در حال بررسی...",

                                      }: NumericKeypadProps) {
    const isDisabled = disabled || loading;
    const canSubmit =
        !isDisabled &&
        !!onSubmit &&
        (submitEnabled ?? value.length >= maxLength);

    function handlePress(key: string) {
        if (isDisabled) return;
        if (key === "backspace") {
            onChange(value.slice(0, -1));
            return;
        }
        if (key === "submit") {
            if (canSubmit) onSubmit?.();
            return;
        }

        if (value.length >= maxLength) return;
        onChange(value + key);
    }

    return (
        <div dir="ltr" className="mx-auto w-full max-w-80">
            <div className="grid grid-cols-3 place-items-center gap-x-3 gap-y-3">
                {KEYS.flat().map((key) => {
                    const isBackspace = key === "backspace";
                    const isSubmit = key === "submit";

                    return (
                        <button
                            key={key}
                            type="button"
                            disabled={
                                isDisabled ||
                                (isSubmit && !canSubmit) ||
                                (isBackspace && value.length === 0)
                            }
                            onClick={() => handlePress(key)}
                            className={`
                                relative
                                flex
                                h-[72px]
                                w-[72px]
                                items-center
                                justify-center
                                rounded-full
                                border
                                text-2xl
                                font-bold
                                transition-all
                                active:scale-95
                                disabled:opacity-35
                                disabled:active:scale-100
                                before:absolute
                                before:-inset-2
                                before:rounded-full
                                before:content-['']
                                ${
                                    isSubmit
                                        ? "border-darkblue/40 bg-darkblue text-white hover:brightness-110"
                                        : isBackspace
                                            ? "border-white/15 bg-white/5 text-white/75 hover:bg-white/10"
                                            : "border-white/20 bg-white/10 text-white hover:bg-white/15"
                             }
                           `}
                            >
                                {isBackspace && <BackspaceIcon />}

                                {isSubmit && (
                                    <span className="px-1 text-center text-sm font-bold leading-none">
                                        {loading ? loadingLabel : submitLabel}
                                    </span>
                                )}
                                {!isBackspace && !isSubmit && key}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}