"use client";

import { Info, Loader2, Network, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { DuplicateIdentityCheck } from "@/components/portal/DuplicateIdentityCheck";

type ReferrerOption = { id: number; label: string; customerNumber: string };

export function CustomerCreateForm({ referrerOptions = [] }: { referrerOptions?: ReferrerOption[] }) {
  const router = useRouter();
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"private" | "business">("private");
  const [identity, setIdentity] = useState({ firstName: "", lastName: "", companyName: "", email: "", phone: "" });
  const duplicateName = useMemo(
    () => type === "business"
      ? identity.companyName
      : [identity.firstName, identity.lastName].filter(Boolean).join(" "),
    [identity.companyName, identity.firstName, identity.lastName, type],
  );
  const setIdentityField = (key: keyof typeof identity, value: string) => setIdentity((current) => ({ ...current, [key]: value }));

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
          referredByCustomerId: data.get("referredByCustomerId") ? Number(data.get("referredByCustomerId")) : undefined,
          referralRelationship: data.get("referralRelationship"),
          referralNote: data.get("referralNote"),
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
      <section>
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-electric-deep" />
          <div>
            <p className="text-[14px] font-extrabold">1. Kundendaten</p>
            <p className="text-[11.5px] text-steel">Nur die Daten eintragen, die du wirklich hast. Die Akte kann später ergänzt werden.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="label">Kundentyp
            <select className="field" value={type} onChange={(e) => setType(e.target.value as "private" | "business")}>
              <option value="private">Privatkunde</option>
              <option value="business">Geschäftskunde</option>
            </select>
          </label>
          {type === "business" && <label className="label">Firmenname<input name="companyName" required maxLength={180} className="field" value={identity.companyName} onChange={(event) => setIdentityField("companyName", event.target.value)} /></label>}
          <label className="label">Vorname<input name="firstName" required={type === "private"} maxLength={120} className="field" value={identity.firstName} onChange={(event) => setIdentityField("firstName", event.target.value)} /></label>
          <label className="label">Nachname<input name="lastName" maxLength={120} className="field" value={identity.lastName} onChange={(event) => setIdentityField("lastName", event.target.value)} /></label>
          <label className="label">E-Mail<input name="email" type="email" maxLength={200} className="field" value={identity.email} onChange={(event) => setIdentityField("email", event.target.value)} /></label>
          <label className="label">Telefon<input name="phone" type="tel" maxLength={40} className="field" value={identity.phone} onChange={(event) => setIdentityField("phone", event.target.value)} /></label>
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
        <div className="mt-4">
          <DuplicateIdentityCheck name={duplicateName} email={identity.email} phone={identity.phone} />
        </div>
      </section>

      <section className="rounded-2xl border border-electric/15 bg-electric/[0.05] p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-electric-deep shadow-sm"><Network className="h-4 w-4" /></span>
          <div>
            <p className="text-[14px] font-extrabold">2. Herkunft / Vitamin B</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-steel">Falls dieser Kunde von einem bestehenden Kunden empfohlen wurde, hier zuordnen. So bleibt die Herkunft dauerhaft nachvollziehbar.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="label sm:col-span-2">Empfohlen von
            <select name="referredByCustomerId" className="field">
              <option value="">Keine Kundenempfehlung / andere Quelle</option>
              {referrerOptions.map((option) => <option key={option.id} value={option.id}>{option.label} · {option.customerNumber}</option>)}
            </select>
          </label>
          <label className="label">Beziehung
            <select name="referralRelationship" className="field">
              <option value="">Nicht angegeben</option>
              <option value="familie">Familie</option>
              <option value="freund_bekannter">Freund / Bekannter</option>
              <option value="nachbar">Nachbar</option>
              <option value="kollege">Kollege / Arbeitskontakt</option>
              <option value="geschaeftskontakt">Geschäftskontakt</option>
              <option value="sonstiges">Sonstiges</option>
            </select>
          </label>
          <label className="label">Kurzer Herkunftshinweis
            <input name="referralNote" maxLength={1000} className="field" placeholder="z. B. Empfehlung nach PV-Beratung" />
          </label>
        </div>
      </section>

      <div className="flex items-start gap-2 rounded-xl bg-paper px-3.5 py-3 text-[11.5px] leading-relaxed text-steel">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-electric-deep" />
        <p>Nach dem Anlegen landest du direkt in der Kundenakte. Dort kannst du Auftrag, nächste Schritte und neue Empfehlungen des Kunden erfassen.</p>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p>}
      <button disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-semibold text-white hover:bg-electric disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Kundenakte anlegen
      </button>
    </form>
  );
}
