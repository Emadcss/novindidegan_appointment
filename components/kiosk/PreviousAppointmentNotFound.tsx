"use client";

import Button from "@/components/ui/Button";
import Screen from "@/components/ui/Screen";
import StatusPanel from "@/components/ui/StatusPanel";

type PreviousAppointmentNotFoundProps = {
    onBack: () => void;
    onCancel: () => void;
    onNewAppointment: () => void;
};

export default function PreviousAppointmentNotFound({
                                                        onBack,
                                                        onCancel,
                                                        onNewAppointment,
                                                    }: PreviousAppointmentNotFoundProps) {
    return (
        <Screen title="جستجوی نوبت قبلی" onBack={onBack} onCancel={onCancel}>
            <StatusPanel
                tone="empty"
                title="نوبتی برای شما پیدا نشد"
                description="با این مشخصات نوبتی پیدا نکردیم. مشخصات را بررسی کنید یا نوبت جدید بگیرید."
            >
                <Button size="lg" onClick={onNewAppointment}>
                    دریافت نوبت جدید
                </Button>
                <Button size="lg" variant="secondary" onClick={onBack}>
                    اصلاح مشخصات
                </Button>
            </StatusPanel>
        </Screen>
    );
}
