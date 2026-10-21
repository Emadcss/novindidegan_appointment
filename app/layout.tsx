import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

/**
 * فقط دو خانواده فونت:
 * - میخک: تمام رابط (سه وزن واقعی؛ font-bold دیگر bold مصنوعی نمی‌سازد)
 * - آقاسم: فقط برای لوگوتایپ
 */
const mikhak = localFont({
  src: [
    { path: "../fonts/Mikhak-DS2-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Mikhak-DS2-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Mikhak-DS2-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-mikhak-face",
  display: "swap",
});

const logoFont = localFont({
  src: "../fonts/AGhasem.woff2",
  variable: "--font-logo-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: "کلینیک فوق تخصصی نوین دیدگان | کیوسک نوبت دهی",
  description: "ما برای زمان شما ارزش قائلیم، به راحتی نوبت خود را دریافت نمایید",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${mikhak.variable} ${logoFont.variable}`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
