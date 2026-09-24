"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  FileText,
  FileUp,
  Loader2,
  Sparkles,
  Target,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { OPTIMIZATION_CATEGORY_LABELS, OPTIMIZATION_CATEGORIES } from "@/lib/optimization-shared";

type CustomerOption = { id: number; customerNumber: string; name: string };
type MembershipRow = {
  id: number; customerId: number; customerNumber: string; customerName: string; status: string;
  monthlyPriceCents: number; planCode: string; nextReviewAt: string | null; nextBillingAt: string | null;
  startedAt: string | null; billingProvider: string | null; ownerName: string | null;
  openGoals: number; activeContracts: number; proposedOffers: number;
};
type GoalRow = {
  id: number; customerId: number; customerName: string; category: string; title: string; description: string;
  priority: string; status: string; targetDate: string | null; budgetCents: number | null; financingNeeded: boolean;
  assignedName: string | null; updatedAt: string;
};
type ContractRow = {
  id: number; customerId: number; customerName: string; category: string; providerName: string; contractName: string;
  monthlyCostCents: number | null; startDate: string | null; endDate: string | null; noticeDate: string | null;
  status: string; note: string; updatedAt: string;
};
type OfferRow = {
  id: number; customerId: number; customerName: string; goalId: number | null; contractId: number | null;
  providerName: string; title: string; monthlyCostCents: number | null; oneTimeCostCents: number | null;
  termMonths: number | null; position: number; status: string; validUntil: string | null; note: string; updatedAt: string;
};
type DocumentRow = {
  id: number; customerId: number; customerName: string; goalId: number | null; contractId: number | null; offerId: number | null;
  kind: string; title: string; fileName: string; contentType: string; byteSize: number; createdAt: string;
};

type HubData = {
  summary: {
    memberships: { total: number; active: number; pending: number; mrrCents: number; reviewDue: number };
    goals: { open: number; financing: number; accepted: number };
    contracts: { active: number; notice30: number; monthlyCents: number };
    offers: { proposed: number; accepted: number };
  };
  customers: CustomerOption[];
  memberships: MembershipRow[];
  goals: GoalRow[];
  contracts: ContractRow[];
  offers: OfferRow[];
  documents: DocumentRow[];
};

type Tab = "cockpit" | "memberships" | "goals" | "contracts" | "offers" | "documents";

const TAB_LABELS: Record<Tab, string> = {
  cockpit: "Cockpit",
  memberships: "Mitgliedschaften",
  goals: "Ziele & Wünsche",
  contracts: "Verträge",
  offers: "Angebote",
  documents: "Dokumente",
};

const MEMBERSHIP_LABELS: Record<string, string> = {
  pending: "Ausstehend",
  active: "Aktiv",
  paused: "Pausiert",
  cancelled: "Beendet",
};

const GOAL_LABELS: Record<string, string> = {
  open: "Offen",
  researching: "Recherche",
  offers_ready: "Angebote bereit",
  accepted: "Angenommen",
  completed: "Erledigt",
  cancelled: "Beendet",
};

const CONTRACT_LABELS: Record<string, string> = {
  active: "Aktiv",
  review_due: "Prüfung fällig",
  switch_planned: "Wechsel geplant",
  cancelled: "Gekündigt",
  expired: "Beendet",
};

const OFFER_LABELS: Record<string, string> = {
  draft: "Entwurf",
  proposed: "Vorgelegt",
  accepted: "Angenommen",
  rejected: "Abgelehnt",
  expired: "Abgelaufen",
};

function money(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function shortDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? value + "T12:00:00" : value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("de-DE").format(date) : "—";
}

function toCents(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
}

function toNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function statusClass(status: string) {
  if (["active", "accepted", "completed"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["critical", "review_due", "expired", "cancelled", "rejected"].includes(status)) return "border-red-200 bg-red-50 text-red-800";
  if (["paused", "pending", "researching", "offers_ready", "switch_planned", "proposed"].includes(status)) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-line bg-paper text-steel";
}

export function OptimizationHubDashboard({ data, canEdit, initialCustomerId }: { data: HubData; canEdit: boolean; initialCustomerId?: number }) {
  const router = useRouter();
  const saving = useRef(false);
  const [tab, setTab] = useState<Tab>("cockpit");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [query, setQuery] = useState("");

  const normalized = query.trim().toLowerCase();
  const matches = (parts: Array<string | number | null | undefined>) => !normalized || parts.some((part) => String(part ?? "").toLowerCase().includes(normalized));
  const filteredMemberships = data.memberships.filter((row) => matches([row.customerName, row.customerNumber, row.status, row.billingProvider]));
  const filteredGoals = data.goals.filter((row) => matches([row.customerName, row.title, row.category, row.status, row.description]));
  const filteredContracts = data.contracts.filter((row) => matches([row.customerName, row.providerName, row.contractName, row.category, row.status]));
  const filteredOffers = data.offers.filter((row) => matches([row.customerName, row.providerName, row.title, row.status]));
  const filteredDocuments = data.documents.filter((row) => matches([row.customerName, row.title, row.fileName, row.kind]));

  async function jsonRequest(key: string, payload: Record<string, unknown>, success: string) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(key);
    setMessage(null);
    try {
      const response = await fetch("/api/portal/optimization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Speichern fehlgeschlagen.");
      setMessage({ type: "ok", text: success });
      router.refresh();
      return true;
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Speichern fehlgeschlagen." });
      return false;
    } finally {
      saving.current = false;
      setBusy(null);
    }
  }

  async function membershipSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const reviewDate = String(form.get("nextReviewDate") ?? "");
    const ok = await jsonRequest("membership", {
      action: "membership",
      customerId: Number(form.get("customerId")),
      status: form.get("status"),
      nextReviewAt: reviewDate ? new Date(reviewDate + "T12:00:00").toISOString() : null,
      billingProvider: form.get("billingProvider") || null,
      billingCustomerRef: form.get("billingCustomerRef") || null,
      billingSubscriptionRef: form.get("billingSubscriptionRef") || null,
    }, "Mitgliedschaft aktualisiert.");
    if (ok) formElement.reset();
  }

  async function goalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const ok = await jsonRequest("goal", {
      action: "goal",
      customerId: Number(form.get("customerId")),
      category: form.get("category"),
      title: form.get("title"),
      description: form.get("description"),
      priority: form.get("priority"),
      targetDate: form.get("targetDate") || null,
      budgetCents: toCents(form.get("budget")),
      financingNeeded: form.get("financingNeeded") === "on",
    }, "Ziel/Wunsch angelegt.");
    if (ok) formElement.reset();
  }

  async function contractSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const ok = await jsonRequest("contract", {
      action: "contract",
      customerId: Number(form.get("customerId")),
      category: form.get("category"),
      providerName: form.get("providerName"),
      contractName: form.get("contractName"),
      monthlyCostCents: toCents(form.get("monthlyCost")),
      startDate: form.get("startDate") || null,
      endDate: form.get("endDate") || null,
      noticeDate: form.get("noticeDate") || null,
      status: form.get("status"),
      note: form.get("note"),
    }, "Vertrag erfasst.");
    if (ok) formElement.reset();
  }

  async function offerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const ok = await jsonRequest("offer", {
      action: "offer",
      customerId: Number(form.get("customerId")),
      goalId: toNumber(form.get("goalId")),
      contractId: toNumber(form.get("contractId")),
      providerName: form.get("providerName"),
      title: form.get("title"),
      monthlyCostCents: toCents(form.get("monthlyCost")),
      oneTimeCostCents: toCents(form.get("oneTimeCost")),
      termMonths: toNumber(form.get("termMonths")),
      position: Number(form.get("position") || 1),
      status: "proposed",
      validUntil: form.get("validUntil") || null,
      note: form.get("note"),
    }, "Angebot hinzugefügt.");
    if (ok) formElement.reset();
  }

  async function uploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    const formElement = event.currentTarget;
    saving.current = true;
    setBusy("document");
    setMessage(null);
    try {
      const form = new FormData(formElement);
      const response = await fetch("/api/portal/optimization/documents", {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(30000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Upload fehlgeschlagen.");
      setMessage({ type: "ok", text: "Dokument sicher gespeichert." });
      formElement.reset();
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Upload fehlgeschlagen." });
    } finally {
      saving.current = false;
      setBusy(null);
    }
  }

  const annualRecurring = data.summary.memberships.mrrCents * 12;
  const membershipPenetration = data.customers.length ? Math.round((data.summary.memberships.active / data.customers.length) * 100) : 0;

  return <div className="space-y-6">
    <header className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_90%_0%,rgba(79,141,255,.20),transparent_30%),linear-gradient(145deg,#081426,#0d1d35)] p-5 text-white shadow-soft sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-electric-soft"><Sparkles className="h-4 w-4" /> TarifWerk Optimierungsservice</p>
          <h1 className="mt-3 text-[clamp(1.8rem,4vw,3rem)] font-extrabold tracking-tight">Aus Einmal-Beratung wird eine laufende Kundenbeziehung.</h1>
          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-silver">1,99 € pro Monat als fester Tarif im System. Ziele, Verträge, drei Vergleichsoptionen, Finanzierungsbedarf, Dokumente und Folgeprüfungen werden in einer Kundenreise gebündelt.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-silver">Recurring Revenue</p>
          <p className="mt-1 text-2xl font-extrabold">{money(data.summary.memberships.mrrCents)} <span className="text-xs font-semibold text-silver">MRR</span></p>
          <p className="mt-1 text-[11.5px] text-silver">{money(annualRecurring)} ARR · {membershipPenetration}% aktive Kundenpenetration</p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {(Object.keys(TAB_LABELS) as Tab[]).map((key) => <button key={key} type="button" onClick={() => setTab(key)} className={"rounded-full border px-3.5 py-2 text-[11.5px] font-extrabold transition " + (tab === key ? "border-electric bg-electric text-white" : "border-white/10 bg-white/[0.04] text-silver hover:border-white/20 hover:text-white")}>{TAB_LABELS[key]}</button>)}
      </div>
    </header>

    {message && <div role={message.type === "error" ? "alert" : "status"} className={"rounded-2xl border px-4 py-3 text-[13px] font-semibold " + (message.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>{message.text}</div>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {[
        ["Aktive Abos", data.summary.memberships.active, "1,99 € / Monat", WalletCards],
        ["Review fällig", data.summary.memberships.reviewDue, "Bestand aktivieren", Clock3],
        ["Offene Wünsche", data.summary.goals.open, data.summary.goals.financing + " mit Finanzierung", Target],
        ["Verträge aktiv", data.summary.contracts.active, data.summary.contracts.notice30 + " Fristen ≤ 30 Tage", FileText],
        ["Angebote offen", data.summary.offers.proposed, "Ziel: bis 3 Optionen", Sparkles],
        ["Angenommen", data.summary.offers.accepted, data.summary.goals.accepted + " Wünsche", CheckCircle2],
      ].map(([label, value, hint, Icon]) => {
        const IconComponent = Icon as typeof Target;
        return <div key={String(label)} className="rounded-[20px] border border-line bg-white p-4 shadow-[0_12px_36px_-32px_rgba(6,11,22,.55)]">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-steel">{String(label)}</p><p className="mt-2 text-2xl font-extrabold text-ink">{String(value)}</p></div><IconComponent className="h-4.5 w-4.5 text-electric-deep" /></div>
          <p className="mt-1 text-[10.5px] text-steel">{String(hint)}</p>
        </div>;
      })}
    </section>

    {tab !== "cockpit" && <div className="rounded-2xl border border-line bg-white p-3">
      <input value={query} onChange={(event) => setQuery(event.target.value)} className="field" placeholder="Kunde, Anbieter, Vertrag, Wunsch oder Status durchsuchen …" aria-label="Optimierungsservice durchsuchen" />
    </div>}

    {tab === "cockpit" && <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-electric-deep">Wachstumslogik</p><h2 className="mt-1 text-[19px] font-extrabold text-ink">Vier Schleifen statt einmaligem Abschluss</h2></div><Sparkles className="h-5 w-5 text-electric-deep" /></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["1", "Bestand erfassen", "Verträge, Kosten und Fristen in einer Kundenakte bündeln."],
            ["2", "Wünsche sammeln", "Ziele aus Alltag, Zuhause und Vermögen als echte Pipeline behandeln."],
            ["3", "3 Optionen liefern", "Vergleichbare Angebote dokumentieren und Kundenentscheidung festhalten."],
            ["4", "Review wiederholen", "Fristen und neue Lebensziele erzeugen laufende, nachvollziehbare Anlässe."],
          ].map(([n, title, body]) => <div key={n} className="rounded-2xl border border-line bg-paper p-4"><span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[11px] font-extrabold text-white">{n}</span><p className="mt-3 text-[13.5px] font-extrabold text-ink">{title}</p><p className="mt-1 text-[11.5px] leading-relaxed text-steel">{body}</p></div>)}
        </div>
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11.5px] leading-relaxed text-amber-900"><strong>Billing-Sicherheit:</strong> Ein Status „aktiv“ dokumentiert die Mitgliedschaft im CRM. Eine echte Abbuchung findet erst statt, wenn ein Zahlungsanbieter technisch angebunden und bestätigt ist.</div>
      </section>

      <section className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-electric-deep">Nächste Hebel</p>
        <h2 className="mt-1 text-[19px] font-extrabold text-ink">Was heute Umsatzpotenzial erzeugt</h2>
        <div className="mt-5 space-y-3">
          <button type="button" onClick={() => setTab("memberships")} className="flex w-full items-center justify-between rounded-2xl border border-line p-4 text-left transition hover:border-electric/30"><span><strong className="block text-[13px] text-ink">{data.summary.memberships.pending} ausstehende Mitgliedschaften</strong><span className="text-[11.5px] text-steel">Klare Aktivierung oder Ablehnung statt grauer Liste.</span></span><span className="text-electric-deep">→</span></button>
          <button type="button" onClick={() => setTab("contracts")} className="flex w-full items-center justify-between rounded-2xl border border-line p-4 text-left transition hover:border-electric/30"><span><strong className="block text-[13px] text-ink">{data.summary.contracts.notice30} Vertragsfristen in 30 Tagen</strong><span className="text-[11.5px] text-steel">Fristen sind natürliche Review- und Wechselanlässe.</span></span><span className="text-electric-deep">→</span></button>
          <button type="button" onClick={() => setTab("goals")} className="flex w-full items-center justify-between rounded-2xl border border-line p-4 text-left transition hover:border-electric/30"><span><strong className="block text-[13px] text-ink">{data.summary.goals.financing} Wünsche mit Finanzierungsbedarf</strong><span className="text-[11.5px] text-steel">Früh erkennen, welche Lösungen Partner- oder Bankkoordination brauchen.</span></span><span className="text-electric-deep">→</span></button>
          <button type="button" onClick={() => setTab("offers")} className="flex w-full items-center justify-between rounded-2xl border border-line p-4 text-left transition hover:border-electric/30"><span><strong className="block text-[13px] text-ink">{data.summary.offers.proposed} offene Angebote</strong><span className="text-[11.5px] text-steel">Entscheidungen sichtbar machen und Nachfassen vereinfachen.</span></span><span className="text-electric-deep">→</span></button>
        </div>
      </section>
    </div>}

    {tab === "memberships" && <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      {canEdit && <form onSubmit={membershipSubmit} className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
        <h2 className="text-[17px] font-extrabold text-ink">Mitgliedschaft anlegen / aktualisieren</h2>
        <p className="mt-1 text-[11.5px] text-steel">Der Monatspreis wird serverseitig fest auf 1,99 € gesetzt.</p>
        <div className="mt-4 grid gap-3">
          <label className="label">Kunde<select name="customerId" required className="field" defaultValue={initialCustomerId ? String(initialCustomerId) : ""}><option value="">Bitte wählen</option>{data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.customerNumber}</option>)}</select></label>
          <label className="label">Status<select name="status" defaultValue="pending" className="field"><option value="pending">Ausstehend</option><option value="active">Aktiv</option><option value="paused">Pausiert</option><option value="cancelled">Beendet</option></select></label>
          <label className="label">Nächster Bestandscheck<input name="nextReviewDate" type="date" className="field" /></label>
          <label className="label">Zahlungsanbieter / Modus<input name="billingProvider" maxLength={80} className="field" placeholder="z. B. Stripe, SEPA extern, manuell" /></label>
          <label className="label">Billing-Kundenreferenz<input name="billingCustomerRef" maxLength={180} className="field" /></label>
          <label className="label">Billing-Abo-Referenz<input name="billingSubscriptionRef" maxLength={180} className="field" /></label>
          <button disabled={busy !== null} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-extrabold text-white hover:bg-electric disabled:opacity-50">{busy === "membership" && <Loader2 className="h-4 w-4 animate-spin" />} Speichern</button>
        </div>
      </form>}
      <section className="space-y-3">
        {filteredMemberships.length === 0 ? <Empty text="Noch keine Mitgliedschaften in dieser Ansicht." /> : filteredMemberships.map((row) => <article key={row.id} className="rounded-[22px] border border-line bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[14px] font-extrabold text-ink">{row.customerName}</p><p className="mt-0.5 text-[11px] text-steel">{row.customerNumber} · Owner {row.ownerName ?? "nicht gesetzt"}</p></div><span className={"rounded-full border px-2.5 py-1 text-[10px] font-extrabold " + statusClass(row.status)}>{MEMBERSHIP_LABELS[row.status] ?? row.status}</span></div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Mini label="Preis" value={money(row.monthlyPriceCents)} /><Mini label="Wünsche offen" value={row.openGoals} /><Mini label="Verträge aktiv" value={row.activeContracts} /><Mini label="Angebote offen" value={row.proposedOffers} /></div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-steel"><span>Review: <strong className="text-ink">{shortDate(row.nextReviewAt)}</strong></span><span>Billing: <strong className="text-ink">{row.billingProvider ?? "noch nicht angebunden"}</strong></span></div>
        </article>)}
      </section>
    </div>}

    {tab === "goals" && <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      {canEdit && <form onSubmit={goalSubmit} className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
        <h2 className="text-[17px] font-extrabold text-ink">Ziel / Wunsch aufnehmen</h2>
        <div className="mt-4 grid gap-3">
          <label className="label">Kunde<select name="customerId" required className="field" defaultValue={initialCustomerId ? String(initialCustomerId) : ""}><option value="">Bitte wählen</option>{data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.customerNumber}</option>)}</select></label>
          <label className="label">Bereich<select name="category" defaultValue="internet_tv" className="field">{OPTIMIZATION_CATEGORIES.map((key) => <option key={key} value={key}>{OPTIMIZATION_CATEGORY_LABELS[key]}</option>)}</select></label>
          <label className="label">Wunsch / Ziel<input name="title" required maxLength={180} className="field" placeholder="z. B. Solaranlage mit Finanzierung prüfen" /></label>
          <label className="label">Beschreibung<textarea name="description" maxLength={3000} rows={4} className="field min-h-24 py-3" /></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="label">Priorität<select name="priority" defaultValue="normal" className="field"><option value="low">Niedrig</option><option value="normal">Normal</option><option value="high">Hoch</option><option value="critical">Kritisch</option></select></label><label className="label">Zieldatum<input name="targetDate" type="date" className="field" /></label></div>
          <label className="label">Budget €<input name="budget" inputMode="decimal" className="field" placeholder="optional" /></label>
          <label className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-3 text-[12px] font-semibold text-ink"><input name="financingNeeded" type="checkbox" /> Finanzierung / Bankkoordination prüfen</label>
          <button disabled={busy !== null} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-extrabold text-white hover:bg-electric disabled:opacity-50">{busy === "goal" && <Loader2 className="h-4 w-4 animate-spin" />} Wunsch anlegen</button>
        </div>
      </form>}
      <section className="space-y-3">
        {filteredGoals.length === 0 ? <Empty text="Noch keine Ziele oder Wünsche in dieser Ansicht." /> : filteredGoals.map((row) => <article key={row.id} className="rounded-[22px] border border-line bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-electric-deep">{OPTIMIZATION_CATEGORY_LABELS[row.category as keyof typeof OPTIMIZATION_CATEGORY_LABELS] ?? row.category}</p><h3 className="mt-1 text-[15px] font-extrabold text-ink">{row.title}</h3><p className="mt-1 text-[11.5px] text-steel">{row.customerName}</p></div><span className={"rounded-full border px-2.5 py-1 text-[10px] font-extrabold " + statusClass(row.status)}>{GOAL_LABELS[row.status] ?? row.status}</span></div>
          {row.description && <p className="mt-3 text-[12px] leading-relaxed text-steel">{row.description}</p>}
          <div className="mt-4 flex flex-wrap gap-2 text-[10.5px]"><span className="chip">Ziel {row.targetDate ? shortDate(row.targetDate) : "offen"}</span><span className="chip">Budget {money(row.budgetCents)}</span>{row.financingNeeded && <span className="chip border-amber-200 bg-amber-50 text-amber-800">Finanzierung nötig</span>}<span className="chip">Owner {row.assignedName ?? "—"}</span></div>
          {canEdit && !["completed", "cancelled"].includes(row.status) && <div className="mt-4 flex flex-wrap gap-2">
            {row.status === "open" && <button type="button" disabled={busy !== null} onClick={() => jsonRequest("goal-" + row.id, { action: "goal_status", goalId: row.id, status: "researching" }, "Wunsch ist jetzt in Recherche.")} className="inline-flex h-9 items-center rounded-full border border-line bg-white px-3 text-[11px] font-extrabold text-ink hover:border-electric/30">Recherche starten</button>}
            {row.status === "researching" && <button type="button" disabled={busy !== null} onClick={() => jsonRequest("goal-" + row.id, { action: "goal_status", goalId: row.id, status: "offers_ready" }, "Vergleich ist als bereit markiert.")} className="inline-flex h-9 items-center rounded-full border border-electric/25 bg-electric/[0.06] px-3 text-[11px] font-extrabold text-electric-deep">Angebote bereit</button>}
            {row.status === "accepted" && <button type="button" disabled={busy !== null} onClick={() => jsonRequest("goal-" + row.id, { action: "goal_status", goalId: row.id, status: "completed" }, "Wunsch als erledigt markiert.")} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-700 px-3 text-[11px] font-extrabold text-white"><CheckCircle2 className="h-3.5 w-3.5" /> Erledigt</button>}
            <button type="button" disabled={busy !== null} onClick={() => jsonRequest("goal-" + row.id, { action: "goal_status", goalId: row.id, status: "cancelled" }, "Wunsch beendet.")} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 text-[11px] font-extrabold text-red-800"><XCircle className="h-3.5 w-3.5" /> Beenden</button>
          </div>}
        </article>)}
      </section>
    </div>}

    {tab === "contracts" && <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      {canEdit && <form onSubmit={contractSubmit} className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
        <h2 className="text-[17px] font-extrabold text-ink">Bestehenden Vertrag erfassen</h2>
        <div className="mt-4 grid gap-3">
          <label className="label">Kunde<select name="customerId" required className="field" defaultValue={initialCustomerId ? String(initialCustomerId) : ""}><option value="">Bitte wählen</option>{data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.customerNumber}</option>)}</select></label>
          <label className="label">Bereich<select name="category" defaultValue="internet_tv" className="field">{OPTIMIZATION_CATEGORIES.map((key) => <option key={key} value={key}>{OPTIMIZATION_CATEGORY_LABELS[key]}</option>)}</select></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="label">Anbieter<input name="providerName" required maxLength={180} className="field" /></label><label className="label">Vertrag / Tarif<input name="contractName" required maxLength={220} className="field" /></label></div>
          <label className="label">Monatliche Kosten €<input name="monthlyCost" inputMode="decimal" className="field" /></label>
          <div className="grid gap-3 sm:grid-cols-3"><label className="label">Start<input name="startDate" type="date" className="field" /></label><label className="label">Ende<input name="endDate" type="date" className="field" /></label><label className="label">Kündigungs-/Prüffrist<input name="noticeDate" type="date" className="field" /></label></div>
          <label className="label">Status<select name="status" defaultValue="active" className="field"><option value="active">Aktiv</option><option value="review_due">Prüfung fällig</option><option value="switch_planned">Wechsel geplant</option><option value="cancelled">Gekündigt</option><option value="expired">Beendet</option></select></label>
          <label className="label">Notiz<textarea name="note" maxLength={3000} rows={3} className="field min-h-20 py-3" /></label>
          <button disabled={busy !== null} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-extrabold text-white hover:bg-electric disabled:opacity-50">{busy === "contract" && <Loader2 className="h-4 w-4 animate-spin" />} Vertrag speichern</button>
        </div>
      </form>}
      <section className="space-y-3">
        {filteredContracts.length === 0 ? <Empty text="Noch keine Verträge in dieser Ansicht." /> : filteredContracts.map((row) => <article key={row.id} className="rounded-[22px] border border-line bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[14px] font-extrabold text-ink">{row.providerName} · {row.contractName}</p><p className="mt-1 text-[11.5px] text-steel">{row.customerName} · {OPTIMIZATION_CATEGORY_LABELS[row.category as keyof typeof OPTIMIZATION_CATEGORY_LABELS] ?? row.category}</p></div><span className={"rounded-full border px-2.5 py-1 text-[10px] font-extrabold " + statusClass(row.status)}>{CONTRACT_LABELS[row.status] ?? row.status}</span></div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Mini label="Monat" value={money(row.monthlyCostCents)} /><Mini label="Start" value={shortDate(row.startDate)} /><Mini label="Ende" value={shortDate(row.endDate)} /><Mini label="Frist" value={shortDate(row.noticeDate)} /></div>
          {row.note && <p className="mt-3 text-[11.5px] text-steel">{row.note}</p>}
          {canEdit && !["cancelled", "expired"].includes(row.status) && <div className="mt-4 flex flex-wrap gap-2">
            {row.status !== "review_due" && <button type="button" disabled={busy !== null} onClick={() => jsonRequest("contract-" + row.id, { action: "contract_status", contractId: row.id, status: "review_due" }, "Vertrag zur Prüfung markiert.")} className="inline-flex h-9 items-center rounded-full border border-amber-200 bg-amber-50 px-3 text-[11px] font-extrabold text-amber-800">Prüfung fällig</button>}
            {row.status !== "switch_planned" && <button type="button" disabled={busy !== null} onClick={() => jsonRequest("contract-" + row.id, { action: "contract_status", contractId: row.id, status: "switch_planned" }, "Wechsel als geplant markiert.")} className="inline-flex h-9 items-center rounded-full border border-electric/25 bg-electric/[0.06] px-3 text-[11px] font-extrabold text-electric-deep">Wechsel geplant</button>}
            {row.status !== "active" && <button type="button" disabled={busy !== null} onClick={() => jsonRequest("contract-" + row.id, { action: "contract_status", contractId: row.id, status: "active" }, "Vertrag wieder als aktiv markiert.")} className="inline-flex h-9 items-center rounded-full border border-line bg-white px-3 text-[11px] font-extrabold text-ink">Aktiv</button>}
            <button type="button" disabled={busy !== null} onClick={() => jsonRequest("contract-" + row.id, { action: "contract_status", contractId: row.id, status: "cancelled" }, "Vertrag als gekündigt markiert.")} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 text-[11px] font-extrabold text-red-800"><XCircle className="h-3.5 w-3.5" /> Gekündigt</button>
          </div>}
        </article>)}
      </section>
    </div>}

    {tab === "offers" && <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      {canEdit && <form onSubmit={offerSubmit} className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
        <h2 className="text-[17px] font-extrabold text-ink">Vergleichsoption hinzufügen</h2>
        <p className="mt-1 text-[11.5px] text-steel">Für einen Wunsch idealerweise drei nachvollziehbare Optionen anlegen.</p>
        <div className="mt-4 grid gap-3">
          <label className="label">Kunde<select name="customerId" required className="field" defaultValue={initialCustomerId ? String(initialCustomerId) : ""}><option value="">Bitte wählen</option>{data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.customerNumber}</option>)}</select></label>
          <label className="label">Wunsch verknüpfen<select name="goalId" className="field"><option value="">Optional</option>{data.goals.filter((goal) => ["open","researching","offers_ready"].includes(goal.status)).map((goal) => <option key={goal.id} value={goal.id}>#{goal.id} · {goal.customerName} · {goal.title}</option>)}</select></label>
          <label className="label">Bestandsvertrag verknüpfen<select name="contractId" className="field"><option value="">Optional</option>{data.contracts.filter((contract) => ["active","review_due","switch_planned"].includes(contract.status)).map((contract) => <option key={contract.id} value={contract.id}>#{contract.id} · {contract.customerName} · {contract.providerName}</option>)}</select></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="label">Anbieter<input name="providerName" required maxLength={180} className="field" /></label><label className="label">Angebot<input name="title" required maxLength={220} className="field" /></label></div>
          <div className="grid gap-3 sm:grid-cols-3"><label className="label">Monat €<input name="monthlyCost" inputMode="decimal" className="field" /></label><label className="label">Einmalig €<input name="oneTimeCost" inputMode="decimal" className="field" /></label><label className="label">Laufzeit Monate<input name="termMonths" type="number" min="0" max="600" className="field" /></label></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="label">Option<select name="position" defaultValue="1" className="field"><option value="1">Option 1</option><option value="2">Option 2</option><option value="3">Option 3</option></select></label><label className="label">Gültig bis<input name="validUntil" type="date" className="field" /></label></div>
          <label className="label">Einordnung / Unterschiede<textarea name="note" maxLength={3000} rows={3} className="field min-h-20 py-3" /></label>
          <button disabled={busy !== null} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-extrabold text-white hover:bg-electric disabled:opacity-50">{busy === "offer" && <Loader2 className="h-4 w-4 animate-spin" />} Angebot hinzufügen</button>
        </div>
      </form>}
      <section className="space-y-3">
        {filteredOffers.length === 0 ? <Empty text="Noch keine Angebote in dieser Ansicht." /> : filteredOffers.map((row) => <article key={row.id} className="rounded-[22px] border border-line bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-electric-deep">Option {row.position}{row.goalId ? ` · Wunsch #${row.goalId}` : ""}</p><h3 className="mt-1 text-[15px] font-extrabold text-ink">{row.providerName} · {row.title}</h3><p className="mt-1 text-[11.5px] text-steel">{row.customerName}</p></div><span className={"rounded-full border px-2.5 py-1 text-[10px] font-extrabold " + statusClass(row.status)}>{OFFER_LABELS[row.status] ?? row.status}</span></div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Mini label="Monat" value={money(row.monthlyCostCents)} /><Mini label="Einmalig" value={money(row.oneTimeCostCents)} /><Mini label="Laufzeit" value={row.termMonths === null ? "—" : row.termMonths + " Mon."} /><Mini label="Gültig bis" value={shortDate(row.validUntil)} /></div>
          {row.note && <p className="mt-3 text-[11.5px] leading-relaxed text-steel">{row.note}</p>}
          {canEdit && row.status === "proposed" && <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy !== null} onClick={() => jsonRequest("offer-" + row.id, { action: "offer_status", offerId: row.id, status: "accepted" }, "Angebot als angenommen markiert.")} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-700 px-3 text-[11px] font-extrabold text-white"><CheckCircle2 className="h-3.5 w-3.5" /> Angenommen</button><button type="button" disabled={busy !== null} onClick={() => jsonRequest("offer-" + row.id, { action: "offer_status", offerId: row.id, status: "rejected" }, "Angebot als abgelehnt markiert.")} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 text-[11px] font-extrabold text-red-800"><XCircle className="h-3.5 w-3.5" /> Abgelehnt</button></div>}
        </article>)}
      </section>
    </div>}

    {tab === "documents" && <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      {canEdit && <form onSubmit={uploadSubmit} className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
        <h2 className="text-[17px] font-extrabold text-ink">Dokument hochladen</h2>
        <p className="mt-1 text-[11.5px] text-steel">PDF, JPG, PNG oder WebP · maximal 8 MB · SHA-256-Prüfhash wird gespeichert.</p>
        <div className="mt-4 grid gap-3">
          <label className="label">Kunde<select name="customerId" required className="field" defaultValue={initialCustomerId ? String(initialCustomerId) : ""}><option value="">Bitte wählen</option>{data.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.customerNumber}</option>)}</select></label>
          <label className="label">Titel<input name="title" required maxLength={220} className="field" placeholder="z. B. Telekom Rechnung August" /></label>
          <label className="label">Dokumentart<select name="kind" defaultValue="contract" className="field"><option value="contract">Vertrag</option><option value="offer">Angebot</option><option value="invoice">Rechnung</option><option value="proof">Nachweis</option><option value="other">Sonstiges</option></select></label>
          <label className="label">Vertrag verknüpfen<select name="contractId" className="field"><option value="">Optional</option>{data.contracts.map((row) => <option key={row.id} value={row.id}>#{row.id} · {row.customerName} · {row.providerName}</option>)}</select></label>
          <label className="label">Wunsch verknüpfen<select name="goalId" className="field"><option value="">Optional</option>{data.goals.map((row) => <option key={row.id} value={row.id}>#{row.id} · {row.customerName} · {row.title}</option>)}</select></label>
          <label className="label">Angebot verknüpfen<select name="offerId" className="field"><option value="">Optional</option>{data.offers.map((row) => <option key={row.id} value={row.id}>#{row.id} · {row.customerName} · {row.providerName}</option>)}</select></label>
          <label className="label">Datei<input name="file" type="file" accept=".pdf,image/jpeg,image/png,image/webp" required className="field" /></label>
          <button disabled={busy !== null} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-extrabold text-white hover:bg-electric disabled:opacity-50">{busy === "document" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} Hochladen</button>
        </div>
      </form>}
      <section className="space-y-3">
        {filteredDocuments.length === 0 ? <Empty text="Noch keine Dokumente in dieser Ansicht." /> : filteredDocuments.map((row) => <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-line bg-white p-4 sm:p-5"><div className="min-w-0"><p className="truncate text-[14px] font-extrabold text-ink">{row.title}</p><p className="mt-1 truncate text-[11.5px] text-steel">{row.customerName} · {row.fileName} · {(row.byteSize / 1024).toFixed(0)} KB · {shortDate(row.createdAt)}</p></div><Link href={`/api/portal/optimization/documents/${row.id}`} className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3 text-[11px] font-extrabold text-ink hover:border-electric/30"><FileText className="h-3.5 w-3.5" /> Download</Link></article>)}
      </section>
    </div>}
  </div>;
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-line bg-paper px-3 py-2"><p className="text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-steel">{label}</p><p className="mt-1 text-[12px] font-extrabold text-ink">{value}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="grid min-h-52 place-items-center rounded-[22px] border border-dashed border-line bg-white p-8 text-center"><div><Target className="mx-auto h-7 w-7 text-electric-deep" /><p className="mt-3 text-[13px] font-bold text-steel">{text}</p></div></div>;
}
