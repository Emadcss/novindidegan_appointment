import type { ReactNode } from "react";
import KioskCard from "./KioskCard";

type KioskChoiceProps = {
    icon: ReactNode;
    title: string;
    description?: string;
    onClick: () => void;
    featured?: boolean;
};

export default function KioskChoice({
                                        icon,
                                        title,
                                        description,
                                        onClick,
                                        featured = false,
                                    }: KioskChoiceProps) {
    return (
        <KioskCard
            onClick={onClick}
            className={
                featured
                    ? `
            border-cyan-300/25
            bg-cyan-400/[0.09]
            shadow-[0_20px_80px_rgba(0,160,240,0.12)]
          `
                    : ""
            }
        >
            <div
                className={`
          mx-auto
          flex
          h-20
          w-20
          items-center
          justify-center
          rounded-3xl
          border
          ${
                    featured
                        ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-200"
                        : "border-white/10 bg-white/[0.05] text-white/70"
                }
        `}
            >
                {icon}
            </div>

            <h2 className="mt-6 text-2xl font-bold text-white md:text-3xl">
                {title}
            </h2>

            {description && (
                <p className="mx-auto mt-3 max-w-xs text-sm leading-7 text-white/45 md:text-base">
                    {description}
                </p>
            )}
        </KioskCard>
    );
}