import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Mitarbeiter",
  robots: { index: false, follow: false },
};

export default function MitarbeiterPage() {
  redirect("/portal/verwaltung");
}
