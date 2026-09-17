"use client";

import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useState, type FormEvent } from "react";

export function LeadCreateForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [form, setForm] = useState({ type: "beratung", name: "", email: "", phone: "", topic: "", region: "", preferredChannel: "", preferredTime: "", message: "" });
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/portal/leads", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form), signal: AbortSignal.timeout(20000) });
      const body = await response.json() as { ok: boolean; id?: number; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Der Lead konnte nicht gespeichert werden.");
      setSavedId(body.id ?? null);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Verbindung fehlgeschlagen.");
    } finally { setBusy(false); }
  }

  if (savedId !== null) return <div className="space-y-4"><p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">Lead #{savedId} wurde angelegt.</p><Link href={`/portal/leads/${savedId}`} className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-[14px] font-semibold text-white">Lead öffnen</Link></div>;

  return <form onSubmit={submit} className="space-y-5">
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="label">Art<select className="field" value={form.type} onChange={(event) => set("type", event.target.value)}><option value="beratung">Beratung</option><option value="termin">Termin</option><option value="tarifcheck">Tarifcheck</option><option value="kontakt">Kontakt</option></select></label>
      <label className="label">Name<input required maxLength={120} className="field" value={form.name} onChange={(event) => set("name", event.target.value)} /></label>
      <label className="label">E-Mail<input required type="email" maxLength={200} className="field" value={form.email} onChange={(event) => set("email", event.target.value)} /></label>
      <label className="label">Telefon<input type="tel" maxLength={40} className="field" value={form.phone} onChange={(event) => set("phone", event.target.value)} /></label>
      <label className="label">Thema<input maxLength={1000} className="field" value={form.topic} onChange={(event) => set("topic", event.target.value)} /></label>
      <label className="label">Region<input maxLength={80} className="field" value={form.region} onChange={(event) => set("region", event.target.value)} /></label>
      <label className="label">Bevorzugter Kanal<select className="field" value={form.preferredChannel} onChange={(event) => set("preferredChannel", event.target.value)}><option value="">Nicht angegeben</option><option value="telefon">Telefon</option><option value="whatsapp">WhatsApp</option><option value="email">E-Mail</option></select></label>
      <label className="label">Bevorzugte Zeit<input maxLength={120} className="field" value={form.preferredTime} onChange={(event) => set("preferredTime", event.target.value)} /></label>
    </div>
    <label className="label">Nachricht<textarea rows={5} maxLength={2000} className="field" value={form.message} onChange={(event) => set("message", event.target.value)} /></label>
    <div className="flex flex-wrap gap-3"><button type="submit" disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-semibold text-white hover:bg-electric disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lead speichern</button><Link href="/portal/leads" className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-white px-5 text-[14px] font-semibold"><ArrowLeft className="h-4 w-4" /> Zurück</Link></div>
  </form>;
}