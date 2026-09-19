"use client";

import { Loader2, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

export function ProviderCommissionAction({
  eventId,
  defaultAmount,
  providerReference,
  alreadyPaid,
}: {
  eventId: number;
  defaultAmount: number;
  providerReference: string | null;
  alreadyPaid: boolean;
}) {
  const router = useRouter();
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/portal/admin/operations/commission/${eventId}/paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          amount: Number(String(form.get("amount") ?? "0").replace(",", ".")),
          providerReference: String(form.get("providerReference") ?? ""),
          note: String(form.get("note") ?? ""),
        }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string; ownerPoolAmount?: number } | null;
      if (response.status === 401) {
        window.location.replace("/portal/login");
        return;
      }
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Provider-Zahlung konnte nicht gespeichert werden.");
      const pool = Number(json.ownerPoolAmount ?? 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
      setMessage({ type: "success", text: `Provider-Zahlung gespeichert. ${pool} wurden automatisch dem internen 15-%-Pool zugeordnet.` });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Speichern fehlgeschlagen." });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="mt-5 rounded-2xl border border-electric/20 bg-electric/5 p-4">
    <div className="flex items-center gap-2">
      <WalletCards className="h-4 w-4 text-electric-deep" />
      <div>
        <p className="text-[13.5px] font-extrabold">{alreadyPaid ? "Provider-Zahlung aktualisieren" : "Provider-Provision als bezahlt markieren"}</p>
        <p className="text-[11.5px] text-steel">Nur Owner · 15 % werden automatisch und idempotent in den internen Benefit-/Growth-Pool gebucht.</p>
      </div>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="label">Bezahlter Betrag (€)<input name="amount" required inputMode="decimal" defaultValue={defaultAmount > 0 ? defaultAmount.toFixed(2) : ""} className="field" /></label>
      <label className="label">Provider-Referenz<input name="providerReference" maxLength={240} defaultValue={providerReference ?? ""} className="field" /></label>
      <label className="label sm:col-span-2">Notiz<input name="note" maxLength={1000} placeholder="optional, z. B. Abrechnung September 2026" className="field" /></label>
    </div>
    {message && <p role={message.type === "error" ? "alert" : "status"} className={`mt-3 rounded-xl border px-3 py-2 text-[12.5px] ${message.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{message.text}</p>}
    <button disabled={saving} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white hover:bg-electric disabled:opacity-50">
      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
      {alreadyPaid ? "Zahlung aktualisieren" : "Als bezahlt markieren"}
    </button>
  </form>;
}
