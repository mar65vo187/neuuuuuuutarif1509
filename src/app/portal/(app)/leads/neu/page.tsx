import { redirect } from "next/navigation";
import { LeadCreateForm } from "@/components/portal/LeadCreateForm";
import { getCurrentUser } from "@/lib/auth";
import { listLeadProductOptions } from "@/lib/queries";
import { hasPermission, PORTAL_PERMISSION } from "@/lib/enterprise-access";
import { Card } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fleads%2Fneu");
  if (!await hasPermission(user, PORTAL_PERMISSION.LEAD_EDIT)) redirect("/portal/leads");
  const products = await listLeadProductOptions();
  return <div className="space-y-6"><header><p className="eyebrow text-electric-deep">Lead CRM · Neuaufnahme</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Lead anlegen</h1><p className="mt-2 text-[14px] text-steel">Kontakt direkt sauber einordnen: Status, Priorität, Wiedervorlage und Produktpotenzial können sofort mit erfasst werden.</p></header><div className="max-w-4xl"><Card><LeadCreateForm products={products} /></Card></div></div>;
}