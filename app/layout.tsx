import type { Metadata } from "next";
import localFont from "next/font/local"
import "./globals.css";

const persianFont = localFont({
  src: "../fonts/AGhasem.woff2",
  variable: "--font-ghasem",
})
const persianFont1 = localFont({
  src: "../fonts/Yekan Boom.woff2",
  variable: "--font-boom",
})
const persianFont2 = localFont({
  src: "../fonts/A Negaar Regular.ttf",
  variable: "--font-negarregular",
})
const persianFont3 = localFont({
  src: "../fonts/A Negaar Bold.ttf",
  variable: "--font-negarbold",
})
const persianFont4 = localFont({
  src: "../fonts/Mikhak-DS2-Regular.woff2",
  variable: "--font-mikhakregular",
})
const persianFont5 = localFont({
  src: "../fonts/Mikhak-DS2-Light.woff2",
  variable: "--font-mikhaklight",
})
const persianFont6 = localFont({
  src: "../fonts/Mikhak-DS2-Medium.woff2",
  variable: "--font-mikhakmedium",
})
const persianFont7 = localFont({
  src: "../fonts/Mikhak-DS2-Bold.woff2",
  variable: "--font-mikhakbold",
})


export const metadata: Metadata = {
  title: "کلینیک فوق تخصصی نوین دیدگان | کیوسک نوبت دهی",
  description: "ما برای زمان شما ارزش قائلیم، به راحتی نوبت خود را دریافت نمایید",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fa"
      dir='rtl'
      className={`${persianFont.variable} ${persianFont1.variable} ${persianFont2.variable} ${persianFont3.variable} ${persianFont4.variable} ${persianFont5.variable} ${persianFont6.variable} ${persianFont7.variable}`}
    >
      <body className="min-h-full flex flex-col">

      {children}</body>
    </html>
  );
}
