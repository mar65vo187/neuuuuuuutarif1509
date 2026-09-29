import AdministrationPage from "../verwaltung/page";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Mitarbeiter",
  robots: { index: false, follow: false },
};

export default function MitarbeiterPage() {
  return <AdministrationPage />;
}
