import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, CircleDot, Clock3, ContactRound, FileCheck2, ListTodo } from "lucide-react";
import { Card, formatDate } from "@/components/portal/ui";
import { OrderActions } from "@/components/portal/OrderActions";
import { ProviderCommissionAction } from "@/components/portal/ProviderCommissionAction";
import { getCurrentUser } from "@/lib/auth";
import { getOrder } from "@/lib/enterprise";
import { isCompensationOwner } from "@/lib/compensation";
import { hasPermission, PORTAL_PERMISSION } from "@/lib/enterprise-access";

export const dynamic = "force-dynamic";

const ORDER_FLOW = [
  "draft",
  "documents_missing",
  "ready_to_submit",
  "submitted",
  "provider_review",
  "accepted",
  "activation_pending",
  "active",
] as const;

const ORDER_FLOW_LABELS: Record<string, string> = {
  draft: "Entwurf",
  documents_missing: "Unterlagen",
  ready_to_submit: "Versandbereit",
  submitted: "Eingereicht",
  provider_review: "Provider-Prüfung",
  accepted: "Angenommen",
  activation_pending: "Aktivierung",
  active: "Aktiv",
};

const NEXT_ACTION: Record<string, { title: string; text: string }> = {
  draft: { title: "Unterlagen und Produktdaten prüfen", text: "Prüfen, ob Kundendaten, Produkt und alle benötigten Angaben vollständig sind." },
  documents_missing: { title: "Fehlende Unterlagen anfordern", text: "Kundenkontakt priorisieren und fehlende Dokumente sauber nachfassen." },
  ready_to_submit: { title: "Auftrag einreichen", text: "Providerdaten kontrollieren und den Vorgang in die Einreichung überführen." },
  submitted: { title: "Providerstatus beobachten", text: "Externe Auftrags-ID und Rückmeldungen aktuell halten." },
  provider_review: { title: "Provider-Rückmeldung verfolgen", text: "Offene Rückfragen oder Nachforderungen direkt dokumentieren und bearbeiten." },
  accepted: { title: "Aktivierung vorbereiten", text: "Termin, Schaltung oder Umsetzung mit Kunde und Provider koordinieren." },
  activation_pending: { title: "Aktivierung bestätigen", text: "Prüfen, ob die Leistung tatsächlich aktiv ist, und den Auftrag abschließen." },
  active: { title: "Kundenbeziehung weiterentwickeln", text: "Auftrag ist aktiv. Folgepotenzial, Empfehlungen und weitere Bedarfe in der Kundenakte prüfen." },
  rejected: { title: "Ablehnung sauber auswerten", text: "Ablehnungsgrund dokumentieren und prüfen, ob eine passende Alternative möglich ist." },
  cancelled: { title: "Storno dokumentiert", text: "Grund und Auswirkungen prüfen. Falls nötig einen neuen, korrigierten Auftrag anlegen." },
  storno: { title: "Rückbelastung prüfen", text: "Storno-Grund, Provisionswirkung und mögliche Folgeaktion nachvollziehen." },
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const raw = (await params).id;
  const id = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id < 1) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/portal/login?next=${encodeURIComponent(`/portal/auftraege/${id}`)}`);
  const data = await getOrder(id, user);
  if (!data) notFound();
  const canEdit = await hasPermission(user, PORTAL_PERMISSION.ORDER_EDIT);
  const customerName = data.customer.companyName || [data.customer.firstName, data.customer.lastName].filter(Boolean).join(" ") || "Ohne Name";
  const owner = isCompensationOwner(user);
  const orderFacts: Array<[string, string | null]> = [
    ["Status", data.order.status],
    ["Providerstatus", data.order.providerStatus],
    ["Externe ID", data.order.externalOrderId],
    ["Berater", data.advisorName],
    ["Kundennummer", data.customer.customerNumber],
  ];
  if (owner) orderFacts.splice(4, 0, ["Provider-Provision", data.order.expectedCommission ? Number(data.order.expectedCommission).toLocaleString("de-DE",{style:"currency",currency:"EUR"}) : null]);
  const saleCommission = data.commissions.find((event) => event.type === "sale");
  const flowIndex = ORDER_FLOW.indexOf(data.order.status as (typeof ORDER_FLOW)[number]);
  const nextAction = NEXT_ACTION[data.order.status] ?? { title: "Vorgang prüfen", text: "Status und nächste Aktion kontrollieren." };
  const openTasks = data.tasks.filter((task) => task.status === "open" || task.status === "in_progress");
  const abnormalStatus = ["rejected", "cancelled", "storno"].includes(data.order.status);

  return <div className="space-y-6">
    <Link href="/portal/auftraege" className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-steel hover:text-ink"><ArrowLeft className="h-4 w-4" /> Zurück zu Aufträgen</Link>
    <header className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
      <div><p className="eyebrow text-electric-deep">{data.order.orderNumber}</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">{customerName}</h1><p className="mt-1 text-[14px] text-steel">{data.providerName} · {data.productName || "Ohne Produkt"} · erstellt {formatDate(data.order.createdAt)}</p></div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/portal/kunden/${data.customer.id}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[12.5px] font-bold hover:border-electric/30 hover:text-electric-deep"><ContactRound className="h-4 w-4" /> Kundenakte</Link>
      </div>
    </header>

    <section className="rounded-[22px] border border-line bg-white p-4 shadow-soft sm:p-5" aria-label="Auftragsfortschritt">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="eyebrow text-electric-deep">Auftragsreise</p><h2 className="mt-1 text-[17px] font-extrabold">Status und nächster Schritt</h2></div>
        <span className={"chip " + (abnormalStatus ? "border-red-200 bg-red-50 text-red-700" : data.order.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-electric/20 bg-electric/[0.07] text-electric-deep")}>{ORDER_FLOW_LABELS[data.order.status] ?? data.order.status}</span>
      </div>
      {!abnormalStatus && (
        <ol className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {ORDER_FLOW.map((status, index) => {
            const done = flowIndex >= index && flowIndex >= 0;
            const current = data.order.status === status;
            return <li key={status} className="min-w-0">
              <div className={"h-1.5 rounded-full " + (done ? "bg-electric" : "bg-paper")} />
              <div className="mt-2 flex items-start gap-1.5">
                {done ? <CheckCircle2 className={"mt-0.5 h-3.5 w-3.5 shrink-0 " + (current ? "text-electric-deep" : "text-emerald-600")} /> : <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-steel/40" />}
                <span className={"text-[9.5px] font-bold leading-tight " + (current ? "text-ink" : "text-steel")}>{ORDER_FLOW_LABELS[status]}</span>
              </div>
            </li>;
          })}
        </ol>
      )}
      <div className={"mt-5 rounded-2xl border p-4 " + (abnormalStatus ? "border-red-200 bg-red-50" : data.order.status === "active" ? "border-emerald-200 bg-emerald-50" : "border-electric/15 bg-electric/[0.05]")}>
        <div className="flex items-start gap-3">
          <span className={"grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white " + (abnormalStatus ? "text-red-700" : data.order.status === "active" ? "text-emerald-700" : "text-electric-deep")}>{abnormalStatus ? <AlertTriangle className="h-4 w-4" /> : data.order.status === "active" ? <CheckCircle2 className="h-4 w-4" /> : <FileCheck2 className="h-4 w-4" />}</span>
          <div className="min-w-0 flex-1"><p className="text-[13.5px] font-extrabold">{nextAction.title}</p><p className="mt-1 text-[12px] leading-relaxed text-steel">{nextAction.text}</p></div>
          {data.order.status === "active" && <Link href={`/portal/kunden/${data.customer.id}`} className="hidden shrink-0 items-center gap-1.5 text-[11.5px] font-bold text-electric-deep hover:underline sm:inline-flex">Kunde weiterentwickeln <ArrowRight className="h-3.5 w-3.5" /></Link>}
        </div>
      </div>
    </section>
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <Card><h2 className="text-[16px] font-extrabold">Auftragsdaten</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {orderFacts.map(([key,value]) => <div key={key}><dt className="text-[11.5px] font-semibold uppercase tracking-wider text-steel">{key}</dt><dd className="mt-0.5 font-medium">{value || "–"}</dd></div>)}
        </dl></Card>
        <Card><h2 className="text-[16px] font-extrabold">Statusverlauf</h2><ol className="mt-4 space-y-3">{data.history.map((item) => <li key={item.id} className="rounded-xl bg-paper p-3 text-[14px]"><p className="font-semibold">{item.fromStatus ? `${item.fromStatus} → ${item.toStatus}` : item.toStatus}</p><p className="text-[12px] text-steel">{formatDate(item.createdAt)}{item.note ? ` · ${item.note}` : ""}</p></li>)}</ol></Card>
        <Card><h2 className="text-[16px] font-extrabold">Provisionen / Storno</h2>{owner ? (data.commissions.length === 0 ? <p className="mt-3 text-[14px] text-steel">Keine Provisionsbuchungen.</p> :
          <ul className="mt-3 divide-y divide-line">{data.commissions.map((event) => <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[14px]"><div><p className="font-semibold">{event.type} · {event.status}</p><p className="text-[12px] text-steel">{formatDate(event.createdAt)}</p></div><div className="text-right"><p>Erwartet: {Number(event.expectedAmount ?? 0).toLocaleString("de-DE",{style:"currency",currency:"EUR"})}</p><p className="text-[12px] text-steel">Bestätigt: {Number(event.confirmedAmount ?? 0).toLocaleString("de-DE",{style:"currency",currency:"EUR"})}</p>{event.paidAmount && <p className="text-[12px] font-semibold text-emerald-700">Bezahlt: {Number(event.paidAmount).toLocaleString("de-DE",{style:"currency",currency:"EUR"})}</p>}</div></li>)}</ul>) : <p className="mt-3 text-[14px] text-steel">Ihre persönlichen Vergütungswerte finden Sie unter <Link href="/portal/verguetung" className="font-semibold text-electric-deep hover:underline">Vergütung & Karriere</Link>.</p>}
          {owner && saleCommission && <ProviderCommissionAction
            eventId={saleCommission.id}
            defaultAmount={Number(saleCommission.paidAmount ?? saleCommission.confirmedAmount ?? saleCommission.expectedAmount ?? 0)}
            providerReference={saleCommission.providerReference}
            alreadyPaid={saleCommission.status === "paid" || Boolean(saleCommission.paidAmount)}
          />}
        </Card>
      </div>
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ListTodo className="h-4 w-4 text-electric-deep" /><h2 className="text-[16px] font-extrabold">Offene Arbeit</h2></div><span className="text-[12px] font-extrabold text-steel">{openTasks.length}</span></div>
          {openTasks.length ? <ul className="mt-4 space-y-2">{openTasks.slice(0, 6).map((task) => <li key={task.id} className="rounded-xl border border-line bg-paper/70 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-[12.5px] font-bold">{task.title}</p><p className="mt-1 text-[11px] text-steel">{task.dueAt ? "Fällig " + formatDate(task.dueAt) : "Ohne Fälligkeit"} · {task.priority}</p></div><Clock3 className="h-3.5 w-3.5 shrink-0 text-electric-deep" /></div></li>)}</ul> : <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-[12px] text-emerald-800">Keine offene Aufgabe zu diesem Auftrag.</div>}
          <Link href="/portal/aufgaben" className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-electric-deep hover:underline">Aufgaben öffnen <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Card>
        <Card><h2 className="text-[16px] font-extrabold">{canEdit ? "Auftrag bearbeiten" : "Zugriff"}</h2><p className="mt-1 text-[12px] text-steel">{canEdit ? "Status und Providerdaten direkt am Vorgang pflegen." : "Diese Rolle darf den Auftrag ansehen, aber nicht verändern."}</p>{canEdit && <div className="mt-4"><OrderActions orderId={id} status={data.order.status} providerStatus={data.order.providerStatus} externalOrderId={data.order.externalOrderId} /></div>}</Card>
      </div>
    </div>
  </div>;
}
