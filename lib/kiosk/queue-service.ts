import { dailyAppointmentCounters } from "@/data/kiosk-data";

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export function getNextAppointmentNumber(
    specialtyId: number,
    doctorId: number,
    date: Date = new Date()
): number {
    const appointmentDate = formatDate(date);

    let counter =
        dailyAppointmentCounters.find(
            (item) =>
                item.specialtyId === specialtyId &&
                item.doctorId === doctorId &&
                item.date === appointmentDate
    );

    if (!counter) {
        counter = {
            id:
                dailyAppointmentCounters.length > 0
                    ? Math.max(
                        ...dailyAppointmentCounters.map(
                            (item) => item.id
                        )
                    ) +1
                    : 1,
            specialtyId,
            doctorId,
            date: appointmentDate,
            lastNumber: 0,
        };

        dailyAppointmentCounters.push(counter);
    }

    counter.lastNumber += 1;

    return counter.lastNumber;
}