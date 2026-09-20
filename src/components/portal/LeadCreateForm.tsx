"use client";

import Link from "next/link";
import { AlarmClock, ArrowLeft, Flame, Loader2, PackagePlus, Save, Tags } from "lucide-react";
import { useState, type FormEvent } from "react";
import { LEAD_CONTACT_OUTCOME_LABELS, LEAD_PRIORITY_LABELS, LEAD_STATUS_LABELS, SERVICES } from "@/lib/content";
import { DuplicateIdentityCheck } from "@/components/portal/DuplicateIdentityCheck";

type ProductOption = {
  id: number;
  name: string;
  category: string;
  providerName: string;
};

const TOPIC_OPTIONS = [...new Set(SERVICES.map((service) => service.name))];

export function LeadCreateForm({ products }: { products: ProductOption[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [form, setForm] = useState({
    type: "beratung",
    status: "neu",
    priority: "normal",
    contactOutcome: "open",
    name: "",
    email: "",
    phone: "",
    topic: "",
    region: "",
    preferredChannel: "",
    preferredTime: "",
    message: "",
    nextActionAt: "",
    tags: "",
    confirmedSlot: "",
    productRelation: "interest",
  });
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  function toggleTopic(topic: string) {
    setSelectedTopics((current) => current.includes(topic)
      ? current.filter((item) => item !== topic)
      : [...current, topic]);
  }

  function toggleProduct(productId: number) {
    setSelectedProductIds((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (form.status === "termin_bestaetigt" && !form.confirmedSlot.trim()) {
        throw new Error("Für einen terminierten Lead bitte eine Terminzeit eintragen.");
      }
      const topic = [...new Set([...selectedTopics, form.topic.trim()].filter(Boolean))].join(" · ");
      if (![form.name, form.email, form.phone, topic, form.message].some((value) => value.trim().length > 0)) {
        throw new Error("Bitte mindestens Name/Vorname, E-Mail, Telefon, einen Themenbereich oder eine Notiz eintragen.");
      }
      const payload = {
        ...form,
        topic,
        nextActionAt: form.nextActionAt ? new Date(form.nextActionAt).toISOString() : null,
        tags: [...new Set(form.tags.split(",").map((tag) => tag.trim()).filter(Boolean))].slice(0, 12),
        productSelections: selectedProductIds.map((productId) => ({
          productId,
          relation: form.productRelation,
        })),
      };
      const response = await fetch("/api/portal/leads", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
      const body = await response.json() as { ok: boolean; id?: number; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Der Lead konnte nicht gespeichert werden.");
      setSavedId(body.id ?? null);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Verbindung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  if (savedId !== null) {
    return (
      <div className="space-y-4">
        <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">Lead #{savedId} wurde angelegt und direkt in die CRM-Pipeline einsortiert.</p>
        <Link href={`/portal/leads/${savedId}`} className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-[14px] font-semibold text-white">Lead öffnen</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p>}

      <section>
        <div className="mb-4">
          <p className="text-[14px] font-extrabold text-ink">Kontaktdaten</p>
          <p className="mt-0.5 text-[12px] text-steel">Grunddaten des Leads und gewünschter Kontaktweg.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label">Art<select className="field" value={form.type} onChange={(event) => set("type", event.target.value)}><option value="beratung">Beratung</option><option value="termin">Termin</option><option value="tarifcheck">Tarifcheck</option><option value="kontakt">Kontakt</option></select></label>
          <label className="label">Name / Vorname <span className="font-normal text-steel">(optional)</span><input maxLength={120} className="field" value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Vorname reicht, Nachname kann später ergänzt werden" /></label>
          <label className="label">E-Mail <span className="font-normal text-steel">(optional)</span><input type="email" maxLength={200} className="field" value={form.email} onChange={(event) => set("email", event.target.value)} placeholder="Kann leer bleiben" /></label>
          <label className="label">Telefon <span className="font-normal text-steel">(optional)</span><input type="tel" maxLength={40} className="field" value={form.phone} onChange={(event) => set("phone", event.target.value)} placeholder="Kann leer bleiben" /></label>
          <label className="label">Region<input maxLength={80} className="field" value={form.region} onChange={(event) => set("region", event.target.value)} /></label>
          <label className="label">Bevorzugter Kanal<select className="field" value={form.preferredChannel} onChange={(event) => set("preferredChannel", event.target.value)}><option value="">Nicht angegeben</option><option value="telefon">Telefon</option><option value="whatsapp">WhatsApp</option><option value="email">E-Mail</option></select></label>
          <label className="label">Bevorzugte Zeit<input maxLength={120} className="field" value={form.preferredTime} onChange={(event) => set("preferredTime", event.target.value)} /></label>
        </div>
        <div className="mt-4">
          <DuplicateIdentityCheck name={form.name} email={form.email} phone={form.phone} />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-paper/60 p-4 sm:p-5">
        <div>
          <p className="text-[14px] font-extrabold text-ink">Themenbereiche</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-steel">Mehrere Bereiche gleichzeitig auswählen. So bleibt direkt sichtbar, wofür der Kunde Interesse hat.</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Themenbereiche auswählen">
          {TOPIC_OPTIONS.map((topic) => {
            const selected = selectedTopics.includes(topic);
            return (
              <button
                key={topic}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleTopic(topic)}
                className={`rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${selected ? "border-electric bg-electric text-white" : "border-line bg-white text-ink hover:border-electric/40"}`}
              >
                {selected ? "✓ " : ""}{topic}
              </button>
            );
          })}
        </div>
        <label className="label mt-4">Weitere Angabe zum Thema <span className="font-normal text-steel">(optional)</span>
          <input maxLength={1000} className="field" value={form.topic} onChange={(event) => set("topic", event.target.value)} placeholder="z. B. Sonderfall, Tarifname oder zusätzliche Info" />
        </label>
      </section>

      <section className="rounded-2xl border border-electric/15 bg-[linear-gradient(145deg,rgba(79,141,255,0.10),rgba(255,255,255,0.92))] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-electric-soft"><Flame className="h-4 w-4" /></span>
          <div>
            <p className="text-[14px] font-extrabold">Direkt einsortieren</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-steel">Status, Priorität und Wiedervorlage direkt beim Anlegen festlegen.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="label">Pipeline-Status
            <select className="field" value={form.status} onChange={(event) => set("status", event.target.value)}>
              {Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className="label">Priorität
            <select className="field" value={form.priority} onChange={(event) => set("priority", event.target.value)}>
              {Object.entries(LEAD_PRIORITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className="label">Gesprächsausgang
            <select className="field" value={form.contactOutcome} onChange={(event) => set("contactOutcome", event.target.value)}>
              {Object.entries(LEAD_CONTACT_OUTCOME_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className="label">Wiedervorlage
            <div className="relative">
              <AlarmClock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
              <input type="datetime-local" className="field pl-10" value={form.nextActionAt} onChange={(event) => set("nextActionAt", event.target.value)} />
            </div>
          </label>
          {form.status === "termin_bestaetigt" && (
            <label className="label sm:col-span-2">Termin
              <input className="field" maxLength={160} value={form.confirmedSlot} onChange={(event) => set("confirmedSlot", event.target.value)} placeholder="z. B. Dienstag, 18:30 Uhr · Video-Call" />
            </label>
          )}
          <label className="label sm:col-span-2">Tags
            <div className="relative">
              <Tags className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-steel" />
              <input className="field pl-10" value={form.tags} onChange={(event) => set("tags", event.target.value)} placeholder="z. B. Familie, Wechsel, Glasfaser, warm" maxLength={500} />
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-champagne/25 bg-champagne/10 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-champagne-soft"><PackagePlus className="h-4 w-4" /></span>
          <div>
            <p className="text-[14px] font-extrabold">Produkte direkt zuordnen</p>
            <p className="mt-0.5 text-[12px] text-steel">Optional mehrere Produkte gleichzeitig markieren. Standardmäßig werden sie als Interesse gespeichert.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[12px] font-bold text-ink">Produktauswahl</p>
              <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-semibold text-steel">{selectedProductIds.length} ausgewählt</span>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-line bg-white p-2">
              {products.length === 0 ? (
                <p className="p-3 text-[12.5px] text-steel">Noch keine aktiven Produkte hinterlegt.</p>
              ) : products.map((product) => {
                const selected = selectedProductIds.includes(product.id);
                return (
                  <label key={product.id} className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${selected ? "bg-electric/[0.08]" : "hover:bg-paper"}`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleProduct(product.id)}
                      className="mt-0.5 h-4 w-4 rounded border-line"
                    />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-bold text-ink">{product.name}</span>
                      <span className="block truncate text-[11px] text-steel">{product.category} · {product.providerName}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="label">Zuordnung für die ausgewählten Produkte
            <select className="field" value={form.productRelation} onChange={(event) => set("productRelation", event.target.value)} disabled={selectedProductIds.length === 0}>
              <option value="interest">Interesse</option>
              <option value="existing">Hat bereits</option>
              <option value="sold">Über TarifWerk abgeschlossen</option>
            </select>
          </label>
        </div>
      </section>

      <label className="label">Interne Ausgangsnotiz / Nachricht<textarea rows={5} maxLength={2000} className="field" value={form.message} onChange={(event) => set("message", event.target.value)} placeholder="Worum geht es, was wurde bereits besprochen, was ist wichtig?" /></label>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-semibold text-white hover:bg-electric disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lead speichern</button>
        <Link href="/portal/leads" className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-white px-5 text-[14px] font-semibold"><ArrowLeft className="h-4 w-4" /> Zurück</Link>
      </div>
    </form>
  );
}
