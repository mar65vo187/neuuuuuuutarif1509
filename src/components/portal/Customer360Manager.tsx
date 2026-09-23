"use client";

import { CheckCircle2, Clock3, Loader2, MessageSquarePlus, Plus, Save, Sparkles, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatBerlinDateTimeInput, parseBerlinDateTimeInput } from "@/lib/portal-date-time";

type Product = {
  id: number;
  name: string;
  category: string;
  providerName: string;
};

type Opportunity = {
  id: number;
  productId: number | null;
  topic: string;
  status: string;
  priority: string;
  note: string;
  nextReviewAt: string | null;
  productName: string | null;
  productCategory: string | null;
  providerName: string | null;
};

type Profile = {
  lifecycleStage: string;
  relationshipStatus: string;
  riskLevel: string;
  nextReviewAt: string | null;
  note: string;
} | null;

const ACTIVITY_TYPES = [
  ["call", "Anruf"],
  ["whatsapp", "WhatsApp"],
  ["email", "E-Mail"],
  ["meeting", "Termin"],
  ["review", "Bestandscheck"],
  ["note", "Interne Notiz"],
] as const;

const STATUS_LABELS: Record<string, string> = {
  open: "Offen",
  qualified: "Qualifiziert",
  won: "Gewonnen",
  lost: "Verloren",
  later: "Später prüfen",
};

export function Customer360Manager({
  customerId,
  products,
  opportunities,
  profile,
}: {
  customerId: number;
  products: Product[];
  opportunities: Opportunity[];
  profile: Profile;
}) {
  const router = useRouter();
  const saving = useRef(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activityType, setActivityType] = useState("call");
  const [direction, setDirection] = useState("outbound");
  const [outcome, setOutcome] = useState("");
  const [activityNote, setActivityNote] = useState("");
  const [activityNext, setActivityNext] = useState("");

  const [topic, setTopic] = useState("");
  const [productId, setProductId] = useState("");
  const [opportunityPriority, setOpportunityPriority] = useState("normal");
  const [opportunityNote, setOpportunityNote] = useState("");
  const [opportunityNext, setOpportunityNext] = useState("");

  const [lifecycleStage, setLifecycleStage] = useState(profile?.lifecycleStage ?? "active");
  const [relationshipStatus, setRelationshipStatus] = useState(profile?.relationshipStatus ?? "new");
  const [riskLevel, setRiskLevel] = useState(profile?.riskLevel ?? "normal");
  const [nextReviewAt, setNextReviewAt] = useState(formatBerlinDateTimeInput(profile?.nextReviewAt));
  const [profileNote, setProfileNote] = useState(profile?.note ?? "");

  async function request(url: string, method: "POST" | "PATCH", body: Record<string, unknown> | (() => Record<string, unknown>), key: string) {
    if (saving.current) return null;
    saving.current = true;
    setBusy(key);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(typeof body === "function" ? body() : body),
        signal: AbortSignal.timeout(15000),
      });
      if (response.status === 401) {
        window.location.replace("/portal/login?next=" + encodeURIComponent("/portal/kunden/" + customerId));
        return null;
      }
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Speichern fehlgeschlagen.");
      return json;
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Speichern fehlgeschlagen.");
      return null;
    } finally {
      saving.current = false;
      setBusy("");
    }
  }

  async function addActivity() {
    const result = await request(
      "/api/portal/enterprise/customers/" + customerId + "/activities",
      "POST",
      () => ({
        type: activityType,
        direction: activityType === "note" ? "internal" : direction,
        outcome: outcome.trim(),
        note: activityNote.trim(),
        nextActionAt: parseBerlinDateTimeInput(activityNext),
      }),
      "activity",
    );
    if (!result) return;
    setOutcome("");
    setActivityNote("");
    setActivityNext("");
    setSuccess("Aktivität gespeichert" + (activityNext ? " und Wiedervorlage angelegt." : "."));
    router.refresh();
  }

  async function addOpportunity() {
    const result = await request(
      "/api/portal/enterprise/customers/" + customerId + "/opportunities",
      "POST",
      () => ({
        productId: productId ? Number(productId) : null,
        topic: topic.trim(),
        priority: opportunityPriority,
        status: "open",
        source: "customer_360",
        note: opportunityNote.trim(),
        nextReviewAt: parseBerlinDateTimeInput(opportunityNext),
      }),
      "opportunity",
    );
    if (!result) return;
    setTopic("");
    setProductId("");
    setOpportunityPriority("normal");
    setOpportunityNote("");
    setOpportunityNext("");
    setSuccess("Opportunity wurde angelegt.");
    router.refresh();
  }

  async function updateOpportunity(opportunityId: number, status: string) {
    const result = await request(
      "/api/portal/enterprise/customers/" + customerId + "/opportunities/" + opportunityId,
      "PATCH",
      { status },
      "opportunity:" + opportunityId,
    );
    if (!result) return;
    setSuccess("Opportunity wurde aktualisiert.");
    router.refresh();
  }

  async function saveProfile() {
    const result = await request(
      "/api/portal/enterprise/customers/" + customerId + "/crm",
      "PATCH",
      () => ({
        lifecycleStage,
        relationshipStatus,
        riskLevel,
        nextReviewAt: nextReviewAt === formatBerlinDateTimeInput(profile?.nextReviewAt)
          ? profile?.nextReviewAt ?? null
          : parseBerlinDateTimeInput(nextReviewAt),
        note: profileNote.trim(),
      }),
      "profile",
    );
    if (!result) return;
    setSuccess("Customer-360-Profil wurde gespeichert.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {(error || success) && (
        <div className={"rounded-xl border px-4 py-3 text-[12.5px] " + (error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800")} role={error ? "alert" : "status"}>
          {error || success}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-[22px] border border-line bg-white p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-electric-soft"><MessageSquarePlus className="h-4 w-4" /></span>
            <div><h3 className="text-[14px] font-extrabold">Kontakt dokumentieren</h3><p className="mt-0.5 text-[11.5px] text-steel">Kontakt + Ergebnis + nächste Aktion in einem Schritt.</p></div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="label">Kontaktart
              <select className="field" value={activityType} onChange={(event) => setActivityType(event.target.value)}>
                {ACTIVITY_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            {activityType !== "note" && <label className="label">Richtung
              <select className="field" value={direction} onChange={(event) => setDirection(event.target.value)}>
                <option value="outbound">Ausgehend</option>
                <option value="inbound">Eingehend</option>
              </select>
            </label>}
            <label className="label sm:col-span-2">Ergebnis
              <input className="field" maxLength={120} value={outcome} onChange={(event) => setOutcome(event.target.value)} placeholder="z. B. zufrieden, Rückruf gewünscht, Bedarf offen" />
            </label>
            <label className="label sm:col-span-2">Notiz
              <textarea className="field" rows={3} maxLength={3000} value={activityNote} onChange={(event) => setActivityNote(event.target.value)} placeholder="Was wurde besprochen?" />
            </label>
            <label className="label sm:col-span-2">Nächste Aktion (Berlin)
              <div className="relative">
                <Clock3 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
                <input type="datetime-local" className="field pl-10" value={activityNext} onChange={(event) => setActivityNext(event.target.value)} />
              </div>
              <span className="mt-1 block text-[10.5px] font-normal text-steel">Wenn gesetzt, wird automatisch eine Kunden-Wiedervorlage erstellt.</span>
            </label>
          </div>

          <button type="button" disabled={busy !== "" || (activityType === "note" && !activityNote.trim())} onClick={addActivity} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 text-[12.5px] font-bold text-white hover:bg-electric disabled:opacity-50">
            {busy === "activity" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Aktivität speichern
          </button>
        </section>

        <section className="rounded-[22px] border border-electric/15 bg-slate-900 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-electric text-white"><Target className="h-4 w-4" /></span>
            <div><h3 className="text-[14px] font-extrabold">Opportunity erfassen</h3><p className="mt-0.5 text-[11.5px] text-steel">Nur tatsächlichen Bedarf oder konkretes Folgepotenzial dokumentieren.</p></div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="label sm:col-span-2">Thema / Bedarf
              <input className="field" maxLength={180} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="z. B. Glasfaser am neuen Standort" />
            </label>
            <label className="label">Konkretes Produkt
              <select className="field" value={productId} onChange={(event) => setProductId(event.target.value)}>
                <option value="">Noch offen</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.category} · {product.providerName} · {product.name}</option>)}
              </select>
            </label>
            <label className="label">Priorität
              <select className="field" value={opportunityPriority} onChange={(event) => setOpportunityPriority(event.target.value)}>
                <option value="low">Niedrig</option>
                <option value="normal">Normal</option>
                <option value="high">Hoch</option>
                <option value="critical">Kritisch</option>
              </select>
            </label>
            <label className="label sm:col-span-2">Prüftermin (Berlin)
              <input type="datetime-local" className="field" value={opportunityNext} onChange={(event) => setOpportunityNext(event.target.value)} />
            </label>
            <label className="label sm:col-span-2">Kontext
              <textarea className="field" rows={3} maxLength={2000} value={opportunityNote} onChange={(event) => setOpportunityNote(event.target.value)} placeholder="Warum besteht Potenzial? Was muss vorher geklärt werden?" />
            </label>
          </div>

          <button type="button" disabled={busy !== "" || topic.trim().length < 2} onClick={addOpportunity} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-electric px-4 text-[12.5px] font-bold text-white hover:bg-electric-deep disabled:opacity-50">
            {busy === "opportunity" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Opportunity anlegen
          </button>
        </section>
      </div>

      <section className="rounded-[22px] border border-line bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-electric-deep" /><h3 className="text-[14px] font-extrabold">Customer-360-Steuerung</h3></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="label">Lifecycle
            <select className="field" value={lifecycleStage} onChange={(event) => setLifecycleStage(event.target.value)}>
              <option value="prospect">Potenzialkunde</option>
              <option value="active">Aktiv</option>
              <option value="retention">Bestandspflege</option>
              <option value="dormant">Ruhend</option>
              <option value="closed">Beendet</option>
            </select>
          </label>
          <label className="label">Beziehungsstatus
            <select className="field" value={relationshipStatus} onChange={(event) => setRelationshipStatus(event.target.value)}>
              <option value="new">Neu</option>
              <option value="developing">Im Aufbau</option>
              <option value="established">Etabliert</option>
              <option value="at_risk">Gefährdet</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </label>
          <label className="label">Manuelles Risiko
            <select className="field" value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)}>
              <option value="low">Niedrig</option>
              <option value="normal">Normal</option>
              <option value="high">Hoch</option>
              <option value="critical">Kritisch</option>
            </select>
          </label>
          <label className="label">Nächster Bestandscheck (Berlin)
            <input type="datetime-local" className="field" value={nextReviewAt} onChange={(event) => setNextReviewAt(event.target.value)} />
          </label>
        </div>
        <label className="mt-3 block">
          <span className="label">Beziehungsnotiz</span>
          <textarea className="field" rows={2} maxLength={3000} value={profileNote} onChange={(event) => setProfileNote(event.target.value)} placeholder="z. B. bevorzugt abends Kontakt, Entscheidung gemeinsam mit Partner…" />
        </label>
        <button type="button" disabled={busy !== ""} onClick={saveProfile} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[12px] font-bold hover:border-electric/30 hover:text-electric-deep disabled:opacity-50">
          {busy === "profile" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Customer-360-Profil speichern
        </button>
      </section>

      {opportunities.length > 0 && (
        <section className="rounded-[22px] border border-line bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><h3 className="text-[14px] font-extrabold">Offene & historische Opportunities</h3><span className="text-[11px] font-bold text-steel">{opportunities.length}</span></div>
          <div className="mt-3 space-y-2">
            {opportunities.map((row) => (
              <div key={row.id} className="rounded-xl border border-line bg-paper/50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-extrabold">{row.topic}</p>
                    <p className="mt-0.5 text-[10.5px] text-steel">{[row.productCategory, row.providerName, row.productName].filter(Boolean).join(" · ") || "Produkt noch offen"} · {STATUS_LABELS[row.status] ?? row.status} · {row.priority}</p>
                    {row.note && <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-700">{row.note}</p>}
                  </div>
                  <select
                    aria-label={"Status für " + row.topic}
                    disabled={busy !== ""}
                    value={row.status}
                    onChange={(event) => updateOpportunity(row.id, event.target.value)}
                    className="h-9 rounded-lg border border-line bg-white px-2 text-[11px] font-bold"
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                {row.nextReviewAt && <p className="mt-2 inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-steel"><Clock3 className="h-3 w-3" /> Prüfen: {new Date(row.nextReviewAt).toLocaleString("de-DE")}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
