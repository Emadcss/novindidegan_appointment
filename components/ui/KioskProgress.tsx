"use client";

type ProgressItem = {
    id: string;
    label: string;
};

type KioskProgressProps = {
    items: ProgressItem[];
    activeIndex: number;
};

export default function KioskProgress({
    items,
    activeIndex,
                                      }: KioskProgressProps) {
    if (items.length <= 1) {
        return null;
    }

    return (
        <div
            dir="rtl"
            className="mb-8 w-full"
        >
            <div className="flex items-center justify-center">
                {items.map((item, index) => {
                    const isCompleted =
                        index < activeIndex;

                    const isActive =
                        index === activeIndex;

                    return (
                        <div
                            key={item.id}
                            className="flex items-center"
                        >
                            <div className="flex flex-col items-center">
                                <div
                                    className={`
                                        flex h-10 w-10
                                        items-center justify-center
                                        rounded-full
                                        border
                                        text-sm font-bold
                                        transition-all
                                        ${
                                            isActive
                                                ? "border-t-lightblue bg-lightblue text-white"
                                                : isCompleted
                                                    ? "border-white/40 bg-white/20 text-white"
                                                    : "border-white/15 bg-white/5 text-white/40"
                                    }
                                  `}
                                >
                                    {isCompleted
                                        ? "✓"
                                        : index + 1}
                                </div>

                                <span
                                    className={`
                                        mt-2
                                        whitespace-nowrap
                                        text-xs
                                        md:text-sm
                                        ${
                                            isActive
                                                ? "font-bold text-white"
                                                : isCompleted
                                                    ? "text-white/70"
                                                    : "text-white/40"
                                    }
                                  `}
                                >
                                  {item.label}
                                </span>
                            </div>

                            {index < items.length - 1 && (
                                <div
                                    className={`
                                        mx-2
                                        mb-6
                                        h-px
                                        w-8
                                        md:w-16
                                        ${
                                            index <
                                            activeIndex
                                                ? "bg-white/50"
                                                : "bg-white/15"
                                    }
                                  `}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}