"use client";

import { formatDateTime } from "@/components/admin/format";
import { useFetch } from "@/components/admin/hooks";
import { Card, Empty, Loading, Table } from "@/components/admin/ui";

type Entry = { id: number; occurredAt: string; adminUsername: string | null; action: string; target: string | null; details: string | null };

const LABELS: Record<string, string> = {
    setup: "راه‌اندازی اولیه", login: "ورود", login_failed: "ورود ناموفق", logout: "خروج",
    "password.change": "تغییر رمز", "kiosk.create": "ساخت کیوسک", "kiosk.update": "ویرایش کیوسک", "kiosk.pairing_code": "صدور کد جفت‌سازی", "kiosk.revoke": "ابطال جفت‌سازی",
    "alert.ack": "تأیید هشدار", "appointment.status": "تغییر وضعیت نوبت", "appointment.reveal_identity": "نمایش هویت بیمار", "report.export": "خروجی گزارش",
    "doctor.create": "ساخت پزشک", "doctor.update": "ویرایش پزشک", "specialty.create": "ساخت تخصص", "specialty.update": "ویرایش تخصص", "schedule.update": "تغییر برنامه‌ی هفتگی",
    "exception.add": "ثبت استثنا", "exception.absent_today": "غیبت امروز", "exception.remove": "حذف استثنا", "user.create": "ساخت کاربر", "user.update": "ویرایش کاربر",
};

export default function AuditPage() {
    const { data, loading, error } = useFetch<Entry[]>("/audit?limit=200");

    return (
        <div className="flex flex-col gap-5">
            <h1 className="text-2xl font-bold">گزارش فعالیت‌ها</h1>
            <Card>
                {loading ? <Loading /> : error || !data ? <Empty>{error}</Empty> : data.length === 0 ? <Empty>موردی ثبت نشده است.</Empty> : (
                    <Table head={["زمان", "کاربر", "کار", "مورد", "جزئیات"]}>
                        {data.map((entry) => (
                            <tr key={entry.id}>
                                <td className="whitespace-nowrap text-xs">{formatDateTime(entry.occurredAt)}</td>
                                <td dir="ltr" className="text-right">{entry.adminUsername ?? "—"}</td>
                                <td className="font-medium">{LABELS[entry.action] ?? entry.action}</td>
                                <td>{entry.target ?? "—"}</td>
                                <td dir="ltr" className="max-w-xs truncate text-right text-xs text-ink-muted">{entry.details ?? ""}</td>
                            </tr>
                        ))}
                    </Table>
                )}
            </Card>
        </div>
    );
}