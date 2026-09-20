import { redirect } from "next/navigation";
import { LeadCreateForm } from "@/components/portal/LeadCreateForm";
import { getCurrentUser } from "@/lib/auth";
import { listLeadProductOptions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fleads%2Fneu");
  const products = await listLeadProductOptions();
  return <div className="space-y-6"><header><p className="eyebrow text-electric-deep">Lead CRM · Neuaufnahme</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Lead anlegen</h1><p className="mt-2 text-[14px] text-steel">Kontakt direkt sauber einordnen: Status, Priorität, Wiedervorlage und Produktpotenzial können sofort mit erfasst werden.</p></header><div className="max-w-4xl rounded-[24px] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(239,244,251,0.92))] p-5 shadow-[0_22px_55px_-34px_rgba(6,11,22,0.52)] ring-1 ring-ink/[0.035] sm:p-7"><LeadCreateForm products={products} /></div></div>;
}