import type { Row } from "@/lib/db/connection";

/** مقدار منطقی از PostgreSQL (boolean) یا موتور آزمایشی (۰/۱) */
export const toBool = (value: unknown): boolean =>
    value === true || Number(value) === 1;

export const toNullableString = (value: unknown): string | null =>
    value === null || value === undefined ? null : String(value);

/** زمان از PostgreSQL (Date) یا متن ISO → همیشه متن ISO، یا null */
export const toIso = (value: unknown): string | null =>
    value === null || value === undefined
        ? null
        : new Date(value as string | Date).toISOString();

export const toNullableNumber = (value: unknown): number | null =>
    value === null || value === undefined ? null : Number(value);

/** ساعت از PostgreSQL «HH:MM:SS» → «HH:MM» */
export const toHourMinute = (value: unknown): string => String(value).slice(0, 5);

export function parseJson<T>(value: unknown, fallback: T): T {
    if (typeof value !== "string" || value === "") return fallback;

    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
}

export type { Row };