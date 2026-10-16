import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/session";
import {
    adminListSchedules,
    adminUpsertSchedule,
} from "@/lib/db/admin-repositories";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Ctx) {
    try {
        await requireAdminSession();
    } catch {
        return NextResponse.json(
            { success: false, message: "ابتدا وارد شوید" },
            { status: 401 },
        );
    }
    try {
        const { id } = await context.params;
        const doctorId = Number(id);
        if (!Number.isInteger(doctorId) || doctorId <= 0) {
            return NextResponse.json(
                { success: false, message: "شناسه پزشک نامعتبر است" },
                { status: 400 },
            );
        }
        const data = await adminListSchedules(doctorId);
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("GET schedules", error);
        return NextResponse.json(
            { success: false, message: "خطا در دریافت برنامه" },
            { status: 500 },
        );
    }
}

export async function POST(request: NextRequest, context: Ctx) {
    try {
        await requireAdminSession();
    } catch {
        return NextResponse.json(
            { success: false, message: "ابتدا وارد شوید" },
            { status: 401 },
        );
    }
    try {
        const { id } = await context.params;
        const doctorId = Number(id);
        const body = await request.json();
        const weekday = Number(body.weekday);
        const startTime = String(body.startTime ?? "").trim();
        const endTime = String(body.endTime ?? "").trim();
        const validFrom = String(body.validFrom ?? "").trim();

        if (
            !Number.isInteger(doctorId) ||
            doctorId <= 0 ||
            !Number.isInteger(weekday) ||
            weekday < 0 ||
            weekday > 6 ||
            !startTime ||
            !endTime ||
            !validFrom
        ) {
            return NextResponse.json(
                { success: false, message: "اطلاعات برنامه ناقص است" },
                { status: 400 },
            );
        }

        await adminUpsertSchedule({
            id: body.id != null ? Number(body.id) : undefined,
            doctorId,
            weekday,
            startTime,
            endTime,
            validFrom,
            validUntil:
                body.validUntil == null || body.validUntil === ""
                    ? null
                    : String(body.validUntil),
            isActive: body.isActive !== false,
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("POST schedules", error);
        return NextResponse.json(
            { success: false, message: "خطا در ذخیره برنامه" },
            { status: 500 },
        );
    }
}