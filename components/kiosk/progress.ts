import type { ProgressItem } from "@/components/ui/KioskProgress";
import type { KioskFlow, KioskStep } from "@/types/kiosk";

/** در این مرحله‌ها نوار مراحل نمایش داده نمی‌شود */
const HIDDEN_STEPS: KioskStep[] = [
    "welcome",
    "main-choice",
    "previous-not-found",
    "print-success",
];

/** مرحله‌های «در حال ثبت / نتیجه» (آخرین مرحله‌ی نوار) */
const FINISH_STEPS: KioskStep[] = [
    "submitting",
    "print-success",
    "submit-error",
    "printing",
];

function getItems(
    flow: KioskFlow | null,
    requiresSurgeryHistory: boolean,
): ProgressItem[] {
    if (flow === "new") {
        const items: ProgressItem[] = [
            { id: "specialty", label: "تخصص" },
            { id: "doctor", label: "پزشک" },
            { id: "identity", label: "مشخصات" },
        ];

        if (requiresSurgeryHistory) {
            items.push({ id: "surgery", label: "سابقه جراحی" });
        }

        items.push({ id: "ticket", label: "چاپ قبض" });
        return items;
    }

    if (flow === "previous") {
        return [
            { id: "identity", label: "مشخصات" },
            { id: "lookup", label: "بررسی نوبت" },
            { id: "ticket", label: "چاپ قبض" },
        ];
    }

    return [];
}

function getIndex(
    step: KioskStep,
    flow: KioskFlow | null,
    requiresSurgeryHistory: boolean,
): number {
    if (flow === "new") {
        switch (step) {
            case "new-specialty":
                return 0;
            case "new-doctor":
                return 1;
            case "new-nationality":
            case "national-id":
            case "mobile":
                return 2;
            case "surgery-history":
                return 3;
            default:
                return FINISH_STEPS.includes(step)
                    ? requiresSurgeryHistory
                        ? 4
                        : 3
                    : 0;
        }
    }

    if (flow === "previous") {
        switch (step) {
            case "previous-nationality":
            case "national-id":
            case "mobile":
                return 0;
            case "previous-lookup":
            case "previous-select":
                return 1;
            default:
                return FINISH_STEPS.includes(step) ? 2 : 0;
        }
    }

    return 0;
}

export function getKioskProgress(
    step: KioskStep,
    flow: KioskFlow | null,
    requiresSurgeryHistory: boolean,
): { items: ProgressItem[]; activeIndex: number; visible: boolean } {
    const items = getItems(flow, requiresSurgeryHistory);

    return {
        items,
        activeIndex: Math.min(
            getIndex(step, flow, requiresSurgeryHistory),
            Math.max(items.length - 1, 0),
        ),
        visible: !HIDDEN_STEPS.includes(step) && items.length > 0,
    };
}
