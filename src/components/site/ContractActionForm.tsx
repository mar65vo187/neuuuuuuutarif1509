"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";

export function ContractActionForm({ action }: { action: "cancellation" | "withdrawal" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const cancellation = action === "cancellation";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      action,
      customerName: String(form.get("customerName") ?? ""),
      email: String(form.get("email") ?? ""),
      contractNumber: String(form.get("contractNumber") ?? ""),
      cancellationType: cancellation ? String(form.get("cancellationType") ?? "ordinary") : undefined,
      requestedEnd: cancellation ? String(form.get("requestedEnd") ?? "earliest") : "",
      reason: String(form.get("reason") ?? ""),
      website: String(form.get("website") ?? ""),
    };
    try {
      const response = await fetch("/api/optimierung/legal-action", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json() as { ok?: boolean; error?: string; receiptUrl?: string; emailConfirmation?: boolean };
      if (!response.ok || !result.ok || !result.receiptUrl) throw new Error(result.error || "Erklärung konnte nicht übermittelt werden.");
      setReceipt(result.receiptUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Bitte versuche es erneut.");
    } finally {
      setBusy(false);
    }
  }

  if (receipt) {
    return <div className="rounded-[26px] border border-emerald-400/25 bg-emerald-400/10 p-6"><CheckCircle2 className="h-8 w-8 text-emerald-300" /><h2 className="mt-4 text-xl font-extrabold">Erklärung eingegangen</h2><p className="mt-2 text-sm leading-6 text-silver">Der Eingang wurde mit Datum und Uhrzeit gespeichert. Öffne den Beleg und speichere oder drucke ihn für deine Unterlagen.</p><a href={receipt} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-extrabold text-ink">Eingangsbeleg öffnen</a></div>;
  }

  return (
    <form onSubmit={submit} className="rounded-[28px] border border-white/10 bg-white/[0.055] p-5 sm:p-7">
      <div className="grid gap-4">
        <label className="text-sm font-semibold">Name<input name="customerName" required maxLength={160} autoComplete="name" className="field mt-2 min-h-11 bg-white text-ink" /></label>
        <label className="text-sm font-semibold">E-Mail aus dem Vertrag<input name="email" required type="email" maxLength={200} autoComplete="email" className="field mt-2 min-h-11 bg-white text-ink" /></label>
        <label className="text-sm font-semibold">Vertragsnummer<input name="contractNumber" required pattern="TW-OPT-[0-9]+" placeholder="TW-OPT-123" className="field mt-2 min-h-11 bg-white text-ink uppercase" /><span className="mt-1 block text-xs font-normal text-silver">Steht in deiner Bestätigung und in deinem Optimierung+-Bereich.</span></label>
        <label className="sr-only" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
        {cancellation && <>
          <label className="text-sm font-semibold">Art der Kündigung<select name="cancellationType" className="field mt-2 min-h-11 bg-white text-ink"><option value="ordinary">Ordentliche Kündigung</option><option value="extraordinary">Außerordentliche Kündigung</option></select></label>
          <label className="text-sm font-semibold">Gewünschtes Vertragsende <span className="font-normal text-silver">(optional)</span><input name="requestedEnd" type="date" className="field mt-2 min-h-11 bg-white text-ink" /><span className="mt-1 block text-xs font-normal text-silver">Ohne Datum wird die Kündigung zum frühestmöglichen Zeitpunkt erklärt.</span></label>
        </>}
        <label className="text-sm font-semibold">{cancellation ? "Kündigungsgrund (bei außerordentlicher Kündigung)" : "Hinweis (optional)"}<textarea name="reason" rows={3} maxLength={1500} className="field mt-2 bg-white text-ink" placeholder={cancellation ? "Grund der außerordentlichen Kündigung" : "Optionaler Hinweis zum Widerruf"} /></label>
      </div>
      <button disabled={busy} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-electric px-5 text-sm font-extrabold text-white disabled:opacity-60">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{cancellation ? "Jetzt kündigen" : "Widerruf bestätigen"}</button>
      {error && <p role="alert" className="mt-3 rounded-xl border border-red-300/20 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}
    </form>
  );
}
