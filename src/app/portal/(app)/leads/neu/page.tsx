import { redirect } from "next/navigation";
import { LeadCreateForm } from "@/components/portal/LeadCreateForm";
import { getCurrentUser } from "@/lib/auth";
import { listLeadProductOptions } from "@/lib/queries";
import { hasPermission, PORTAL_PERMISSION } from "@/lib/enterprise-access";
import { Card } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

export default async function NewLeadPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fleads%2Fneu");
  if (!await hasPermission(user, PORTAL_PERMISSION.LEAD_EDIT)) redirect("/portal/leads");
  const products = await listLeadProductOptions();
  const params = await searchParams;
  const defaultMode = params.mode === "contact" ? "contact" : "lead";
  return <div className="space-y-6">
    <header>
      <p className="eyebrow text-electric-deep">CRM · Neuaufnahme</p>
      <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">{defaultMode === "contact" ? "Kontakt anlegen" : "Lead oder Kontakt anlegen"}</h1>
      <p className="mt-2 max-w-3xl text-[14px] text-steel">Wähle zuerst, ob der Eintrag nur im Kontaktpool liegen oder direkt als bearbeitbarer Lead in die Pipeline kommen soll. Ein Kontakt kann später jederzeit bewusst zum Lead qualifiziert werden.</p>
    </header>
    <div className="max-w-4xl"><Card><LeadCreateForm products={products} defaultMode={defaultMode} /></Card></div>
  </div>;
}
