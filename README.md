# کلینیک نوین دیدگان — کیوسک نوبت‌دهی

اپلیکیشن Next.js برای ثبت نوبت بیماران در کلینیک فوق‌تخصصی نوین دیدگان روی کیوسک لمسی. هدف: کاهش ازدحام پذیرش و ثبت نوبت در چند لمس.

> **وضعیت فعلی:** رابط کاربری نهایی شده، جریان‌های «نوبت جدید» و «نوبت قبلی» با API کار می‌کنند و داده‌ها در **دیتابیس PostgreSQL** ذخیره می‌شوند (راه‌اندازی: [`docs/database.md`](docs/database.md)). چاپ قبض، پنل ادمین و ورود/جفت‌سازی کیوسک مراحل بعدی‌اند. جزئیات: [`docs/roadmap-and-known-issues.md`](docs/roadmap-and-known-issues.md)

## تکنولوژی

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · ESLint · PostgreSQL (درایور `pg`).

**نیازمندی:** Node ۲۰٫۹ یا بالاتر، PostgreSQL ۱۴ یا بالاتر. فونت‌ها محلی هستند (میخک برای رابط، آقاسم برای لوگوتایپ).

> **توجه برای توسعه‌دهنده و ابزارهای هوشمند:** این نسخه‌ی Next.js با نسخه‌هایی که می‌شناسید تفاوت دارد. پیش از نوشتن کد، راهنمای `node_modules/next/dist/docs/` را ببینید (به `AGENTS.md` مراجعه کنید).

## اجرا

```bash
npm install
# فایل .env.local را از روی .env.example بسازید (DATABASE_URL؛ راهنما: docs/database.md)
npm run dev        # http://localhost:3000
npm run build && npm start   # حالت تولید
npm run lint
```

### اجرا روی کیوسک (Chrome)

```bash
chrome --kiosk --kiosk-printing --disable-pinch \
       --overscroll-history-navigation=0 --noerrdialogs --disable-infobars \
       http://localhost:3000
```

`--kiosk-printing` برای چاپ بدون پنجره‌ی تأیید است (وقتی چاپ وصل شد). برای تست روی صفحه‌ی کوچک، با `F11` تمام‌صفحه کنید؛ ارتفاع قابل‌استفاده فرق می‌کند.

## ساختار

```text
app/
  api/kiosk/
    specialties/        GET   تخصص‌های دارای پزشک حاضر (+ تعداد پزشکان)
    doctors/            GET   پزشکان حاضر یک تخصص
    server-time/        GET   ساعت سرور برای همگام‌سازی کیوسک
    appointments/       POST  ثبت نوبت
    appointments/lookup POST  جستجوی نوبت امروز بیمار
    kiosk-api.ts              کلاینت GET ها
  globals.css                 توکن‌های طراحی
  layout.tsx                  فونت‌ها
components/
  ui/                         اجزای عمومی (Button، ChoiceCard، Screen، ...)
  kiosk/                      Kiosk.tsx (ترکیب)، KioskLayout، KioskStepView، مرحله‌ها، hooks/
lib/
  kiosk/                      منطق کسب‌وکار (سرویس‌ها، خطاها، اعتبارسنجی ورودی)
                              session.ts = ماشین حالت کیوسک، config.ts = زمان‌بندی‌ها
  time/                       ساعت و منطقه‌ی زمانی تهران
  utils/ validators/          ارقام فارسی، تاریخ شمسی، کد ملی، موبایل
lib/db/                       دیتابیس: اتصال، مهاجرت، seed، رمزنگاری هویت، کوئری‌ها
data/kiosk-data.ts            داده‌ی اولیه‌ی دیتابیس (تخصص، پزشک، برنامه)
storage/                      secret.key، کلید رمزنگاری هویت (در گیت نمی‌رود)
types/kiosk.ts                تایپ‌های مشترک
docs/                         مستندات (پایین)
```

## مستندات

| فایل | محتوا |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | معماری، ماشین حالت کیوسک، تایمرها، مدیریت زمان |
| [`docs/api.md`](docs/api.md) | قرارداد API، قالب خطا، کدهای خطا |
| [`docs/business-rules.md`](docs/business-rules.md) | قواعد کسب‌وکار (حضور پزشک، شماره‌دهی، نوبت تکراری، نوبت قبلی) |
| [`docs/roadmap-and-known-issues.md`](docs/roadmap-and-known-issues.md) | وضعیت باگ‌ها، تصمیم‌های باز، نقشه‌ی راه (دیتابیس، چاپ، امنیت، تست) |
| [`docs/database.md`](docs/database.md) | PostgreSQL: راه‌اندازی، جدول‌ها، هم‌زمانی، هویت رمزنگاری‌شده، خودآزمایی، پشتیبان و عیب‌یابی |
| [`docs/deployment.md`](docs/deployment.md) | معماری استقرار (سرور مرکزی و کیوسک‌ها)، امنیت، چاپگر، فهرست خرید، مراحل پیاده‌سازی |
| [`docs/spec-vs-code.md`](docs/spec-vs-code.md) | تفاوت‌های «مستند پروژه» (`project document.txt`) با کد فعلی |
| [`docs/ui-ux/`](docs/ui-ux) | سیستم طراحی، بررسی قابلیت استفاده، متن‌های رابط |
| [`project document.txt`](project document.txt) | مستند اولیه‌ی طراحی و تصمیم‌ها (تاریخی؛ به `spec-vs-code` نگاه کنید) |
