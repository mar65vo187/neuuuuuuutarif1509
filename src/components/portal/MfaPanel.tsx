"use client";

import { Check, Copy, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

export function MfaPanel({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [secret, setSecret] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function action(body: Record<string, unknown>) {
    setBusy(true); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/portal/security/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json() as { ok: boolean; error?: string; enabled?: boolean; secret?: string; uri?: string };
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Aktion fehlgeschlagen.");
      if (json.secret) setSecret(json.secret);
      if (json.uri) setUri(json.uri);
      if (typeof json.enabled === "boolean") {
        setEnabled(json.enabled);
        if (json.enabled) { setSecret(null); setUri(null); setMessage("Zwei-Faktor-Anmeldung ist aktiviert."); }
        else { setSecret(null); setUri(null); setMessage("Zwei-Faktor-Anmeldung ist deaktiviert."); }
      }
      setCode("");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Aktion fehlgeschlagen.");
    } finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-electric/10 text-electric-deep"><ShieldCheck className="h-5 w-5" /></span>
      <div><p className="font-bold">{enabled ? "2FA aktiv" : "2FA nicht aktiviert"}</p><p className="text-[12.5px] text-steel">TOTP mit Authenticator-App · 6-stelliger Code</p></div>
    </div>
    {!enabled && !secret && <button type="button" disabled={busy} onClick={() => action({ action: "start" })} className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white hover:bg-electric disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />} 2FA einrichten</button>}
    {!enabled && secret && <div className="rounded-2xl border border-line bg-paper p-4">
      <p className="text-[13px] font-semibold">1. Geheimnis in deiner Authenticator-App hinzufügen</p>
      <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-white px-3 py-2 text-[12px]">{secret}</code><button type="button" className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-white" onClick={() => navigator.clipboard.writeText(secret)} aria-label="Geheimnis kopieren"><Copy className="h-4 w-4" /></button></div>
      {uri && <details className="mt-3 text-[12px] text-steel"><summary>Technischen otpauth-Link anzeigen</summary><p className="mt-2 break-all">{uri}</p></details>}
      <label className="label mt-4">2. Aktuellen 6-stelligen Code eingeben<input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" className="field" /></label>
      <button type="button" disabled={busy || code.length !== 6} onClick={() => action({ action: "enable", code })} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aktivieren</button>
    </div>}
    {enabled && <div><label className="label">Zum Deaktivieren aktuellen Code eingeben<input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" className="field" /></label><button type="button" disabled={busy || code.length !== 6} onClick={() => action({ action: "disable", code })} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />} 2FA deaktivieren</button></div>}
    {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[14px] text-emerald-800">{message}</p>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p>}
  </div>;
}
