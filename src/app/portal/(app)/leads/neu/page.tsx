import { redirect } from "next/navigation";
import { LeadCreateForm } from "@/components/portal/LeadCreateForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fleads%2Fneu");
  return <div className="space-y-6"><header><p className="eyebrow text-electric-deep">Anfragen & Termine</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Lead anlegen</h1><p className="mt-2 text-[14px] text-steel">Lege eine telefonisch oder persönlich erhaltene Anfrage im Portal an.</p></header><div className="max-w-3xl rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7"><LeadCreateForm /></div></div>;
}