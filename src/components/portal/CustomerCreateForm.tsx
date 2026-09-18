"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

export function CustomerCreateForm() {
  const router = useRouter();
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"private" | "business">("private");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/portal/enterprise/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          firstName: data.get("firstName"),
          lastName: data.get("lastName"),
          companyName: data.get("companyName"),
          email: data.get("email"),
          phone: data.get("phone"),
          postalCode: data.get("postalCode"),
          city: data.get("city"),
          preferredChannel: data.get("preferredChannel"),
        }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json() as { ok: boolean; error?: string; customer?: { id: number } };
      if (!response.ok || !json.ok || !json.customer) throw new Error(json.error ?? "Speichern fehlgeschlagen.");
      router.push(`/portal/kunden/${json.customer.id}`);
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Speichern fehlgeschlagen.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label">Kundentyp
          <select className="field" value={type} onChange={(e) => setType(e.target.value as "private" | "business")}>
            <option value="private">Privatkunde</option>
            <option value="business">Geschäftskunde</option>
          </select>
        </label>
        {type === "business" && <label className="label">Firmenname<input name="companyName" required maxLength={180} className="field" /></label>}
        <label className="label">Vorname<input name="firstName" required={type === "private"} maxLength={120} className="field" /></label>
        <label className="label">Nachname<input name="lastName" maxLength={120} className="field" /></label>
        <label className="label">E-Mail<input name="email" type="email" maxLength={200} className="field" /></label>
        <label className="label">Telefon<input name="phone" type="tel" maxLength={40} className="field" /></label>
        <label className="label">PLZ<input name="postalCode" maxLength={20} className="field" /></label>
        <label className="label">Ort<input name="city" maxLength={120} className="field" /></label>
        <label className="label">Bevorzugter Kanal
          <select name="preferredChannel" className="field">
            <option value="">Nicht festgelegt</option>
            <option value="telefon">Telefon</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">E-Mail</option>
          </select>
        </label>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p>}
      <button disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-semibold text-white hover:bg-electric disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Kundenakte anlegen
      </button>
    </form>
  );
}
