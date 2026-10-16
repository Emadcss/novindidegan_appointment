# معماری

## لایه‌ها

```text
UI (components/)            ← فقط نمایش و لمس؛ هیچ‌وقت به data/ دسترسی مستقیم ندارد
  │  fetch
API (app/api/kiosk/*)       ← اعتبارسنجی ورودی، تبدیل خطا به پاسخ HTTP
  │
Services (lib/kiosk/*)      ← قواعد کسب‌وکار
  │
Data (lib/db/*)             ← PostgreSQL؛ فقط repositories.ts SQL دارد (data/kiosk-data.ts = داده‌ی اولیه)
```

اصل مهم: **فرانت‌اند مرجع اعتبار نیست.** حضور پزشک، اعتبار کد ملی/موبایل، لزوم سؤال جراحی، تاریخ و ساعت و شماره‌ی نوبت همه سمت سرور تعیین یا دوباره بررسی می‌شوند. کلاینت فقط داده‌ی لازم را می‌فرستد و نتیجه را نمایش می‌دهد.

## ساختار کد کیوسک

```text
components/kiosk/
  Kiosk.tsx              ← فقط ترکیب (≈۷۰ خط): reducer + hookها + KioskLayout
  KioskLayout.tsx        ← پس‌زمینه، هدر (گوشه‌ها)، نوار مراحل، لایه‌ی هشدار
  KioskStepView.tsx      ← هر step را به کامپوننت خودش وصل می‌کند (switch)
  steps/                 ← WelcomeStep، MainChoiceStep (مرحله‌هایی که کامپوننت جدا نداشتند)
  progress.ts            ← getKioskProgress(): آیتم‌ها، مرحله‌ی فعال، نمایان بودن (تابع خالص)
  hooks/
    useIdleTimeout.ts       ← بی‌فعالیتی: هشدار و ریست
    useAutoClose.ts         ← بستن خودکار صفحه‌ی نوبت
    useSubmitAppointment.ts ← ثبت نوبت + sessionRef + requestIdRef
  <مرحله‌ها>.tsx         ← SpecialtySelection، DoctorSelection، NationalIdForm، ...
lib/kiosk/
  session.ts             ← KioskState، KioskAction، kioskReducer (خالص، بدون React)
  config.ts              ← زمان‌بندی‌ها
```

اصل: **همه‌ی تصمیم‌های «از کدام صفحه به کدام صفحه» در `kioskReducer` است** و تابع خالص بودنش یعنی بدون مرورگر تست می‌شود. کامپوننت‌ها فقط `dispatch` می‌کنند؛ تایمر و شبکه در hookها هستند؛ ظاهر در `KioskLayout` و مرحله‌ها.

## ماشین حالت کیوسک (`lib/kiosk/session.ts`)

State: `step`، `flow` (`new` یا `previous`)، `specialty`، `doctor`، `nationality`، `nationalId`، `mobile`، `hasSurgeryHistory`، `ticket` (نوبت نمایش‌داده‌شده)، `previousAppointments`، `submitError`.

Actionها: `reset`، `back`، `welcomeTapped`، `startNew`، `startPrevious`، `specialtySelected`، `doctorSelected`، `nationalitySelected`، `identityEntered`، `submitStarted/Succeeded/Failed`، `previousFound`، `previousNotFound`، `previousSelected`.

نکته: `identityEntered` برای پزشک بدون سؤال جراحی step را عوض نمی‌کند؛ بلافاصله بعدش `submit` صدا زده می‌شود که `submitStarted` را dispatch می‌کند (هر دو در یک رویداد، پس batch می‌شوند).

### جریان «نوبت جدید»

```text
welcome → main-choice → new-specialty → new-doctor → new-nationality
        → national-id | mobile → [surgery-history]* → submitting
        → print-success | submit-error
```
\* فقط وقتی `doctor.requiresSurgeryHistory` باشد.

### جریان «نوبت قبلی»

```text
welcome → main-choice → previous-nationality → national-id | mobile
        → previous-lookup ┬─ یک نوبت  → print-success
                          ├─ چند نوبت → previous-select → print-success
                          └─ هیچ      → previous-not-found
```
در این جریان هیچ نوبت جدیدی ساخته نمی‌شود. نتیجه‌ی lookup (شماره، تاریخ، ساعت، نام تخصص و پزشک) مستقیم از سرور می‌آید. «بازگشت» از `previous-select` و `previous-not-found` به فرم کد ملی/موبایل می‌رود (نه به lookup، چون lookup خودکار اجرا می‌شود و دوباره همان‌جا برمی‌گشت).

### زمان‌ها و ریست

مقادیر در `lib/kiosk/config.ts` هستند.

| مورد | ثابت | مقدار | رفتار |
|---|---|---|---|
| هشدار بی‌فعالیتی | `INACTIVITY_TIMEOUT_MS − IDLE_WARNING_BEFORE_MS` | ۶۰ ثانیه | پنجره‌ی «هنوز اینجا هستید؟» با «ادامه می‌دهم» و «انصراف و پاک کردن اطلاعات» |
| ریست خودکار | `INACTIVITY_TIMEOUT_MS` | ۹۰ ثانیه | `reset()` و بازگشت به welcome |
| صفحه‌ی نوبت | `RESULT_AUTO_CLOSE_MS` | ۵ ثانیه | بسته‌شدن خودکار، بدون دکمه‌ی «پایان» |
| همگام‌سازی ساعت | `SERVER_TIME_RESYNC_MS` | ۶۰ ثانیه | `lib/time/constants.ts` |

فعالیت یعنی `pointerdown`، `touchstart` یا `keydown`. وقتی پنجره‌ی هشدار باز است فقط دکمه‌هایش جلسه را ادامه می‌دهند. تایمر با هر تغییر `step` از اول شروع می‌شود.

**تنها راه پاک کردن جلسه `reset()` در `Kiosk.tsx` است:** هم `invalidate()` (ثبت نوبت)، هم بستن هشدار، هم `dispatch(reset)`. انصراف، تایمر بی‌فعالیتی و بستن خودکار همه از همین می‌گذرند.

### محافظ‌های مهم (`useSubmitAppointment`)

- **`sessionRef`:** با هر ریست زیاد می‌شود. پاسخ دیرهنگام سرور برای جلسه‌ی قبلی نادیده گرفته می‌شود تا نوبت یک بیمار روی صفحه‌ی بیمار بعدی نیاید.
- **`requestIdRef`:** شناسه‌ی یکتای درخواست ثبت. «تلاش دوباره» همان را می‌فرستد و سرور نوبت قبلی را برمی‌گرداند (ثبت تکراری ساخته نمی‌شود). با ریست پاک می‌شود. به‌خاطر `crypto.randomUUID` که فقط روی HTTPS/localhost هست، جایگزین ساده دارد (`createRequestId`).

## مدیریت زمان

- همه‌ی تصمیم‌های سرور با `getServerNow()` و **منطقه‌ی `Asia/Tehran`** گرفته می‌شود (`lib/time/tehran-time.ts`). تاریخ و ساعت نوبت هرگز از کلاینت نمی‌آید.
- کلاینت ساعت خود را از `/api/kiosk/server-time` همگام می‌کند (`lib/time/client-clock.ts`) و ساعت دستگاه را مرجع نمی‌گیرد. اگر همگام‌سازی شکست بخورد، در هدر «ارتباط با سرور برقرار نیست» نشان داده می‌شود.
- روز هفته: شنبه = ۰ تا جمعه = ۶.

## رابط کاربری

توکن‌ها در `app/globals.css`؛ کامپوننت‌ها و قواعد در [`docs/ui-ux/01-design-system.md`](ui-ux/01-design-system.md). حالت صفحه‌ی کم‌ارتفاع با `@custom-variant short` (فعلاً `max-height: 900px`).

## داده

دیتابیس PostgreSQL است؛ ساختار، قفل‌ها، هویت رمزنگاری‌شده و راه‌اندازی در [`database.md`](database.md). همه‌ی توابع سرویس‌ها `async` هستند. ثبت نوبت یک تراکنش یکپارچه است (بررسی‌ها، بیمار، شمارنده، نوبت) و یا کامل انجام می‌شود یا هیچ‌چیز ثبت نمی‌شود؛ تراکنش با `AsyncLocalStorage` به کوئری‌های داخلش منتقل می‌شود، پس مخزن‌ها (`repositories.ts`) نیازی به پارامتر اتصال ندارند. استقرار، سخت‌افزار و امنیت: [`deployment.md`](deployment.md).
