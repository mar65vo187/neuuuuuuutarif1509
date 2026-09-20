import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Plus } from "lucide-react";
import { Card } from "@/components/portal/ui";
import { LeadBulkList } from "@/components/portal/LeadBulkList";
import { SavedViewsBar } from "@/components/portal/SavedViewsBar";
import { LEAD_STATUS_LABELS, LEAD_TYPE_LABELS } from "@/lib/content";
import { listLeads } from "@/lib/queries";
import { listSavedViews } from "@/lib/portal-productivity";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const STATUSES = Object.keys(LEAD_STATUS_LABELS);
const TYPES = Object.keys(LEAD_TYPE_LABELS);

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string; type?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fleads");
  const { status, type } = await searchParams;
  const s = status && STATUSES.includes(status) ? status : undefined;
  const t = type && TYPES.includes(type) ? type : undefined;
  const [rows, savedViews, assignees] = await Promise.all([
    listLeads({ status: s, type: t }, user),
    listSavedViews(user, "leads"),
    user.role === "admin"
      ? db.select({ id: employees.id, name: employees.name }).from(employees).where(eq(employees.active, true)).orderBy(employees.name)
      : Promise.resolve([]),
  ]);

  const link = (next: { status?: string; type?: string }) => {
    const p = new URLSearchParams();
    const ns = "status" in next ? next.status : s;
    const nt = "type" in next ? next.type : t;
    if (ns) p.set("status", ns);
    if (nt) p.set("type", nt);
    return `/portal/leads${p.toString() ? `?${p}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
        <p className="eyebrow text-electric-deep">Anfragen & Termine</p>
        <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Lead-Verwaltung</h1>
        </div>
        <Link href="/portal/leads/neu" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white hover:bg-electric"><Plus className="h-4 w-4" /> Lead anlegen</Link>
      </header>

      <div className="flex flex-col gap-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <Link href={link({ status: undefined })} className={`chip h-9 shrink-0 px-3.5 ${!s ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-700"}`}>Alle Status</Link>
          {STATUSES.map((k) => (
            <Link key={k} href={link({ status: k })} className={`chip h-9 shrink-0 px-3.5 ${s === k ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-700"}`}>{LEAD_STATUS_LABELS[k]}</Link>
          ))}
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <Link href={link({ type: undefined })} className={`chip h-9 shrink-0 px-3.5 ${!t ? "border-electric bg-electric text-white" : "border-line bg-white text-ink-700"}`}>Alle Arten</Link>
          {TYPES.map((k) => (
            <Link key={k} href={link({ type: k })} className={`chip h-9 shrink-0 px-3.5 ${t === k ? "border-electric bg-electric text-white" : "border-line bg-white text-ink-700"}`}>{LEAD_TYPE_LABELS[k]}</Link>
          ))}
        </div>
      </div>

      <SavedViewsBar area="leads" basePath="/portal/leads" views={savedViews} currentFilters={{ ...(s ? { status: s } : {}), ...(t ? { type: t } : {}) }} />

      <Card className="p-0 sm:p-0">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-[14.5px] text-steel">Keine Anfragen für diese Auswahl.</p>
        ) : (
          <LeadBulkList assignees={assignees} rows={rows.map((lead) => ({
            id: lead.id,
            name: lead.name,
            topic: lead.topic,
            region: lead.region,
            preferredChannel: lead.preferredChannel,
            preferredTime: lead.preferredTime,
            createdAt: lead.createdAt.toISOString(),
            advisorName: lead.advisorName,
            assignedName: lead.assignedName,
            type: lead.type,
            status: lead.status,
          }))} />
        )}
      </Card>
    </div>
  );
}
