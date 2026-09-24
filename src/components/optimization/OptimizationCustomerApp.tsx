"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, CheckCircle2, CircleDollarSign, Clock3, FileText, Goal, LoaderCircle,
  Plus, RefreshCcw, ShieldCheck, UploadCloud, XCircle,
} from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

type Offer = {
  id: number;
  rank: number;
  title: string;
  monthly_cents: number | null;
  one_time_cents: number | null;
  estimated_savings_cents: number | null;
  term_months: number | null;
  highlights: string[];
  limitations: string;
  status: string;
};

type RequestRow = {
  id: number;
  request_type: string;
  status: string;
  priority: string;
  title: string;
  description: string;
  financing_wanted: boolean;
  target_date: string | null;
  created_at: string;
  updated_at: string;
  offers: Offer[];
};

type DocumentRow = {
  id: number;
  request_id: number | null;
  category: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
};

type Props = {
  token: string;
  subscription: {
    customer_name: string;
    email: string;
    status: string;
    billing_status: string;
    price_cents: number;
    next_review_at: string | null;
    started_at: string | null;
  };
  requests: RequestRow[];
  documents: DocumentRow[];
  typeLabels: Record<string, string>;
  statusLabels: Record<string, string>;
};

const REQUEST_TYPES = [
  ["goal", "Ziel, Traum oder Wunsch"],
  ["contract_review", "Vertrag prüfen & optimieren"],
  ["internet_mobile_tv", "Internet, Mobilfunk & TV"],
  ["energy", "Strom & Gas"],
  ["insurance", "Versicherungen"],
  ["solar_heatpump", "Solar & Wärmepumpe"],
  ["property", "Immobilien"],
  ["precious_metals", "Edelmetalle"],
  ["climate", "Klima"],
  ["security", "Sicherheit"],
  ["other", "Sonstiges"],
] as const;

function euro(cents: number | null | undefined) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function OptimizationCustomerApp({ token, subscription, requests, documents, typeLabels, statusLabels }: Props) {
  const router = useRouter();
  const [requestOpen, setRequestOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const submitting = useRef(false);
  const active = subscription.status === "active" && subscription.billing_status === "active";

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy("request");
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const budget = String(form.get("budget") ?? "").replace(",", ".").trim();
    const payload = {
      requestType: String(form.get("requestType") ?? "goal"),
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      financingWanted: form.get("financingWanted") === "on",
      budgetCents: budget ? Math.round(Number(budget) * 100) : null,
      targetDate: String(form.get("targetDate") ?? "") || null,
    };
    try {
      const response = await fetch("/api/optimierung/" + token + "/requests", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Vorgang konnte nicht angelegt werden.");
      event.currentTarget.reset();
      setRequestOpen(false);
      setMessage("Dein Wunsch ist eingegangen.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Bitte versuche es erneut.");
    } finally {
      submitting.current = false;
      setBusy(null);
    }
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy("upload");
    setMessage(null);
    try {
      const response = await fetch("/api/optimierung/" + token + "/documents", {
        method: "POST", body: new FormData(event.currentTarget),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Upload fehlgeschlagen.");
      event.currentTarget.reset();
      setUploadOpen(false);
      setMessage("Dokument sicher hochgeladen.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Bitte versuche es erneut.");
    } finally {
      submitting.current = false;
      setBusy(null);
    }
  }

  async function decide(offerId: number, decision: "accepted" | "rejected") {
    setBusy("offer-" + offerId);
    setMessage(null);
    try {
      const response = await fetch("/api/optimierung/" + token + "/offers/" + offerId + "/decision", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Entscheidung konnte nicht gespeichert werden.");
      setMessage(decision === "accepted" ? "Ausgewählt. TarifWerk übernimmt die nächsten Schritte." : "Angebot abgelehnt.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Bitte versuche es erneut.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_85%_0%,rgba(79,141,255,.24),transparent_35%),linear-gradient(145deg,#06101f,#081427_55%,#06101f)] text-white">
      <header className="border-b border-white/10 bg-black/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-8">
          <Link href="/" className="text-lg font-extrabold tracking-tight">TarifWerk <span className="text-electric-soft">Optimierung+</span></Link>
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-silver">1,99 € / Monat</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-6 sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-electric-soft">Dein Optimierungsbereich</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Hallo {subscription.customer_name}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-silver">Hier sammelst du Verträge, Wünsche und Projekte. TarifWerk hält jeden Vorgang mit Bearbeitungsstand und Angeboten an einem Ort.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" disabled={!active} onClick={() => setRequestOpen((value) => !value)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-electric px-4 py-2.5 text-sm font-bold disabled:opacity-45"><Plus className="h-4 w-4" /> Wunsch anlegen</button>
              <button type="button" disabled={!active} onClick={() => setUploadOpen((value) => !value)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-4 py-2.5 text-sm font-bold disabled:opacity-45"><UploadCloud className="h-4 w-4" /> Vertrag hochladen</button>
            </div>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-6">
            <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-emerald-300" /><h2 className="font-extrabold">Abo-Status</h2></div>
            <p className={"mt-4 text-2xl font-extrabold " + (active ? "text-emerald-300" : "text-amber-300")}>{active ? "Aktiv" : "Noch nicht aktiv"}</p>
            <dl className="mt-4 space-y-2 text-sm text-silver">
              <div className="flex justify-between gap-4"><dt>Preis</dt><dd className="font-bold text-white">{euro(subscription.price_cents)} / Monat</dd></div>
              <div className="flex justify-between gap-4"><dt>Nächster Check</dt><dd className="text-white">{formatDate(subscription.next_review_at)}</dd></div>
              <div className="flex justify-between gap-4"><dt>Vorgänge</dt><dd className="text-white">{requests.length}</dd></div>
            </dl>
            {!active && <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">Neue Wünsche und Uploads werden freigeschaltet, sobald die Zahlung als aktiv bestätigt ist.</p>}
          </div>
        </section>

        {message && <div role="status" className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-sm">{message}</div>}

        {requestOpen && active && (
          <form onSubmit={createRequest} className="mt-5 rounded-[26px] border border-electric/20 bg-electric/[0.06] p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">Neuen Wunsch oder Vorgang anlegen</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold">Bereich<select name="requestType" className="field mt-2 min-h-11 bg-white text-ink">{REQUEST_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-sm font-semibold">Zieltermin <span className="font-normal text-silver">(optional)</span><input name="targetDate" type="date" className="field mt-2 min-h-11 bg-white text-ink" /></label>
              <label className="text-sm font-semibold md:col-span-2">Kurz gesagt: Was möchtest du erreichen?<input name="title" required maxLength={180} className="field mt-2 min-h-11 bg-white text-ink" placeholder="z. B. Stromvertrag prüfen oder Solaranlage planen" /></label>
              <label className="text-sm font-semibold md:col-span-2">Details<textarea name="description" maxLength={5000} rows={4} className="field mt-2 bg-white text-ink" placeholder="Beschreibe Ausgangslage, Wünsche und wichtige Rahmenbedingungen." /></label>
              <label className="text-sm font-semibold">Budget in € <span className="font-normal text-silver">(optional)</span><input name="budget" inputMode="decimal" className="field mt-2 min-h-11 bg-white text-ink" placeholder="z. B. 25000" /></label>
              <label className="flex items-center gap-3 self-end rounded-xl border border-white/10 p-3 text-sm"><input name="financingWanted" type="checkbox" className="h-4 w-4 accent-blue-500" /> Finanzierungsmöglichkeiten mitprüfen</label>
            </div>
            <div className="mt-5 flex gap-3">
              <button disabled={busy === "request"} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-electric px-4 py-2.5 text-sm font-bold">{busy === "request" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Einreichen</button>
              <button type="button" onClick={() => setRequestOpen(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm">Abbrechen</button>
            </div>
          </form>
        )}

        {uploadOpen && active && (
          <form onSubmit={uploadDocument} className="mt-5 rounded-[26px] border border-white/10 bg-white/[0.05] p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">Vertrag oder Unterlage hochladen</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold">Zu Vorgang<select name="requestId" className="field mt-2 min-h-11 bg-white text-ink"><option value="">Allgemeine Vertragsakte</option>{requests.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
              <label className="text-sm font-semibold">Kategorie<select name="category" className="field mt-2 min-h-11 bg-white text-ink"><option value="contract">Vertrag</option><option value="invoice">Rechnung</option><option value="project">Projektunterlage</option><option value="financing">Finanzierungsunterlage</option><option value="other">Sonstiges</option></select></label>
              <label className="text-sm font-semibold md:col-span-2">Datei<input name="file" required type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="mt-2 block w-full rounded-xl border border-white/10 bg-white p-3 text-sm text-ink" /><span className="mt-1 block text-xs font-normal text-silver">PDF, JPG, PNG oder WEBP · maximal 8 MB</span></label>
            </div>
            <div className="mt-5 flex gap-3">
              <button disabled={busy === "upload"} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-electric px-4 py-2.5 text-sm font-bold">{busy === "upload" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} Hochladen</button>
              <button type="button" onClick={() => setUploadOpen(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm">Abbrechen</button>
            </div>
          </form>
        )}

        <section className="mt-9">
          <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-electric-soft">Deine Vorgänge</p><h2 className="mt-1 text-2xl font-extrabold">Alles im Blick</h2></div><RefreshCcw className="h-5 w-5 text-silver" /></div>
          <div className="mt-5 space-y-4">
            {requests.length === 0 && <div className="rounded-[24px] border border-dashed border-white/15 p-8 text-center text-sm text-silver"><Goal className="mx-auto mb-3 h-6 w-6" />Noch kein Wunsch angelegt.</div>}
            {requests.map((item) => (
              <article key={item.id} className="rounded-[26px] border border-white/10 bg-white/[0.045] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><p className="text-xs font-bold text-electric-soft">{typeLabels[item.request_type] ?? item.request_type}</p><h3 className="mt-1 text-xl font-extrabold">{item.title}</h3></div>
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold">{statusLabels[item.status] ?? item.status}</span>
                </div>
                {item.description && <p className="mt-3 text-sm leading-6 text-silver">{item.description}</p>}
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-silver">
                  <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> Aktualisiert {formatDate(item.updated_at)}</span>
                  {item.financing_wanted && <span className="inline-flex items-center gap-1.5"><CircleDollarSign className="h-3.5 w-3.5" /> Finanzierung mitprüfen</span>}
                </div>

                {item.offers.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-extrabold">Deine Optionen</h4>
                    <div className="mt-3 grid gap-3 lg:grid-cols-3">
                      {item.offers.map((offer) => (
                        <div key={offer.id} className={"rounded-2xl border p-4 " + (offer.status === "accepted" ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-black/10")}>
                          <div className="flex items-center justify-between gap-2"><span className="text-xs font-extrabold text-electric-soft">Option {offer.rank}</span>{offer.status === "accepted" && <CheckCircle2 className="h-4 w-4 text-emerald-300" />}</div>
                          <p className="mt-2 font-extrabold">{offer.title}</p>
                          <dl className="mt-3 space-y-1.5 text-xs text-silver">
                            <div className="flex justify-between gap-3"><dt>Monatlich</dt><dd className="font-bold text-white">{euro(offer.monthly_cents)}</dd></div>
                            <div className="flex justify-between gap-3"><dt>Einmalig</dt><dd className="text-white">{euro(offer.one_time_cents)}</dd></div>
                            <div className="flex justify-between gap-3"><dt>Potenzielle Ersparnis</dt><dd className="text-white">{euro(offer.estimated_savings_cents)}</dd></div>
                          </dl>
                          {offer.highlights?.length > 0 && <ul className="mt-3 space-y-1 text-xs text-slate-300">{offer.highlights.map((text) => <li key={text} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />{text}</li>)}</ul>}
                          {offer.limitations && <p className="mt-3 text-[11px] leading-5 text-slate-400">{offer.limitations}</p>}
                          {offer.status === "sent" && (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <button disabled={busy === "offer-" + offer.id} onClick={() => decide(offer.id, "accepted")} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 text-xs font-extrabold text-white"><CheckCircle2 className="h-3.5 w-3.5" /> Wählen</button>
                              <button disabled={busy === "offer-" + offer.id} onClick={() => decide(offer.id, "rejected")} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 text-xs font-bold"><XCircle className="h-3.5 w-3.5" /> Ablehnen</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="mt-9 rounded-[26px] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
          <div className="flex items-center gap-3"><FileText className="h-5 w-5 text-electric-soft" /><h2 className="text-lg font-extrabold">Dokumentenablage</h2></div>
          <div className="mt-4 divide-y divide-white/8">
            {documents.length === 0 && <p className="py-5 text-sm text-silver">Noch keine Unterlagen hochgeladen.</p>}
            {documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div className="min-w-0"><p className="truncate font-semibold">{document.filename}</p><p className="text-xs text-silver">{document.category} · {Math.max(1, Math.round(document.size_bytes / 1024))} KB</p></div>
                <a href={"/api/optimierung/" + token + "/documents/" + document.id} className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold">Öffnen</a>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-8 text-center text-xs leading-5 text-slate-500">Dein persönlicher Link dient als Zugangsschlüssel. Teile ihn nicht öffentlich. Bei Fragen: <Link href="/anfrage" className="text-slate-300 underline">TarifWerk kontaktieren</Link>.</p>
      </main>
    </div>
  );
}
