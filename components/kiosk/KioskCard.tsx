import type { ReactNode } from "react";

type KioskCardProps = {
    children: ReactNode;
    onClick?: () => void;
    className?: string;
};

export default function KioskCard({
    children,
    onClick,
    className = "",
                                  }: KioskCardProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
            group
            relative
            flex
            min-h-45
            w-full
            touch-manipulation
            select-none
            flex-col
            items-center
            justify-center
            overflow-hidden
            rounded-4xl
            border
            border-white/10
            bg-white/5.5
            p-8
            text-center
            backdrop-blur-2xl
            transition-all
            duration-200
            active:scale-[0.97]
            active:bg-white/[0.09]
            focus:outline-none
            focus-visible:ring-2
            focus-visible:ring-cyan-300/60
            ${className}
            `}
        >
            {/* Glass reflection */}
            <div
                className="pointer-events-none
                absolute
                inset-0
                bg-linear-to-br
                from-white/[0.07]
                via-transparent
                to-transparent
                "
                />

            <div className='relative z-10 w-full'>
                {children}
            </div>
        </button>
    );
}