import type {
    Doctor,
    Specialty
} from "@/types/kiosk";

type ApiResponse<T> = {
    success: boolean;
    data: T;
    message?: string;
};

export async function fetchSpecialties(): Promise<Specialty[]> {
    const response = await fetch(
        "/api/kiosk/specialties",
        {
            method: "get",
            cache: "no-store",
        }
    );

    const result: ApiResponse<Specialty[]> =
        await response.json();

    if (!response.ok || !result.success) {
        throw new Error(
            result.message ||
            "خطا در دریافت تخصص ها"
        );
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

    return result.data;
}