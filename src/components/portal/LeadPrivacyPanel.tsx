"use client";

import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

/** DSGVO Art. 17 for a lead that never became a customer. Visible to privacy managers only. */
export function LeadPrivacyPanel({ leadId, linkedToCustomer }: { leadId: number; linkedToCustomer: boolean }) {
  const router = useRouter();
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");

  async function erase() {
    if (saving.current) return;
    if (!window.confirm("Die Anonymisierung kann nicht rückgängig gemacht werden. Fortfahren?")) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/privacy/leads/${leadId}/erase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirm.trim(), reason: reason.trim() }),
        signal: AbortSignal.timeout(30000),
      });
      const json = (await res.json().catch(() => ({ ok: false }))) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Anonymisierung fehlgeschlagen.");
        return;
      }
      router.replace("/portal/leads");
      router.refresh();
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[14px] font-extrabold">Datenschutz: Lead anonymisieren</p>
      {linkedToCustomer ? (
        <p className="text-[12px] leading-relaxed text-steel">Dieser Lead gehört zu einem Kunden oder Auftrag. Eine Löschanfrage wird über die Kundenakte bearbeitet, damit alle verknüpften Daten erfasst werden.</p>
      ) : (
        <>
          <p className="text-[12px] leading-relaxed text-steel">Entfernt Name, Kontaktdaten, Nachricht, Notizen und Anrufnotizen (Art. 17 DSGVO). Statistik ohne Personenbezug bleibt erhalten. Nicht umkehrbar.</p>
          <label className="block">
            <span className="label">Grund (z. B. „Löschwunsch per Telefon am 01.10.“)</span>
            <input type="text" maxLength={500} className="field" value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <label className="block">
            <span className="label">Zur Bestätigung ANONYMISIEREN eingeben</span>
            <input type="text" autoComplete="off" className="field" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          </label>
          <button
            type="button"
            onClick={erase}
            disabled={busy || confirm.trim() !== "ANONYMISIEREN" || reason.trim().length < 3}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-red-700 px-4 text-[13px] font-semibold text-white hover:bg-red-800 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
            Lead endgültig anonymisieren
          </button>
        </>
      )}
      <div role="status" aria-live="polite">
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-800">{error}</p> : null}
      </div>
    </div>
  );
}
