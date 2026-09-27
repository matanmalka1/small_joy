import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-heebo", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "שמחות קטנות | כלי בית, אירוח ומצעים בנתניה", template: "%s | שמחות קטנות" },
  description:
    "שמחות קטנות – חנות לכלים חד־פעמיים, כלי בית ומטבח, מצעים, מוצרי אירוח ומסיבות. איסוף עצמי מנתניה ומשלוחים לכל הארץ.",
  openGraph: { type: "website", locale: "he_IL", siteName: "שמחות קטנות" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#fffbf5", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
