import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/cairo";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "حصين AI | ذكاء يحميك ويلهمك",
  description: "مساعدك الذكي للأمن السيبراني، الإجابة عن أسئلتك، وتوليد الصور من خيالك.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
