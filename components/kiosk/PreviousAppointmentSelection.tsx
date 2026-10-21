"use client";

import ChoiceCard from "@/components/ui/ChoiceCard";
import Screen from "@/components/ui/Screen";
import { toPersianDigits } from "@/lib/utils/persian-digits";
import type { PreviousAppointmentSummary } from "@/types/kiosk";

type PreviousAppointmentSelectionProps = {
    appointments: PreviousAppointmentSummary[];
    onSelect: (appointment: PreviousAppointmentSummary) => void;
    onBack: () => void;
    onCancel: () => void;
};

/**
 * بیمار امروز چند نوبت دارد (چند تخصص یا چند پزشک)؛
 * شماره‌ی هر نوبت داخل دایره است.
 */
export default function PreviousAppointmentSelection({
    appointments,
    onSelect,
    onBack,
    onCancel,
}: PreviousAppointmentSelectionProps) {
    return (
        <Screen
            title={`شما امروز ${toPersianDigits(appointments.length)} نوبت دارید`}
            hint="نوبتی را که می‌خواهید ببینید لمس کنید"
            onBack={onBack}
            onCancel={onCancel}
        >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                {appointments.map((appointment) => (
                    <ChoiceCard
                        key={appointment.appointmentId}
                        size="compact"
                        icon={
                            <span className="text-heading font-bold tabular-nums">
                                {toPersianDigits(appointment.appointmentNumber)}
                            </span>
                        }
                        title={appointment.doctor?.displayName ?? "پزشک"}
                        description={`${appointment.specialty?.name ?? ""} · ساعت ${toPersianDigits(appointment.appointmentTime)}`}
                        onClick={() => onSelect(appointment)}
                    />
                ))}
            </div>
        </Screen>
    );
}
