import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { MotionPreferences } from "@/components/ui/MotionPreferences";
import localFont from "next/font/local";
import { SITE } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import "./globals.css";

// Selbst gehostete Fonts (SIL OFL, siehe src/fonts/OFL*.txt): der Build
// braucht damit keinen Zugriff auf fonts.googleapis.com und Besucher
// laden keine Schriftarten von Drittanbietern.
const manrope = localFont({
  src: "../fonts/Manrope[wght].ttf",
  variable: "--font-manrope",
  display: "swap",
  weight: "400 800",
});

const instrument = localFont({
  src: [
    { path: "../fonts/InstrumentSerif-Regular.ttf", style: "normal" },
    { path: "../fonts/InstrumentSerif-Italic.ttf", style: "italic" },
  ],
  variable: "--font-instrument",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  ...pageMetadata("/"),
  metadataBase: new URL(SITE.url),
  title: { default: "TarifWerk | Persönliche Beratung deutschlandweit", template: "%s | TarifWerk" },
  applicationName: SITE.name,
  category: "business",
  referrer: "origin-when-cross-origin",
  authors: [{ name: SITE.founder }],
  creator: SITE.name,
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml", sizes: "any" }],
    shortcut: ["/favicon.svg"],
    apple: [{ url: "/favicon.svg", sizes: "260x260", type: "image/svg+xml" }],
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: "#060b16",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Request-time HTML rendering is required for nonce-based CSP.
  await headers();
  return (
    <html lang="de" className={`${manrope.variable} ${instrument.variable}`}>
      <body className="min-h-screen"><MotionPreferences>{children}</MotionPreferences></body>
    </html>
  );
}
