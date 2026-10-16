import type { ReactNode } from "react";

type IconProps = { className?: string };

function Svg({ children, className = "size-6" }: IconProps & { children: ReactNode }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {children}
        </svg>
    );
}

/** در رابط راست‌به‌چپ، «بازگشت» به سمت راست اشاره می‌کند */
export function ChevronRightIcon(props: IconProps) {
    return <Svg {...props}><path d="m9 18 6-6-6-6" /></Svg>;
}

export function CheckIcon(props: IconProps) {
    return <Svg {...props}><path d="M20 6 9 17l-5-5" /></Svg>;
}

export function AlertIcon(props: IconProps) {
    return (
        <Svg {...props}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 7.5v5" />
            <path d="M12 16.5h.01" />
        </Svg>
    );
}

export function BackspaceIcon(props: IconProps) {
    return (
        <Svg {...props}>
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
            <path d="m18 9-6 6" />
            <path d="m12 9 6 6" />
        </Svg>
    );
}

export function PlusTicketIcon(props: IconProps) {
    return (
        <Svg {...props}>
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <path d="M12 8v8M8 12h8" />
        </Svg>
    );
}

export function HistoryIcon(props: IconProps) {
    return (
        <Svg {...props}>
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l3 2" />
        </Svg>
    );
}

export function IdCardIcon(props: IconProps) {
    return (
        <Svg {...props}>
            <rect x="2.5" y="5" width="19" height="14" rx="3" />
            <circle cx="8.5" cy="11" r="2" />
            <path d="M5.5 16c.6-1.6 1.8-2.4 3-2.4s2.4.8 3 2.4" />
            <path d="M14.5 10h4M14.5 13.5h3" />
        </Svg>
    );
}

export function PhoneIcon(props: IconProps) {
    return (
        <Svg {...props}>
            <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
            <path d="M11 18.5h2" />
        </Svg>
    );
}

export function EyeIcon(props: IconProps) {
    return (
        <Svg {...props}>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
        </Svg>
    );
}

export function HeartIcon(props: IconProps) {
    return (
        <Svg {...props}>
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
        </Svg>
    );
}

export function DropletIcon(props: IconProps) {
    return (
        <Svg {...props}>
            <path d="M12 2.7S5 10 5 14.5a7 7 0 0 0 14 0C19 10 12 2.7 12 2.7z" />
        </Svg>
    );
}

export function SparkleIcon(props: IconProps) {
    return (
        <Svg {...props}>
            <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
            <path d="m19 17 .7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7L19 17z" />
        </Svg>
    );
}

export function MedicalCrossIcon(props: IconProps) {
    return (
        <Svg {...props}>
            <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" />
        </Svg>
    );
}

/** آیکن تخصص بر اساس فیلد icon در داده‌ها */
export function SpecialtyIcon({ name, className }: { name: string | null } & IconProps) {
    switch (name) {
        case "eye":
            return <EyeIcon className={className} />;
        case "heart":
            return <HeartIcon className={className} />;
        case "skin":
            return <DropletIcon className={className} />;
        case "beauty":
            return <SparkleIcon className={className} />;
        default:
            return <MedicalCrossIcon className={className} />;
    }
}
