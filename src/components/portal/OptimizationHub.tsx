"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote, CheckCircle2, ClipboardList, Copy, ExternalLink, FileText, LoaderCircle,
  RefreshCcw, Send, Sparkles, Target, UsersRound, WalletCards,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Card } from "@/components/portal/ui";

type Stats = {
  active_subscriptions: number;
  mrr_cents: number;
  open_requests: number;
  need_offers: number;
  financing_requests: number;
  reviews_due: number;
};

type SubscriptionRow = {
  id: number;
  public_token: string;
  customer_name: string;
  email: string;
  phone: string | null;
  status: string;
  billing_status: string;
  price_cents: number;
  owner_employee_id: number | null;
  owner_name: string | null;
  customer_label: string | null;
  next_review_at: string | null;
  created_at: string;
  request_count: number;
  open_request_count: number;
};

type OfferSummary = {
  id: number;
  rank: number;
  title: string;
  status: string;
  monthly_cents: number | null;
  estimated_savings_cents: number | null;
};

type RequestRow = {
  id: number;
  subscription_id: number;
  customer_name: string;
  public_token: string;
  request_type: string;
  status: string;
  priority: string;
  title: string;
  description: string;
  financing_wanted: boolean;
  assigned_employee_id: number | null;
  assignee_name: string | null;
  created_at: string;
  updated_at: string;
  offer_count: number;
  sent_offer_count: number;
  offers: OfferSummary[];
};

type DocumentRow = {
  id: number;
  subscription_id: number;
  request_id: number | null;
  customer_name: string;
  request_title: string | null;
  category: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
};

type Employee = { id: number; name: string };
type Provider = { id: number; name: string; category: string };

type Props = {
  stats: Stats;
  subscriptions: SubscriptionRow[];
  requests: RequestRow[];
  documents: DocumentRow[];
  employees: Employee[];
  providers: Provider[];
  isAdmin: boolean;
  typeLabels: Record<string, string>;
  statusLabels: Record<string, string>;
};

const STATUS_OPTIONS = [
  ["new", "Neu"], ["qualified", "Geprüft"], ["collecting_docs", "Unterlagen fehlen"],
  ["market_scan", "Angebote prüfen"], ["offers_ready", "Vergleich vorbereiten"], ["waiting_customer", "Kundenentscheidung"],
  ["accepted", "Angebot gewählt"], ["implementation", "Umsetzung"], ["done", "Erledigt"],
  ["paused", "Pausiert"], ["canceled", "Abgebrochen"],
] as const;

function euro(cents: number | null | undefined) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}
function date(value: string | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function cents(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").replace(",", ".").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
}

export function OptimizationHub({ stats, subscriptions, requests, documents, employees, providers, isAdmin, typeLabels, statusLabels }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function patchRequest(id: number, payload: Record<string, unknown>) {
    setBusy("request-" + id);
    setNotice(null);
    try {
      const response = await fetch("/api/portal/optimierung/requests/" + id, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Änderung fehlgeschlagen.");
      router.refresh();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Änderung fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }

  async function saveOffer(requestId: number, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("offer-" + requestId);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const highlights = String(form.get("highlights") ?? "").split("\n").map((value) => value.trim()).filter(Boolean).slice(0, 8);
    const payload = {
      rank: Number(form.get("rank") ?? 1),
      providerId: form.get("providerId") ? Number(form.get("providerId")) : null,
      title: String(form.get("title") ?? ""),
      monthlyCents: cents(form.get("monthly")),
      oneTimeCents: cents(form.get("oneTime")),
      estimatedSavingsCents: cents(form.get("savings")),
      termMonths: form.get("termMonths") ? Number(form.get("termMonths")) : null,
      highlights,
      limitations: String(form.get("limitations") ?? ""),
      externalReference: String(form.get("externalReference") ?? ""),
      sendNow: form.get("sendNow") === "on",
    };
    try {
      const response = await fetch("/api/portal/optimierung/requests/" + requestId + "/offers", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Angebot konnte nicht gespeichert werden.");
      setNotice(payload.sendNow ? "Angebot gespeichert und für den Kunden freigegeben." : "Angebotsentwurf gespeichert.");
      router.refresh();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Angebot konnte nicht gespeichert werden.");
    } finally {
      setBusy(null);
    }
  }

  async function patchSubscription(id: number, payload: Record<string, unknown>) {
    setBusy("subscription-" + id);
    setNotice(null);
    try {
      const response = await fetch("/api/portal/optimierung/subscriptions/" + id, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Abo konnte nicht geändert werden.");
      router.refresh();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Abo konnte nicht geändert werden.");
    } finally {
      setBusy(null);
    }
  }

  async function copyCustomerLink(token: string) {
    const link = window.location.origin + "/mein-tarifwerk/" + token;
    try {
      await navigator.clipboard.writeText(link);
      setNotice("Kundenlink kopiert.");
    } catch {
      setNotice(link);
    }
  }

  const statsCards = [
    { label: "Aktive Abos", value: String(stats.active_subscriptions), icon: UsersRound },
    { label: "Monatlicher Abo-Umsatz", value: euro(stats.mrr_cents), icon: WalletCards },
    { label: "Offene Vorgänge", value: String(stats.open_requests), icon: ClipboardList },
    { label: "Vergleiche unvollständig", value: String(stats.need_offers), icon: Sparkles },
    { label: "Finanzierung gewünscht", value: String(stats.financing_requests), icon: Banknote },
    { label: "Checks fällig", value: String(stats.reviews_due), icon: RefreshCcw },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-electric-soft">Recurring Customer Engine</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Optimierung+</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-silver">Abos, Vertragschecks, Kundenwünsche, Projektanfragen, Finanzierungskoordination und der 3er-Angebotsvergleich in einem Arbeitsbereich.</p>
        </div>
        <Link href="/optimieren" target="_blank" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white hover:bg-white/[0.08]">Produktseite <ExternalLink className="h-4 w-4" /></Link>
      </div>

      {notice && <div role="status" className="rounded-2xl border border-electric/20 bg-electric/10 px-5 py-4 text-sm text-slate-100">{notice}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {statsCards.map((item) => {
          const Icon = item.icon;
          return <Card key={item.label} className="p-4 sm:p-4"><Icon className="h-4 w-4 text-electric-soft" /><p className="mt-4 text-2xl font-extrabold">{item.value}</p><p className="mt-1 text-[11px] leading-4 text-silver">{item.label}</p></Card>;
        })}
      </div>

      <Card>
        <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-electric-soft">Arbeitsqueue</p><h2 className="mt-1 text-xl font-extrabold">Wünsche & Optimierungsvorgänge</h2></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-silver">{requests.length} sichtbar</span></div>
        <div className="mt-5 space-y-4">
          {requests.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-silver">Noch keine Vorgänge.</p>}
          {requests.map((item) => (
            <details key={item.id} className="group rounded-2xl border border-white/10 bg-white/[0.035]">
              <summary className="cursor-pointer list-none p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-extrabold uppercase tracking-wider text-electric-soft">{typeLabels[item.request_type] ?? item.request_type}</span>{item.financing_wanted && <span className="rounded-full bg-champagne/10 px-2 py-1 text-[10px] font-bold text-champagne-soft">Finanzierung</span>}</div><h3 className="mt-1 truncate text-base font-extrabold text-white">{item.title}</h3><p className="mt-1 text-xs text-silver">{item.customer_name} · {item.assignee_name || "nicht zugewiesen"} · aktualisiert {date(item.updated_at)}</p></div>
                  <div className="flex items-center gap-2"><span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-200">{statusLabels[item.status] ?? item.status}</span><span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-silver">{item.offer_count}/3 Angebote</span></div>
                </div>
              </summary>
              <div className="border-t border-white/8 p-4 sm:p-5">
                {item.description && <p className="mb-5 rounded-xl bg-black/10 p-4 text-sm leading-6 text-slate-300">{item.description}</p>}
                <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-silver">Status</label>
                      <select value={item.status} disabled={busy === "request-" + item.id} onChange={(event) => patchRequest(item.id, { status: event.target.value })} className="field mt-2 min-h-11 bg-slate-950 text-white">
                        {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-silver">Bearbeiter</label>
                      <select value={item.assigned_employee_id ?? ""} disabled={busy === "request-" + item.id} onChange={(event) => patchRequest(item.id, { assignedEmployeeId: event.target.value ? Number(event.target.value) : null })} className="field mt-2 min-h-11 bg-slate-950 text-white">
                        <option value="">Nicht zugewiesen</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-silver">Vorhandene Angebote</p>
                      <div className="mt-2 space-y-2">
                        {item.offers.length === 0 && <p className="text-xs text-slate-500">Noch kein Angebotsentwurf.</p>}
                        {item.offers.map((offer) => <div key={offer.id} className="rounded-xl border border-white/8 bg-black/10 p-3"><div className="flex justify-between gap-3"><p className="text-xs font-bold">#{offer.rank} {offer.title}</p><span className="text-[10px] uppercase text-silver">{offer.status}</span></div><p className="mt-1 text-[11px] text-silver">{euro(offer.monthly_cents)} mtl. · Ersparnis {euro(offer.estimated_savings_cents)}</p></div>)}
                      </div>
                    </div>
                    <button type="button" onClick={() => copyCustomerLink(item.public_token)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-slate-200"><Copy className="h-3.5 w-3.5" /> Kundenlink kopieren</button>
                  </div>

                  <form onSubmit={(event) => saveOffer(item.id, event)} className="rounded-2xl border border-electric/15 bg-electric/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wider text-electric-soft">3er-Vergleich</p><h4 className="mt-1 font-extrabold">Angebot anlegen / Rang ersetzen</h4></div><Target className="h-5 w-5 text-electric-soft" /></div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <label className="text-xs font-bold text-silver">Position<select name="rank" className="field mt-1.5 min-h-10 bg-slate-950 text-white"><option value="1">Option 1</option><option value="2">Option 2</option><option value="3">Option 3</option></select></label>
                      <label className="text-xs font-bold text-silver">Partner<select name="providerId" className="field mt-1.5 min-h-10 bg-slate-950 text-white"><option value="">Ohne Zuordnung</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name} · {provider.category}</option>)}</select></label>
                      <label className="text-xs font-bold text-silver md:col-span-2">Angebotstitel<input name="title" required maxLength={180} className="field mt-1.5 min-h-10 bg-white text-ink" placeholder="z. B. Tarif A / Solarlösung Premium" /></label>
                      <label className="text-xs font-bold text-silver">Monatlich €<input name="monthly" inputMode="decimal" className="field mt-1.5 min-h-10 bg-white text-ink" placeholder="39,99" /></label>
                      <label className="text-xs font-bold text-silver">Einmalig €<input name="oneTime" inputMode="decimal" className="field mt-1.5 min-h-10 bg-white text-ink" placeholder="0,00" /></label>
                      <label className="text-xs font-bold text-silver">Potenzielle Ersparnis €<input name="savings" inputMode="decimal" className="field mt-1.5 min-h-10 bg-white text-ink" placeholder="120,00" /></label>
                      <label className="text-xs font-bold text-silver">Laufzeit Monate<input name="termMonths" type="number" min="0" max="240" className="field mt-1.5 min-h-10 bg-white text-ink" placeholder="24" /></label>
                      <label className="text-xs font-bold text-silver md:col-span-2">Highlights · eine Zeile pro Punkt<textarea name="highlights" rows={3} className="field mt-1.5 bg-white text-ink" placeholder={"Preisgarantie\nMehr Leistung\nPassend zum Bedarf"} /></label>
                      <label className="text-xs font-bold text-silver md:col-span-2">Einschränkungen / Hinweise<textarea name="limitations" rows={2} className="field mt-1.5 bg-white text-ink" /></label>
                      <label className="text-xs font-bold text-silver md:col-span-2">Externe Referenz<input name="externalReference" maxLength={500} className="field mt-1.5 min-h-10 bg-white text-ink" placeholder="Angebotsnummer oder interne Referenz" /></label>
                    </div>
                    <label className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 p-3 text-xs text-slate-300"><input name="sendNow" type="checkbox" className="mt-0.5 h-4 w-4 accent-blue-500" /><span>Direkt für den Kunden freigeben. Vor dem Senden Preise, Voraussetzungen und Einschränkungen vollständig prüfen.</span></label>
                    <button disabled={busy === "offer-" + item.id} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-electric px-4 text-xs font-extrabold text-white">{busy === "offer-" + item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Speichern</button>
                  </form>
                </div>
              </div>
            </details>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-electric-soft">Abos</p><h2 className="mt-1 text-xl font-extrabold">Kunden & Billing</h2></div><span className="text-xs text-silver">{subscriptions.length}</span></div>
          <div className="mt-4 max-h-[620px] space-y-3 overflow-y-auto pr-1">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="rounded-2xl border border-white/9 bg-white/[0.035] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-extrabold">{sub.customer_name}</p><p className="mt-1 text-xs text-silver">{sub.email} · {sub.owner_name || "ohne Owner"}</p></div><div className="text-right"><p className="text-xs font-bold text-white">{sub.status}</p><p className="text-[11px] text-silver">{sub.billing_status}</p></div></div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-silver"><span>{sub.open_request_count} offen</span><span>·</span><span>{sub.request_count} gesamt</span><span>·</span><span>Check {date(sub.next_review_at)}</span></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => copyCustomerLink(sub.public_token)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[11px] font-bold"><Copy className="h-3 w-3" /> Link</button>
                  {isAdmin && sub.billing_status === "pending_manual" && <button disabled={busy === "subscription-" + sub.id} onClick={() => patchSubscription(sub.id, { billingStatus: "active", status: "active", nextReviewAt: new Date(Date.now() + 30 * 86400000).toISOString() })} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-500/15 px-2.5 text-[11px] font-bold text-emerald-200"><CheckCircle2 className="h-3 w-3" /> manuell aktivieren</button>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-electric-soft">Dokumente</p><h2 className="mt-1 text-xl font-extrabold">Vertrags- & Projektakte</h2></div><FileText className="h-5 w-5 text-electric-soft" /></div>
          <div className="mt-4 max-h-[620px] divide-y divide-white/8 overflow-y-auto pr-1">
            {documents.length === 0 && <p className="py-6 text-sm text-silver">Noch keine Dokumente.</p>}
            {documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{document.filename}</p><p className="mt-1 truncate text-[11px] text-silver">{document.customer_name}{document.request_title ? " · " + document.request_title : ""} · {document.category} · {Math.max(1, Math.round(document.size_bytes / 1024))} KB</p></div>
                <a href={"/api/portal/optimierung/documents/" + document.id} target="_blank" className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-bold">Öffnen</a>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
