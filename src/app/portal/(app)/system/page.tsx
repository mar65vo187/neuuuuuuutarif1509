import { redirect } from "next/navigation";
import { Card, formatDate } from "@/components/portal/ui";
import { SystemManager } from "@/components/portal/SystemManager";
import { getCurrentUser } from "@/lib/auth";
import { listAuditEvents, listAutomations, listCatalog } from "@/lib/enterprise";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fsystem");
  if (user.role !== "admin") redirect("/portal");
  const [catalog, automations, audit] = await Promise.all([listCatalog(), listAutomations(), listAuditEvents(80)]);
  return <div className="space-y-6">
    <header><p className="eyebrow text-electric-deep">Administration</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">System & Integrationen</h1><p className="text-[14px] text-steel">Katalog, Automationen und revisionsfähige Aktivität.</p></header>
    <SystemManager providers={catalog.providers.map((p) => ({ id:p.id,name:p.name,category:p.category }))} products={catalog.products.map((p) => ({ id:p.id,providerId:p.providerId,name:p.name,category:p.category,expectedCommission:p.expectedCommission }))} automations={automations.map((a) => ({ id:a.id,name:a.name,eventType:a.eventType,active:a.active }))} />
    <Card><div className="flex items-center justify-between"><h2 className="text-[16px] font-extrabold">Audit-Log</h2><span className="text-[12px] text-steel">letzte {audit.length}</span></div>
      <ul className="mt-4 divide-y divide-line">{audit.map(({ event, actorName }) => <li key={event.id} className="grid gap-1 py-3 text-[13.5px] sm:grid-cols-[1fr_auto]"><div><p><span className="font-semibold">{event.action}</span> · {event.entityType}{event.entityId ? ` #${event.entityId}` : ""}</p><p className="text-[12px] text-steel">{actorName || "System"}</p></div><p className="text-[12px] text-steel">{formatDate(event.createdAt)}</p></li>)}</ul>
    </Card>
  </div>;
}
