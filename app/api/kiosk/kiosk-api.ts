import type {
    Doctor,
    SpecialtyWithAvailability,
} from "@/types/kiosk";

type ApiResponse<T> = {
    success: boolean;
    data: T;
    message?: string;
};

export async function fetchSpecialties(): Promise<SpecialtyWithAvailability[]> {
    const response = await fetch(
        "/api/kiosk/specialties",
        {
            method: "get",
            cache: "no-store",
        }
    );

    const result: ApiResponse<SpecialtyWithAvailability[]> =
        await response.json();

    if (!response.ok || !result.success) {
        throw new Error(
            result.message ||
            "خطا در دریافت تخصص ها"
        );
    }

    // پاسخ باید فهرست باشد؛ در غیر این صورت به‌جای صفحه‌ی خالی، خطا و «تلاش دوباره» نشان داده می‌شود
    if (!Array.isArray(result.data)) {
        throw new Error("پاسخ نامعتبر از سرور");
    }

    return result.data;
}

export async function fetchDoctors(
    specialtyId: number
): Promise<Doctor[]> {
    const response = await fetch(
        `/api/kiosk/doctors?specialtyId=${specialtyId}`,
        {
            method: "get",
            cache: "no-store",
        }
    );

    const result: ApiResponse<Doctor[]> =
        await response.json();

    if (!response.ok || !result.success) {
        throw new Error(
            result.message ||
            "خطا در دریافت پزشکان"
        );
    }

    if (!Array.isArray(result.data)) {
        throw new Error("پاسخ نامعتبر از سرور");
    }

    return result.data;
}
