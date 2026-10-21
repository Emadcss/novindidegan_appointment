import { toPersianDigits } from "@/lib/utils/persian-digits";

type DigitFieldProps = {
    value: string;
    length: number;
    /** گروه‌بندی خانه‌ها برای خوانایی، مثل [3, 3, 4] برای کد ملی */
    groups: number[];
    status: "idle" | "valid" | "invalid";
    label: string;
};

/**
 * نمایش خانه‌به‌خانه‌ی عدد واردشده.
 * خانه‌ی بعدی پررنگ می‌شود تا کاربر بداند «چه چیزی مانده».
 */
export default function DigitField({ value, length, groups, status, label }: DigitFieldProps) {
    return (
        <div
            role="textbox"
            aria-readonly="true"
            aria-label={label}
            dir="ltr"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-x-5 sm:gap-y-3"
        >
            {groups.map((size, groupIndex) => {
                const start = groups.slice(0, groupIndex).reduce((sum, n) => sum + n, 0);

                return (
                    <div key={groupIndex} className="flex gap-1 sm:gap-2">
                        {Array.from({ length: size }, (_, i) => {
                            const index = start + i;
                            const char = value[index];
                            const isNext = index === value.length && value.length < length;

                            let tone = "border-line-strong bg-surface text-ink";
                            if (status === "valid") tone = "border-success bg-success-soft text-success";
                            else if (status === "invalid") tone = "border-danger bg-danger-soft text-danger";
                            else if (isNext) tone = "border-brand bg-brand-soft text-ink";
                            else if (char) tone = "border-brand bg-surface text-ink";

                            return (
                                <span
                                    key={index}
                                    className={`flex h-11 w-7 items-center justify-center rounded-lg border-2 text-xl font-bold tabular-nums sm:h-16 sm:w-12 sm:rounded-control sm:text-3xl ${tone}`}
                                >
                                    {char ? toPersianDigits(char) : ""}
                                </span>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}
