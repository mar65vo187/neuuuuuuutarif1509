import { redirect } from "next/navigation";
import { Card, formatDate } from "@/components/portal/ui";
import { SystemManager } from "@/components/portal/SystemManager";
import { WebhookManager } from "@/components/portal/WebhookManager";
import { AutomationHealthPanel } from "@/components/portal/AutomationHealthPanel";
import { getCurrentUser } from "@/lib/auth";
import { listAuditEvents, listAutomations, listCatalog } from "@/lib/enterprise";
import { isCompensationOwner } from "@/lib/compensation";
import { getAdminAutomationHealth } from "@/lib/portal-productivity";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fsystem");
  if (user.role !== "admin") redirect("/portal");
  const [catalog, automations, audit, health] = await Promise.all([listCatalog(), listAutomations(), listAuditEvents(80), getAdminAutomationHealth()]);
  const owner = isCompensationOwner(user);
  const lastSweep = audit.find(({ event }) => event.action === "operations.sweep");
  const cronReady = Boolean(process.env.CRON_SECRET);
  return <div className="space-y-6">
    <header><p className="eyebrow text-electric-deep">Administration</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">System & Integrationen</h1><p className="text-[14px] text-steel">Katalog, Automationen und revisionsfähige Aktivität.</p></header>
    <SystemManager canManageCommission={owner} providers={catalog.providers.map((p) => ({ id:p.id,name:p.name,category:p.category }))} products={catalog.products.map((p) => ({ id:p.id,providerId:p.providerId,name:p.name,category:p.category,expectedCommission: owner ? p.expectedCommission : null }))} automations={automations.map((a) => ({ id:a.id,name:a.name,eventType:a.eventType,active:a.active }))} />
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-electric-deep">Täglicher Qualitäts-Wächter</p>
          <h2 className="mt-1 text-[18px] font-extrabold">Fälligkeiten automatisch in interne Aufgaben übersetzen</h2>
          <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-steel">Prüft offene Leads ohne nächsten Schritt, fällige Kundenreviews, überfällige Opportunities und festhängende Aufträge. Der Wächter erstellt ausschließlich interne Aufgaben und verändert keine Kunden-, Auftrags- oder Provisionsdaten.</p>
        </div>
        <span className={"rounded-full border px-3 py-1.5 text-[10.5px] font-bold " + (cronReady ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200" : "border-amber-300/20 bg-amber-300/[0.07] text-amber-100")}>{cronReady ? "Cron-Schutz konfiguriert" : "CRON_SECRET fehlt"}</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-paper/60 p-3"><p className="text-[10px] font-extrabold uppercase tracking-wider text-steel">Zeitplan</p><p className="mt-1 text-[13px] font-bold">Täglich · 05:15 UTC</p></div>
        <div className="rounded-xl border border-line bg-paper/60 p-3"><p className="text-[10px] font-extrabold uppercase tracking-wider text-steel">Letzter Lauf</p><p className="mt-1 text-[13px] font-bold">{lastSweep ? formatDate(lastSweep.event.createdAt) : "Noch kein Lauf protokolliert"}</p></div>
        <div className="rounded-xl border border-line bg-paper/60 p-3"><p className="text-[10px] font-extrabold uppercase tracking-wider text-steel">Autonome Kundenaktionen</p><p className="mt-1 text-[13px] font-bold">0</p></div>
      </div>
    </Card>
    <section className="space-y-4">
      <div><p className="eyebrow text-electric-deep">Automation Health</p><h2 className="mt-1 text-[20px] font-extrabold">Prozesse & Integrationen überwachen</h2><p className="mt-1 text-[12.5px] text-steel">Fehler, Rückstau und externe Auslieferungen sichtbar machen, bevor sie im Vertrieb auffallen.</p></div>
      <AutomationHealthPanel
        rules={health.rules}
        runHealth={health.runHealth}
        runs={health.runs}
        webhooks={{ total: health.webhooks.total, active: health.webhooks.active }}
        deliveryHealth={health.deliveryHealth}
        deliveries={health.deliveries}
        outbox={health.outbox}
      />
    </section>
    <section className="space-y-4">
      <div><p className="eyebrow text-electric-deep">Integrationen</p><h2 className="mt-1 text-[20px] font-extrabold">Webhook Hub</h2><p className="mt-1 text-[12.5px] text-steel">TarifWerk-Ereignisse sicher an externe Systeme verteilen.</p></div>
      <WebhookManager endpoints={health.webhooks.endpoints.map((endpoint) => ({ id: endpoint.id, name: endpoint.name, url: endpoint.url, eventTypes: endpoint.eventTypes, active: endpoint.active }))} />
    </section>
    <Card><div className="flex items-center justify-between"><h2 className="text-[16px] font-extrabold">Audit-Log</h2><span className="text-[12px] text-steel">letzte {audit.length}</span></div>
      <ul className="mt-4 divide-y divide-line">{audit.map(({ event, actorName }) => <li key={event.id} className="grid gap-1 py-3 text-[13.5px] sm:grid-cols-[1fr_auto]"><div><p><span className="font-semibold">{event.action}</span> · {event.entityType}{event.entityId ? ` #${event.entityId}` : ""}</p><p className="text-[12px] text-steel">{actorName || "System"}</p></div><p className="text-[12px] text-steel">{formatDate(event.createdAt)}</p></li>)}</ul>
    </Card>
  </div>;
}
