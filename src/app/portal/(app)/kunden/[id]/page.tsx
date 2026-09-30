import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Activity, AlertTriangle, ArrowLeft, CheckCircle2, Clock3, FilePlus2, Mail, Network, Phone, Sparkles, Target, UserRoundCheck } from "lucide-react";
import { Card, formatDate } from "@/components/portal/ui";
import { CustomerReferralManager } from "@/components/portal/CustomerReferralManager";
import { CustomerEditForm } from "@/components/portal/CustomerEditForm";
import { CustomerPrivacyPanel } from "@/components/portal/CustomerPrivacyPanel";
import { CONSENT_PURPOSE_LABELS, CONSENT_SOURCE_LABELS, getConsentStates, getErasureBlockers } from "@/lib/privacy-center";
import { Customer360Manager } from "@/components/portal/Customer360Manager";
import { getCurrentUser } from "@/lib/auth";
import { getCustomer360 } from "@/lib/enterprise";
import { permissionSnapshot, PORTAL_PERMISSION } from "@/lib/enterprise-access";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const raw = (await params).id;
  const id = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id < 1) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/portal/login?next=${encodeURIComponent(`/portal/kunden/${id}`)}`);
  const capabilities = await permissionSnapshot(user, [PORTAL_PERMISSION.CUSTOMER_READ, PORTAL_PERMISSION.CUSTOMER_EDIT, PORTAL_PERMISSION.ORDER_CREATE, PORTAL_PERMISSION.SERVICE_EDIT, PORTAL_PERMISSION.PRIVACY_MANAGE] as const);
  const canEdit = capabilities[PORTAL_PERMISSION.CUSTOMER_EDIT];
  const canRead = capabilities[PORTAL_PERMISSION.CUSTOMER_READ] || canEdit;
  if (!canRead) redirect("/portal");
  const canCreateOrder = capabilities[PORTAL_PERMISSION.ORDER_CREATE];
  const canCreateServiceCase = capabilities[PORTAL_PERMISSION.SERVICE_EDIT] || user.role === "admin";
  const canManagePrivacy = Boolean(capabilities[PORTAL_PERMISSION.PRIVACY_MANAGE]);
  const data = await getCustomer360(id, user);
  if (!data) notFound();
  const { customer, capabilities: { canLead, canOrder, canTask } } = data;
  const anonymized = typeof customer.metadata?.anonymizedAt === "string";
  const [consentStates, erasureBlockers] = await Promise.all([
    getConsentStates(customer.id),
    canManagePrivacy && !anonymized ? getErasureBlockers(customer.id) : Promise.resolve([] as string[]),
  ]);
  const name = customer.companyName || [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Ohne Name";
  const hasContact = Boolean(customer.phone || customer.email);
  const referralRows = data.referrals.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
  const intelligence = data.intelligence;
  const activeServiceCases = data.serviceCases.filter((serviceCase) => ["open", "in_progress", "waiting_customer", "waiting_provider"].includes(serviceCase.status));
  const intelligenceTone = {
    critical: "border-red-200 bg-red-50 text-red-900",
    high: "border-amber-200 bg-amber-50 text-amber-900",
    normal: "border-electric/15 bg-electric/[0.05] text-ink",
    good: "border-emerald-200 bg-emerald-50 text-emerald-900",
  }[intelligence.tone];
  const timelineKindLabel: Record<string, string> = {
    customer: "Kundenakte",
    activity: "Kontakt",
    lead: "Lead",
    lead_note: "Lead-Notiz",
    lead_call: "Lead-Anruf",
    order: "Auftrag",
    order_status: "Auftragsstatus",
    task: "Aufgabe",
    referral: "Empfehlung",
    opportunity: "Opportunity",
    service_case: "Servicefall",
    service_event: "Serviceverlauf",
  };
  const opportunityRows = data.opportunities.map((row) => ({
    id: row.opportunity.id,
    productId: row.opportunity.productId,
    topic: row.opportunity.topic,
    status: row.opportunity.status,
    priority: row.opportunity.priority,
    note: row.opportunity.note,
    nextReviewAt: row.opportunity.nextReviewAt?.toISOString() ?? null,
    productName: row.productName,
    productCategory: row.productCategory,
    providerName: row.providerName,
  }));

  return <div className="space-y-6">
    <Link href="/portal/kunden" className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-steel hover:text-ink"><ArrowLeft className="h-4 w-4" /> Zurück zu Kunden</Link>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="eyebrow text-electric-deep">{customer.customerNumber}</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">{name}</h1><p className="text-[14px] text-steel">Kunde seit {formatDate(customer.createdAt)}</p></div>
      <div className="flex flex-wrap gap-2">
        {customer.phone && <a href={`tel:${customer.phone}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold"><Phone className="h-4 w-4" /> Telefon</a>}
        {customer.email && <a href={`mailto:${customer.email}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold"><Mail className="h-4 w-4" /> E-Mail</a>}
        {canEdit && <Link href={`/portal/optimierung?customer=${customer.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-electric/25 bg-electric/[0.06] px-4 text-[13.5px] font-semibold text-electric-deep hover:bg-electric/10"><Sparkles className="h-4 w-4" /> Optimierungsservice</Link>}
        {canCreateOrder && <Link href={`/portal/auftraege/neu?customer=${customer.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white hover:bg-electric"><FilePlus2 className="h-4 w-4" /> Auftrag anlegen</Link>}
        {canCreateServiceCase && <Link href={`/portal/service/neu?customer=${customer.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-electric/25 bg-electric/[0.06] px-4 text-[13.5px] font-semibold text-electric-deep hover:bg-electric/10"><AlertTriangle className="h-4 w-4" /> Servicefall</Link>}
      </div>
    </header>

    <section className={"rounded-[22px] border p-4 sm:p-5 " + intelligenceTone} aria-label="Customer 360 Next Best Action">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-electric-soft"><Sparkles className="h-4.5 w-4.5" /></span>
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] opacity-65">Customer 360 · Next Best Action</p>
            <h2 className="mt-1 text-[18px] font-extrabold">{intelligence.nextBestAction.label}</h2>
            <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed opacity-80">{intelligence.nextBestAction.detail}</p>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
          <div className="rounded-xl border border-current/10 bg-white/55 px-3 py-2 text-center"><p className="text-[9.5px] font-bold uppercase tracking-wider opacity-60">CRM</p><p className="mt-0.5 text-[20px] font-extrabold">{intelligence.completeness}%</p></div>
          {canOrder && <div className="rounded-xl border border-current/10 bg-white/55 px-3 py-2 text-center"><p className="text-[9.5px] font-bold uppercase tracking-wider opacity-60">Aktiv</p><p className="mt-0.5 text-[20px] font-extrabold">{intelligence.summary.activeOrders}</p></div>}
          <div className="rounded-xl border border-current/10 bg-white/55 px-3 py-2 text-center"><p className="text-[9.5px] font-bold uppercase tracking-wider opacity-60">Potenziale</p><p className="mt-0.5 text-[20px] font-extrabold">{intelligence.summary.openOpportunities}</p></div>
          <div className="rounded-xl border border-current/10 bg-white/55 px-3 py-2 text-center"><p className="text-[9.5px] font-bold uppercase tracking-wider opacity-60">Kontakte</p><p className="mt-0.5 text-[20px] font-extrabold">{intelligence.summary.activities}</p></div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className={"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold " + (intelligence.retention.status === "due" ? "border-amber-300 bg-amber-100/60 text-amber-800" : "border-current/10 bg-white/55")}>
          <Clock3 className="h-3 w-3" /> {intelligence.retention.label}
        </span>
        {intelligence.missing.map((item) => <span key={item} className="rounded-full border border-current/10 bg-white/55 px-2.5 py-1 text-[10.5px] font-semibold">Fehlt: {item}</span>)}
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Customer 360 Kennzahlen">
      {[
        ...(canOrder ? [["Aufträge aktiv", intelligence.summary.activeOrders, FilePlus2]] : []),
        ["Offene Potenziale", intelligence.summary.openOpportunities, Target],
        ["Aktivitäten", intelligence.summary.activities, Activity],
        ["Empfehlungen", intelligence.summary.referrals, Network],
        ...(canTask ? [["Überfällige Aufgaben", intelligence.summary.overdueTasks, AlertTriangle]] : []),
        ["Servicefälle", activeServiceCases.length, AlertTriangle],
      ].map(([label, value, Icon]) => {
        const IconComponent = Icon as typeof Activity;
        return <div key={String(label)} className="rounded-[18px] border border-line bg-white p-3.5"><div className="flex items-center justify-between gap-3"><p className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-steel">{String(label)}</p><IconComponent className="h-4 w-4 text-electric-deep" /></div><p className="mt-2 text-[26px] font-extrabold">{Number(value)}</p></div>;
      })}
    </section>

    {activeServiceCases.length > 0 && (
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /><h2 className="text-[15px] font-extrabold">Aktive Servicefälle</h2></div><Link href="/portal/service" className="text-[11.5px] font-bold text-electric-deep hover:underline">Service öffnen</Link></div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {activeServiceCases.slice(0, 6).map((serviceCase) => <Link key={serviceCase.id} href={`/portal/service/${serviceCase.id}`} className="rounded-xl border border-line bg-paper p-3 transition hover:border-electric/30"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-extrabold uppercase tracking-wider text-electric-deep">{serviceCase.caseNumber}</span><span className={"text-[10px] font-extrabold " + (serviceCase.priority === "critical" ? "text-red-700" : serviceCase.priority === "high" ? "text-amber-700" : "text-steel")}>{serviceCase.priority}</span></div><p className="mt-1 truncate text-[12.5px] font-extrabold">{serviceCase.subject}</p><p className="mt-1 text-[10.5px] text-steel">{serviceCase.status} · SLA {new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }).format(serviceCase.dueAt)}</p></Link>)}
        </div>
      </Card>
    )}

    {(intelligence.riskFlags.length > 0 || intelligence.coverage.crossSellSignals.length > 0) && (
      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /><h2 className="text-[15px] font-extrabold">Risiken & Service-Signale</h2></div>
          {intelligence.riskFlags.length ? <div className="mt-3 space-y-2">{intelligence.riskFlags.map((flag) => <div key={flag.key} className={"rounded-xl border p-3 " + (flag.severity === "critical" ? "border-red-200 bg-red-50" : flag.severity === "high" ? "border-amber-200 bg-amber-50" : "border-line bg-paper")}><p className="text-[12.5px] font-extrabold">{flag.label}</p><p className="mt-1 text-[11px] leading-relaxed text-steel">{flag.detail}</p></div>)}</div> : <p className="mt-3 text-[12px] text-steel">Keine akuten Risiken aus den dokumentierten Daten.</p>}
        </Card>
        {canOrder && <Card>
          <div className="flex items-center gap-2"><Target className="h-4 w-4 text-electric-deep" /><h2 className="text-[15px] font-extrabold">Bedarfsabdeckung</h2></div>
          <p className="mt-1 text-[11.5px] text-steel">Keine automatische Verkaufsvorgabe: Diese Hinweise zeigen nur noch nicht dokumentierte Bereiche.</p>
          <div className="mt-3">
            <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-steel">Aktiver Bestand</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{intelligence.coverage.activeCategories.length ? intelligence.coverage.activeCategories.map((item) => <span key={item} className="chip border-emerald-200 bg-emerald-50 text-emerald-800">{item}</span>) : <span className="text-[11.5px] text-steel">Noch kein aktiver Produktbereich dokumentiert.</span>}</div>
          </div>
          {intelligence.coverage.crossSellSignals.length > 0 && <div className="mt-4"><p className="text-[10.5px] font-extrabold uppercase tracking-wider text-steel">Noch nicht abgedeckt</p><div className="mt-2 flex flex-wrap gap-1.5">{intelligence.coverage.crossSellSignals.map((item) => <span key={item} className="chip border-electric/20 bg-electric/[0.06] text-electric-deep">{item}</span>)}</div></div>}
        </Card>}
      </section>
    )}

    <section className="grid gap-2 sm:grid-cols-3" aria-label="Kunden-Workflow">
      <div className={"rounded-2xl border px-4 py-3 " + (hasContact ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
        <div className="flex items-center gap-2">
          {hasContact ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <UserRoundCheck className="h-4 w-4 text-amber-700" />}
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em]">1 · Kontakt</p>
        </div>
        <p className="mt-1 text-[11.5px] text-steel">{hasContact ? "Kontaktweg vorhanden" : "Telefon oder E-Mail ergänzen"}</p>
      </div>
      {canOrder && <div className={"rounded-2xl border px-4 py-3 " + (data.orders.length ? "border-emerald-200 bg-emerald-50" : "border-line bg-white")}>
        <div className="flex items-center gap-2">
          <FilePlus2 className={"h-4 w-4 " + (data.orders.length ? "text-emerald-700" : "text-electric-deep")} />
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em]">2 · Auftrag</p>
        </div>
        <p className="mt-1 text-[11.5px] text-steel">{data.orders.length ? data.orders.length + " Auftrag/Aufträge vorhanden" : "Bedarf klären und Auftrag anlegen"}</p>
      </div>}
      <div className={"rounded-2xl border px-4 py-3 " + (data.referrals.length ? "border-electric/20 bg-electric/[0.06]" : "border-line bg-white")}>
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-electric-deep" />
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em]">3 · Empfehlungen</p>
        </div>
        <p className="mt-1 text-[11.5px] text-steel">{data.referrals.length ? data.referrals.length + " Empfehlung(en) erfasst" : "Nach passenden Empfehlungen fragen"}</p>
      </div>
    </section>

    {data.referralSource && (
      <section className="rounded-[20px] border border-electric/15 bg-electric/[0.05] px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-electric-deep shadow-sm"><Network className="h-4 w-4" /></span>
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-steel">Herkunft · Kundenempfehlung</p>
              <p className="mt-0.5 text-[13.5px] font-extrabold">Empfohlen von {data.referralSource.sourceName}</p>
              <p className="text-[11.5px] text-steel">{data.referralSource.sourceCustomerNumber}{data.referralSource.relationship ? " · " + data.referralSource.relationship : ""}</p>
            </div>
          </div>
          <Link href={"/portal/kunden/" + data.referralSource.sourceCustomerId} className="inline-flex min-h-11 items-center rounded-full border border-electric/20 bg-white px-3.5 text-[11.5px] font-bold text-electric-deep hover:bg-electric/[0.05]">
            Empfehlenden Kunden öffnen
          </Link>
        </div>
        {data.referralSource.note && <p className="mt-2 text-[11.5px] leading-relaxed text-steel">{data.referralSource.note}</p>}
      </section>
    )}

    <div className="grid gap-4 lg:grid-cols-5">
      <Card className={canOrder ? "lg:col-span-2" : "lg:col-span-5"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-[16px] font-extrabold">Stammdaten</h2><p className="mt-0.5 text-[11.5px] text-steel">Kontakt- und Grunddaten der Kundenakte.</p></div>
          {canEdit && <CustomerEditForm
            customerId={customer.id}
            customerType={customer.type}
            firstName={customer.firstName}
            lastName={customer.lastName}
            companyName={customer.companyName}
            email={customer.email}
            phone={customer.phone}
            postalCode={customer.postalCode}
            city={customer.city}
            preferredChannel={customer.preferredChannel}
          />}
        </div>
        <dl className="mt-4 space-y-3 text-[14px]">
        {[
          ["Typ", customer.type === "business" ? "Geschäftskunde" : "Privatkunde"],
          ["E-Mail", customer.email],
          ["Telefon", customer.phone],
          ["PLZ / Ort", [customer.postalCode, customer.city].filter(Boolean).join(" ")],
          ["Bevorzugter Kanal", customer.preferredChannel],
          ["Tags", customer.tags.join(", ")],
        ].map(([key, value]) => <div key={key as string}><dt className="text-[11.5px] font-semibold uppercase tracking-wider text-steel">{key}</dt><dd className="mt-0.5 font-medium">{value || "–"}</dd></div>)}
      </dl>
      </Card>
      {canOrder && <Card className="lg:col-span-3"><div className="flex items-center justify-between"><h2 className="text-[16px] font-extrabold">Aufträge</h2><span className="text-[12.5px] text-steel">{data.orders.length}</span></div>
        {data.orders.length === 0 ? <p className="mt-6 text-[14px] text-steel">Noch keine Aufträge.</p> :
        <ul className="mt-3 divide-y divide-line">{data.orders.map((row) => <li key={row.order.id}><Link href={`/portal/auftraege/${row.order.id}`} className="block py-3">
          <div className="flex items-center justify-between gap-3"><p className="font-semibold">{row.order.orderNumber} · {row.providerName}</p><span className="chip border-line bg-white">{row.order.status}</span></div>
          <p className="text-[12.5px] text-steel">{row.productName || "Ohne Produkt"} · {formatDate(row.order.createdAt)}</p>
        </Link></li>)}</ul>}
      </Card>}
    </div>

    <Card>
      <CustomerPrivacyPanel
        customerId={customer.id}
        customerNumber={customer.customerNumber}
        consents={consentStates}
        purposeLabels={CONSENT_PURPOSE_LABELS}
        sourceLabels={CONSENT_SOURCE_LABELS}
        canRecordConsent={canEdit}
        canManagePrivacy={canManagePrivacy}
        erasureBlockers={erasureBlockers}
        anonymized={anonymized}
      />
    </Card>

    <section className="space-y-4">
      <div>
        <p className="eyebrow text-electric-deep">Customer 360 Workspace</p>
        <h2 className="mt-1 text-[20px] font-extrabold">Kontakt, Potenzial & Retention steuern</h2>
        <p className="mt-1 text-[12.5px] text-steel">Alle operativen Kundenaktionen direkt aus einer Akte – mit automatischer Wiedervorlage bei gesetztem Folgetermin.</p>
      </div>
      {canEdit ? (
        <Customer360Manager
          customerId={customer.id}
          products={data.availableProducts}
          opportunities={opportunityRows}
          profile={data.profile ? {
            lifecycleStage: data.profile.lifecycleStage,
            relationshipStatus: data.profile.relationshipStatus,
            riskLevel: data.profile.riskLevel,
            nextReviewAt: data.profile.nextReviewAt?.toISOString() ?? null,
            note: data.profile.note,
          } : null}
        />
      ) : (
        <Card>
          <p className="text-[13px] font-bold">Nur Leserechte</p>
          <p className="mt-1 text-[12px] text-steel">Customer-360-Daten sind sichtbar, können mit dieser Rolle aber nicht verändert werden.</p>
        </Card>
      )}
    </section>

    <Card className="p-0 sm:p-0">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div><p className="eyebrow text-electric-deep">360° Timeline</p><h2 className="mt-1 text-[18px] font-extrabold">Kundenhistorie</h2><p className="mt-1 text-[11.5px] text-steel">{["Kontakte", ...(canLead ? ["Leads und Anrufe"] : []), ...(canOrder ? ["Aufträge"] : []), ...(canTask ? ["Aufgaben"] : []), "Empfehlungen und Potenziale"].join(", ")} – chronologisch gemäß deinen Zugriffsrechten.</p></div>
        <span className="text-[11px] font-bold text-steel">{data.timeline.length} Ereignisse</span>
      </div>
      {data.timeline.length ? (
        <ol className="divide-y divide-line">
          {data.timeline.map((item) => (
            <li key={item.key} className="grid gap-2 px-5 py-3.5 sm:grid-cols-[auto_1fr_auto] sm:items-start sm:px-6">
              <span className={"mt-0.5 h-2.5 w-2.5 rounded-full " + (item.tone === "good" ? "bg-emerald-500" : item.tone === "attention" ? "bg-amber-500" : "bg-electric")} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className="text-[12.5px] font-extrabold">{item.title}</p><span className="text-[9.5px] font-bold uppercase tracking-wider text-steel">{timelineKindLabel[item.kind] ?? item.kind}</span></div>
                <p className="mt-0.5 whitespace-pre-line text-[11.5px] leading-relaxed text-steel">{item.detail || "–"}</p>
                {item.href && <Link href={item.href} className="mt-1.5 inline-flex text-[10.5px] font-bold text-electric-deep hover:underline">Vorgang öffnen</Link>}
              </div>
              <time className="text-[10.5px] text-steel sm:text-right">{formatDate(item.at)}</time>
            </li>
          ))}
        </ol>
      ) : <div className="px-6 py-10 text-center text-[12.5px] text-steel">Noch keine Historie vorhanden.</div>}
    </Card>

    <Card>
      <CustomerReferralManager
        customerId={customer.id}
        customerName={name}
        rows={referralRows}
        canEdit={canEdit}
      />
    </Card>
  </div>;
}
