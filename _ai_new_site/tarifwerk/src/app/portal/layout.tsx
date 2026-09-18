import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Mitarbeiterportal",
  description: "Geschützter Zugang zum Mitarbeiterportal von TarifWerk.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/portal/login" },
};

export default function PortalLayout({ children }: { children: ReactNode }) {
  return children;
}
