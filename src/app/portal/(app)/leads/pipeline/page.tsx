import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LayoutDashboard, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listLeads } from "@/lib/queries";
import { getLeadIntelligence } from "@/lib/lead-intelligence";
import { LeadPipelineBoard } from "@/components/portal/LeadPipelineBoard";

export const dynamic = "force-dynamic";

export default async function LeadPipelinePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fleads%2Fpipeline");

  const rows = await listLeads({ sort: "next" }, user);
  const serialized = rows.map((lead) => ({
    id: lead.id,
    name: lead.name || `Lead #${lead.id}`,
    topic: lead.topic,
    status: lead.status,
    priority: lead.priority,
    contactOutcome: lead.contactOutcome,
    nextActionAt: lead.nextActionAt?.toISOString() ?? null,
    nextActionOverdue: lead.nextActionOverdue,
    confirmedSlot: lead.confirmedSlot,
    phone: lead.phone,
    createdByName: lead.createdByName,
    existingProductNames: lead.existingProductNames,
    interestProductNames: lead.interestProductNames,
    soldProductNames: lead.soldProductNames,
    intelligence: getLeadIntelligence(lead),
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/portal/leads" className="inline-flex items-center gap-2 text-[12.5px] font-bold text-steel hover:text-ink"><ArrowLeft className="h-3.5 w-3.5" /> Zur Lead-Liste</Link>
          <p className="mt-4 eyebrow text-electric-deep">Sales Pipeline · Arbeitsmodus</p>
          <h1 className="mt-2 text-[clamp(1.7rem,3vw,2.5rem)] font-extrabold tracking-tight">Lead Pipeline Board</h1>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-steel">Alle sichtbaren Leads nach Vertriebsstufe sortiert. Kritische Wiedervorlagen und der nächste sinnvolle Schritt stehen direkt auf jeder Karte.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/portal/leads" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[12.5px] font-bold text-ink"><LayoutDashboard className="h-4 w-4" /> Listenansicht</Link>
          <Link href="/portal/leads/neu" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[12.5px] font-bold text-white hover:bg-electric"><Plus className="h-4 w-4" /> Lead anlegen</Link>
        </div>
      </header>
      <LeadPipelineBoard rows={serialized} />
    </div>
  );
}
