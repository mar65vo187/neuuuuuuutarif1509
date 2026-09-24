"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

export function OptimizationCheckoutForm() {
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    setPendingMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      termsAccepted: form.get("termsAccepted") === "on",
      privacyAccepted: form.get("privacyAccepted") === "on",
      website: String(form.get("website") ?? ""),
    };

    try {
      const response = await fetch("/api/optimierung/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json() as {
        ok?: boolean;
        error?: string;
        redirectUrl?: string;
        pending?: boolean;
        message?: string;
      };
      if (!response.ok || !result.ok) throw new Error(result.error || "Anmeldung konnte nicht gestartet werden.");
      if (result.redirectUrl) {
        window.location.assign(result.redirectUrl);
        return;
      }
      setPendingMessage(result.message || "Deine Anmeldung ist gespeichert. Wir melden uns zur Aktivierung.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Bitte versuche es erneut.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (pendingMessage) {
    return (
      <div className="rounded-[28px] border border-emerald-400/25 bg-emerald-400/10 p-6 text-white">
        <CheckCircle2 className="h-8 w-8 text-emerald-300" />
        <h3 className="mt-4 text-xl font-extrabold">Anmeldung gespeichert</h3>
        <p className="mt-2 text-sm leading-6 text-slate-200">{pendingMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[30px] border border-white/12 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-xl sm:p-7">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-electric/15 text-electric-soft"><ShieldCheck className="h-5 w-5" /></span>
        <div>
          <p className="text-sm font-extrabold text-white">Optimierung+ starten</p>
          <p className="text-xs text-silver">1,99 € pro Monat · wiederkehrendes Abo</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="text-sm font-semibold text-white">Name
          <input name="name" required maxLength={160} autoComplete="name" className="field mt-2 min-h-12 bg-white text-ink" placeholder="Vor- und Nachname" />
        </label>
        <label className="text-sm font-semibold text-white">E-Mail
          <input name="email" required type="email" maxLength={200} autoComplete="email" className="field mt-2 min-h-12 bg-white text-ink" placeholder="name@beispiel.de" />
        </label>
        <label className="text-sm font-semibold text-white">Telefon <span className="font-normal text-silver">(optional)</span>
          <input name="phone" maxLength={40} autoComplete="tel" className="field mt-2 min-h-12 bg-white text-ink" placeholder="+49 …" />
        </label>
        <label className="sr-only" aria-hidden="true">Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="mt-5 space-y-3 text-[12.5px] leading-5 text-slate-300">
        <label className="flex items-start gap-3">
          <input name="termsAccepted" type="checkbox" required className="mt-1 h-4 w-4 accent-blue-500" />
          <span>Ich möchte Optimierung+ für 1,99 € monatlich abschließen und habe die <Link href="/agb" className="font-semibold text-white underline underline-offset-2">AGB</Link> sowie die Preisangabe gelesen.</span>
        </label>
        <label className="flex items-start gap-3">
          <input name="privacyAccepted" type="checkbox" required className="mt-1 h-4 w-4 accent-blue-500" />
          <span>Ich habe die <Link href="/datenschutz" className="font-semibold text-white underline underline-offset-2">Datenschutzhinweise</Link> zur Verarbeitung meiner Angaben gelesen.</span>
        </label>
      </div>

      <button type="submit" disabled={busy} className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-electric px-5 py-3.5 text-sm font-extrabold text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70">
        {busy ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Wird vorbereitet…</> : <>Für 1,99 € / Monat starten <ArrowRight className="h-4 w-4" /></>}
      </button>
      {error && <p role="alert" className="mt-3 rounded-xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p>}
      <p className="mt-4 text-center text-[11px] leading-5 text-silver">Die Zahlungsabwicklung startet erst nach dem Klick. Ohne aktivierte Online-Zahlung wird keine Zahlung als erfolgt dargestellt.</p>
    </form>
  );
}
