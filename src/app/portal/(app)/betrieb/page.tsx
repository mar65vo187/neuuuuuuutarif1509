import { redirect } from "next/navigation";
import { OperationsHubDashboard } from "@/components/portal/OperationsHubDashboard";
import { getCurrentUser } from "@/lib/auth";
import { getOperationsHubData } from "@/lib/operations-hub";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team & Betrieb", robots: { index: false, follow: false } };

export default async function OperationsHubPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fbetrieb");

  const data = await getOperationsHubData(user);
  return <div className="space-y-6">
    <header>
      <p className="eyebrow text-electric-deep">Operations</p>
      <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Team, Incentives & Wissen</h1>
      <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-steel">
        Teamstruktur, Schulungsfreigaben, Benefits, Incentives, Dokumente und Provider-Abgleich zentral im TarifWerk-Backoffice.
      </p>
    </header>
    <OperationsHubDashboard data={{
      ...data,
      incentives: data.incentives.map((item) => ({ ...item, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt.toISOString(), createdAt: item.createdAt.toISOString(), updatedAt: item.updatedAt.toISOString() })),
      completions: data.completions.map((item) => ({ ...item, completedAt: item.completedAt.toISOString(), expiresAt: item.expiresAt?.toISOString() ?? null })),
      benefits: data.benefits.map((item) => ({ ...item, validFrom: item.validFrom?.toISOString() ?? null, validTo: item.validTo?.toISOString() ?? null })),
      documents: data.documents.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
      documentHistory: data.documentHistory.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
      reconciliation: data.reconciliation.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
      ownerCockpit: data.ownerCockpit ? {
        ...data.ownerCockpit,
        imports: data.ownerCockpit.imports.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
      } : null,
    }} currentUserId={user.id} />
  </div>;
}
