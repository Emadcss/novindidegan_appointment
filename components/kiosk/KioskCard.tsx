import type { ReactNode } from "react";

type KioskCardProps = {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
    selected?: boolean;
};

export default function KioskCard({
    children,
    onClick,
    className = "",
    selected = false,
                                  }: KioskCardProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
            group
            relative
            flex
            min-h-44
            w-full
            touch-manipulation
            select-none
            flex-col
            items-center
            justify-center
            overflow-hidden
            rounded-[1.75rem]
            border
            p-8
            text-center
            transition-all
            duration-150
            focus:outline-none
            focus-visible:ring-2
            focus-visible:ring-(--kiosk-focus)
            active:scale-[0.98]
            ${
                selected
                    ? "border-cyan-300/40 bg-cyan-400/10"
                    : "border-white/12 bg-white/[0.06] hover:bg-white/[0.09]"
            }
            ${className}
            `}
        >
            {/* Glass reflection */}
            <div
                className="pointer-events-none
                absolute
                inset-x-0
                top-0
                h-1/2
                bg-linear-to-b
                from-white/[0.08]
                to-transparent
                "
                />

            <div className='relative z-10 w-full'>
                {children}
            </div>
        </button>
    );
}