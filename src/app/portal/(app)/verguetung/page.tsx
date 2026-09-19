import { redirect } from "next/navigation";
import { CompensationDashboard } from "@/components/portal/CompensationDashboard";
import { getCurrentUser } from "@/lib/auth";
import { getCompensationRows, isCompensationOwner } from "@/lib/compensation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vergütung & Karriere", robots: { index: false, follow: false } };

export default async function CompensationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fverguetung");

  const rows = await getCompensationRows(user);
  const serialized = rows.map((row) => ({
    ...row,
    loyaltyStartedAt: row.loyaltyStartedAt.toISOString(),
    loyaltyEligibleAt: row.loyaltyEligibleAt.toISOString(),
  }));

  return <div className="space-y-6">
    <header>
      <p className="eyebrow text-electric-deep">Karriere & Vergütung</p>
      <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Faire Entwicklung. Klare Zahlen.</h1>
      <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-steel">
        Stufenmodell, Anbieter-Provision, Storno-Rücklage, Treue-Sparplan und Teamstruktur in einer nachvollziehbaren Übersicht.
      </p>
    </header>
    <CompensationDashboard rows={serialized} isOwner={isCompensationOwner(user)} />
  </div>;
}
