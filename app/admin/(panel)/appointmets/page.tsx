import { adminListAppointmentsToday } from "@/lib/db/admin-repositories";

export default async function AppointmentsPage() {
    const data = await adminListAppointmentsToday();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">نوبت‌های امروز</h1>
                <p className="text-sm text-slate-500">{data.day}</p>
            </div>

            <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-right">
                    <tr>
                        <th className="p-3">شماره</th>
                        <th className="p-3">ساعت</th>
                        <th className="p-3">پزشک</th>
                        <th className="p-3">تخصص</th>
                        <th className="p-3">وضعیت</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data.items.length === 0 && (
                        <tr>
                            <td colSpan={5} className="p-4 text-slate-500">
                                نوبتی ثبت نشده
                            </td>
                        </tr>
                    )}
                    {data.items.map((a) => (
                        <tr key={a.id} className="border-t">
                            <td className="p-3 font-bold">{a.number}</td>
                            <td className="p-3">{a.time}</td>
                            <td className="p-3">{a.doctorName}</td>
                            <td className="p-3">{a.specialtyName}</td>
                            <td className="p-3">{a.status}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}