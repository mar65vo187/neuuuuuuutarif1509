"use client";

import { Loader2, Pencil, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Props = {
  customerId: number;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  postalCode: string | null;
  city: string | null;
  preferredChannel: string | null;
};

export function CustomerEditForm(props: Props) {
  const router = useRouter();
  const saving = useRef(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: props.firstName ?? "",
    lastName: props.lastName ?? "",
    companyName: props.companyName ?? "",
    email: props.email ?? "",
    phone: props.phone ?? "",
    postalCode: props.postalCode ?? "",
    city: props.city ?? "",
    preferredChannel: props.preferredChannel ?? "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/portal/enterprise/customers/${props.customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json() as { ok: boolean; error?: string };
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Speichern fehlgeschlagen.");
      setOpen(false);
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Speichern fehlgeschlagen.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-[11.5px] font-bold text-ink hover:border-electric/30 hover:text-electric-deep">
        <Pencil className="h-3.5 w-3.5" /> Stammdaten bearbeiten
      </button>
    );
  }

  return (
    <div className="mt-3 w-full basis-full rounded-2xl border border-line bg-paper/60 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label">Vorname<input className="field" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} maxLength={120} /></label>
        <label className="label">Nachname<input className="field" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} maxLength={120} /></label>
        <label className="label">Firma<input className="field" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} maxLength={180} /></label>
        <label className="label">Telefon<input className="field" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} /></label>
        <label className="label">E-Mail<input className="field" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={200} /></label>
        <label className="label">PLZ<input className="field" value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} maxLength={20} /></label>
        <label className="label">Ort<input className="field" value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={120} /></label>
        <label className="label">Bevorzugter Kanal
          <select className="field" value={form.preferredChannel} onChange={(e) => set("preferredChannel", e.target.value)}>
            <option value="">Nicht festgelegt</option>
            <option value="telefon">Telefon</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">E-Mail</option>
          </select>
        </label>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy} onClick={save} className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-4 text-[11.5px] font-bold text-white hover:bg-electric disabled:opacity-50">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Speichern
        </button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)} className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-4 text-[11.5px] font-bold text-steel">
          <X className="h-3.5 w-3.5" /> Abbrechen
        </button>
      </div>
    </div>
  );
}
