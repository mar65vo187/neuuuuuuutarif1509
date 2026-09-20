import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { MotionPreferences } from "@/components/ui/MotionPreferences";
import { Instrument_Serif, Manrope } from "next/font/google";
import { SITE } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
  weight: "400",
  style: ["normal", "italic"],
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
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml", sizes: "any" }] },
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
