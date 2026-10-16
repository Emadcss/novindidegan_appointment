# قرارداد API

پایه: `/api/kiosk`. همه‌ی پاسخ‌ها JSON‌اند. اطلاعات هویتی (کد ملی، موبایل) **فقط در بدنه‌ی POST** می‌آیند، نه در URL.

## قالب پاسخ

```jsonc
// موفق
{ "success": true, "data": { ... } }

// ناموفق
{ "success": false, "code": "VALIDATION", "message": "کد ملی معتبر نیست" }
```

`message` فارسی و قابل نمایش به بیمار است (UI پس از آن راهنمای «دوباره تلاش کنید یا به پذیرش مراجعه کنید» را اضافه می‌کند).

### کدهای خطا

| code | HTTP | معنا |
|---|---|---|
| `VALIDATION` | 400 | ورودی نامعتبر یا ناقص (کد ملی، موبایل، ملیت، شناسه، پاسخ سابقه‌ی جراحی) |
| `NOT_FOUND` | 404 | تخصص یا پزشک معتبر نیست |
| `OUT_OF_SCHEDULE` | 409 | پزشک امروز برنامه ندارد یا الان خارج از ساعت حضور است |
| `DUPLICATE` | 409 | بیمار امروز برای همین پزشک نوبت فعال دارد |
| `LIMIT` | 409 | بیمار امروز به سقف تعداد نوبت فعال رسیده است (پیش‌فرض ۳) |
| `INTERNAL` | 500 | خطای ناشناخته؛ پیام داخلی به کلاینت نمی‌رسد و فقط لاگ می‌شود |

## `GET /specialties`

تخصص‌های فعالی که **حداقل یک پزشک حاضر** دارند، مرتب بر اساس `sortOrder`.

```jsonc
{ "success": true, "data": [
  { "id": 1, "name": "…", "slug": "…", "icon": "eye", "isActive": true,
    "sortOrder": 1, "availableDoctorCount": 2 }
] }
```

## `GET /doctors?specialtyId=<n>`

پزشکان فعال و حاضر (همین لحظه) آن تخصص. `specialtyId` الزامی و عدد صحیح مثبت است (`400` در غیر این صورت).

## `GET /server-time`

```json
{ "success": true, "data": { "serverTime": "2026-10-13T08:30:00.000Z", "timezone": "Asia/Tehran" } }
```

## `POST /appointments`

ثبت نوبت جدید.

```jsonc
{
  "specialtyId": 1,
  "doctorId": 1,
  "nationality": "iranian",          // "iranian" | "foreign" (الزامی)
  "nationalId": "0123456789",        // برای iranian؛ ارقام فارسی/عربی نرمال می‌شوند
  "mobile": null,                    // برای foreign؛ ۱۱ رقم و شروع با 09
  "hasSurgeryHistory": true,         // الزامی اگر پزشک requiresSurgeryHistory دارد
  "requestId": "…"                   // اختیاری ولی توصیه‌شده؛ برای جلوگیری از ثبت تکراری
}
```

فقط مشخصه‌ی متناسب با ملیت خوانده می‌شود (فیلد دیگر نادیده گرفته می‌شود).

```jsonc
// 200
{ "success": true, "data": {
  "appointmentId": 12, "appointmentNumber": 3,
  "appointmentDate": "2026-10-13", "appointmentTime": "11:45" } }
```

**Idempotency:** با `requestId` یکسان، سرور همان نوبت قبلی را برمی‌گرداند و شماره‌ی تازه نمی‌سازد. این مخصوص «تلاش دوباره» بعد از گم شدن پاسخ است.

## `POST /appointments/lookup`

همه‌ی **نوبت‌های فعال امروز** بیمار، جدیدترین اول.

```jsonc
// درخواست
{ "nationality": "iranian", "nationalId": "0123456789" }   // یا { "nationality": "foreign", "mobile": "09…" }

// پاسخ: چند نوبت (یا یکی)
{ "success": true, "data": {
  "found": true,
  "appointments": [
    { "appointmentId": 12, "appointmentNumber": 3,
      "appointmentDate": "2026-10-13", "appointmentTime": "11:45",
      "specialty": { … }, "doctor": { … }, "hasSurgeryHistory": false },
    { "appointmentId": 9, … }
  ] } }

// پاسخ: پیدا نشد (خطا نیست)
{ "success": true, "data": { "found": false, "appointments": [] } }
```

## `POST /appointments` (خطاهای مرتبط با چند نوبت)

| وضعیت | code |
|---|---|
| همان پزشک نوبت فعال دارد | `DUPLICATE` |
| به سقف نوبت‌های امروز رسیده | `LIMIT` |

## بدهی‌های API

- هنوز احراز هویت، rate-limit یا محدودیت دستگاه (کیوسک) وجود ندارد؛ هر دستگاه در شبکه می‌تواند POST بزند.
