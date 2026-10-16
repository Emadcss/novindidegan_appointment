import type { ReactNode } from "react";
import Spinner from "@/components/ui/Spinner";
import { AlertIcon } from "@/components/ui/Icons";

type StatusPanelProps = {
    tone: "loading" | "error" | "empty";
    /** چه اتفاقی افتاد */
    title: string;
    /** چرا و چه باید کرد */
    description?: string;
    /** دکمه‌های راه‌حل */
    children?: ReactNode;
};

const TONE_STYLES = {
    error: "bg-danger-soft text-danger",
    empty: "bg-warning-soft text-warning",
    loading: "",
} as const;

export default function StatusPanel({ tone, title, description, children }: StatusPanelProps) {
    return (
        <div
            role={tone === "error" ? "alert" : "status"}
            className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-5 py-10 text-center"
        >
            {tone === "loading" ? (
                <Spinner />
            ) : (
                <span className={`flex size-20 items-center justify-center rounded-full ${TONE_STYLES[tone]}`}>
                    <AlertIcon className="size-10" />
                </span>
            )}

            <h2 className="text-heading font-bold text-ink">{title}</h2>

            {description && <p className="text-body text-ink-muted">{description}</p>}

            {children && <div className="mt-4 flex flex-wrap justify-center gap-4">{children}</div>}
        </div>
    );
}
