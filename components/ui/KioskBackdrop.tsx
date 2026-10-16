/**
 * پس‌زمینه‌ی ثابت و سبک (جایگزین IrisMedicalBackground پویا).
 * حلقه‌های هم‌مرکز با نشانه‌های ریز، یادآور نمودار بینایی‌سنجی و عنبیه؛
 * فقط یک حلقه‌ی نقطه‌چین خیلی آهسته می‌چرخد.
 */

const TICKS = Array.from({ length: 72 }, (_, i) => {
    const angle = (i * 5 * Math.PI) / 180;
    const major = i % 6 === 0;
    const outer = 392;
    const inner = major ? 366 : 380;

    return {
        key: i,
        x1: (400 + Math.cos(angle) * inner).toFixed(2),
        y1: (400 + Math.sin(angle) * inner).toFixed(2),
        x2: (400 + Math.cos(angle) * outer).toFixed(2),
        y2: (400 + Math.sin(angle) * outer).toFixed(2),
    };
});

export default function KioskBackdrop() {
    return (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="absolute -top-40 right-0 size-160 rounded-full bg-brand-soft blur-3xl" />

            <svg
                viewBox="0 0 800 800"
                className="absolute -bottom-72 -left-72 w-224 max-w-none text-iris opacity-20"
                fill="none"
                stroke="currentColor"
            >
                <circle cx="400" cy="400" r="300" strokeWidth="2" />
                <circle cx="400" cy="400" r="230" strokeWidth="2" />
                <circle cx="400" cy="400" r="160" strokeWidth="2" />
                <circle cx="400" cy="400" r="90" strokeWidth="3" />
                <circle cx="400" cy="400" r="30" strokeWidth="3" />

                <g className="ring-turn">
                    <circle cx="400" cy="400" r="340" strokeWidth="2" strokeDasharray="4 14" />
                </g>

                {TICKS.map((tick) => (
                    <line
                        key={tick.key}
                        x1={tick.x1}
                        y1={tick.y1}
                        x2={tick.x2}
                        y2={tick.y2}
                        strokeWidth="2"
                    />
                ))}
            </svg>
        </div>
    );
}
