import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, BriefcaseBusiness, CheckCircle2, Clock3, ContactRound, History, Mail, Phone, ShieldCheck, UserRoundCheck } from "lucide-react";
import { Card } from "@/components/portal/ui";
import { ServiceCaseManager } from "@/components/portal/ServiceCaseManager";
import { getCurrentUser } from "@/lib/auth";
import { listServiceAssignableEmployees, permissionSnapshot, PORTAL_PERMISSION } from "@/lib/enterprise-access";
import {
  getServiceCase,
  SERVICE_CASE_PRIORITY_LABELS,
  SERVICE_CASE_STATUS_LABELS,
  SERVICE_CASE_TYPE_LABELS,
  type ServiceCasePriority,
  type ServiceCaseStatus,
  type ServiceCaseType,
} from "@/lib/service-cases";

export const dynamic = "force-dynamic";
const dateTime = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

const EVENT_LABELS: Record<string, string> = {
  created: "Fall angelegt",
  status_changed: "Status geändert",
  priority_changed: "Priorität geändert",
  assigned: "Zuständigkeit geändert",
  resolution: "Lösung dokumentiert",
  note: "Interne Notiz",
};

export default async function ServiceCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const raw = (await params).id;
  const id = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id < 1) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/portal/login?next=${encodeURIComponent(`/portal/service/${id}`)}`);
  const capabilities = await permissionSnapshot(user, [
    PORTAL_PERMISSION.SERVICE_READ,
    PORTAL_PERMISSION.SERVICE_EDIT,
    PORTAL_PERMISSION.SERVICE_ASSIGN,
  ] as const);
  const canEdit = capabilities[PORTAL_PERMISSION.SERVICE_EDIT] || user.role === "admin";
  const canAssign = capabilities[PORTAL_PERMISSION.SERVICE_ASSIGN] || user.role === "admin";
  if (!capabilities[PORTAL_PERMISSION.SERVICE_READ] && !canEdit && !canAssign) redirect("/portal");

  const [data, assignees] = await Promise.all([
    getServiceCase(id, user, canAssign),
    canAssign ? listServiceAssignableEmployees() : Promise.resolve([]),
  ]);
  if (!data) notFound();
  const item = data.serviceCase;
  const canEditThisCase = canEdit && (canAssign || user.role === "admin" || item.ownerEmployeeId === user.id);
  const overdue = data.overdue;

  return <div className="space-y-6">
    <Link href="/portal/service" className="inline-flex items-center gap-2 text-[13px] font-bold text-steel hover:text-ink"><ArrowLeft className="h-4 w-4" /> Zurück zu Service</Link>

    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-ink px-3 py-1.5 text-[10.5px] font-extrabold text-white">{item.caseNumber}</span>
          <span className="rounded-full border border-line bg-paper px-3 py-1.5 text-[10.5px] font-bold text-steel">{SERVICE_CASE_TYPE_LABELS[item.type as ServiceCaseType] ?? item.type}</span>
          <span className={"rounded-full px-3 py-1.5 text-[10.5px] font-extrabold " + (item.priority === "critical" ? "bg-red-100 text-red-800" : item.priority === "high" ? "bg-amber-100 text-amber-800" : "bg-paper text-steel")}>{SERVICE_CASE_PRIORITY_LABELS[item.priority as ServiceCasePriority] ?? item.priority}</span>
        </div>
        <h1 className="mt-3 max-w-4xl text-[clamp(1.7rem,3vw,2.5rem)] font-extrabold tracking-tight">{item.subject}</h1>
        <p className="mt-2 text-[13px] text-steel">Angelegt {dateTime.format(item.createdAt)} · letzte Aktivität {dateTime.format(item.lastActivityAt)}</p>
      </div>
      <span className={"inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-[12px] font-extrabold " + (overdue ? "border-red-200 bg-red-50 text-red-800" : item.status === "resolved" || item.status === "closed" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-electric/20 bg-electric/[0.05] text-electric-deep")}>
        {overdue ? <AlertTriangle className="h-4 w-4" /> : item.status === "resolved" || item.status === "closed" ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
        {SERVICE_CASE_STATUS_LABELS[item.status as ServiceCaseStatus] ?? item.status}
      </span>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-steel">SLA-Ziel</p><p className={"mt-2 text-[15px] font-extrabold " + (overdue ? "text-red-700" : "")}>{dateTime.format(item.dueAt)}</p><p className="mt-1 text-[11.5px] text-steel">{overdue ? "Überfällig · priorisiert bearbeiten" : "zentrale Operations-Policy"}</p></Card>
      <Card><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-steel">Zuständig</p><p className="mt-2 text-[15px] font-extrabold">{data.ownerName || "Nicht zugewiesen"}</p><p className="mt-1 text-[11.5px] text-steel">Owner des Servicefalls</p></Card>
      <Card><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-steel">Erste Reaktion</p><p className="mt-2 text-[15px] font-extrabold">{item.firstResponseAt ? dateTime.format(item.firstResponseAt) : "Noch offen"}</p><p className="mt-1 text-[11.5px] text-steel">erste dokumentierte Bearbeitung</p></Card>
      <Card><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-steel">Lösung</p><p className="mt-2 text-[15px] font-extrabold">{item.resolvedAt ? dateTime.format(item.resolvedAt) : "Noch nicht gelöst"}</p><p className="mt-1 text-[11.5px] text-steel">{item.closedAt ? "Fall geschlossen" : "laufender Serviceprozess"}</p></Card>
    </section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.65fr)]">
      <div className="space-y-4">
        <Card>
          <div className="flex items-center gap-2"><ContactRound className="h-4 w-4 text-electric-deep" /><h2 className="text-[15px] font-extrabold">Kunden- & Auftragsbezug</h2></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link href={`/portal/kunden/${item.customerId}`} className="rounded-2xl border border-line bg-paper p-4 transition hover:border-electric/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-steel">Kunde</p><p className="mt-1 text-[14px] font-extrabold">{data.customerName}</p><p className="mt-1 text-[11.5px] text-steel">{data.customerNumber}</p>
            </Link>
            {item.orderId ? <Link href={`/portal/auftraege/${item.orderId}`} className="rounded-2xl border border-line bg-paper p-4 transition hover:border-electric/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-steel">Auftrag</p><p className="mt-1 text-[14px] font-extrabold">{data.orderExternalId || `Auftrag #${item.orderId}`}</p><p className="mt-1 text-[11.5px] text-steel">{data.orderStatus || "Status nicht verfügbar"}</p>
            </Link> : <div className="rounded-2xl border border-dashed border-line bg-paper/50 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-steel">Auftrag</p><p className="mt-1 text-[13px] font-bold text-steel">Kein konkreter Auftrag verknüpft</p></div>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.customerPhone && <a href={`tel:${data.customerPhone}`} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-line px-3 text-[12px] font-bold hover:border-electric/30"><Phone className="h-3.5 w-3.5" /> Anrufen</a>}
            {data.customerEmail && <a href={`mailto:${data.customerEmail}`} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-line px-3 text-[12px] font-bold hover:border-electric/30"><Mail className="h-3.5 w-3.5" /> E-Mail öffnen</a>}
          </div>
        </Card>

        <Card>
          <h2 className="text-[15px] font-extrabold">Dokumentierter Sachverhalt</h2>
          <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-steel">{item.description || "Kein zusätzlicher Sachverhalt dokumentiert."}</p>
          {item.resolution && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-emerald-800"><ShieldCheck className="h-4 w-4" /> Dokumentierte Lösung</p><p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-emerald-950">{item.resolution}</p></div>}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><History className="h-4 w-4 text-electric-deep" /><h2 className="text-[15px] font-extrabold">Fallhistorie</h2></div><span className="text-[11px] font-bold text-steel">{data.events.length} Ereignisse</span></div>
          <ol className="mt-4 space-y-3">
            {data.events.map(({ event, actorName }) => <li key={event.id} className="relative rounded-2xl border border-line bg-paper p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[12.5px] font-extrabold">{EVENT_LABELS[event.type] ?? event.type}</p><p className="mt-0.5 text-[11px] text-steel">{actorName || "System"}</p></div><time className="text-[10.5px] font-semibold text-steel">{dateTime.format(event.createdAt)}</time></div>
              {(event.fromValue || event.toValue) && <p className="mt-2 text-[11.5px] font-bold text-ink">{event.fromValue || "—"} → {event.toValue || "—"}</p>}
              {event.note && <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed text-steel">{event.note}</p>}
            </li>)}
          </ol>
        </Card>
      </div>

      <div className="space-y-4">
        {canEditThisCase ? <ServiceCaseManager id={id} status={item.status} priority={item.priority} ownerEmployeeId={item.ownerEmployeeId} resolution={item.resolution} canAssign={canAssign} assignees={assignees} /> : <Card><div className="flex items-center gap-2"><UserRoundCheck className="h-4 w-4 text-electric-deep" /><h2 className="text-[15px] font-extrabold">Nur Lesen</h2></div><p className="mt-2 text-[12.5px] text-steel">Du kannst diesen Servicefall einsehen, aber nicht verändern.</p></Card>}
        <Card>
          <div className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-electric-deep" /><h2 className="text-[15px] font-extrabold">Prozessschutz</h2></div>
          <p className="mt-2 text-[12px] leading-relaxed text-steel">Serviceaktionen verändern keine Provision, keinen Vertragsstatus und versenden keine externe Nachricht automatisch. Alle Änderungen bleiben im Audit nachvollziehbar.</p>
        </Card>
      </div>
    </section>
  </div>;
}
