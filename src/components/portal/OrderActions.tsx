"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ORDER_STATUSES } from "@/lib/enterprise-validation";

const LABELS: Record<string, string> = {
  draft: "Entwurf",
  documents_missing: "Unterlagen fehlen",
  ready_to_submit: "Einreichbereit",
  submitted: "Eingereicht",
  provider_review: "Provider-Prüfung",
  accepted: "Angenommen",
  activation_pending: "Aktivierung offen",
  active: "Aktiv",
  rejected: "Abgelehnt",
  cancelled: "Storniert",
  storno: "Storno / Rückbelastung",
};

export function OrderActions({ orderId, status, providerStatus, externalOrderId }: { orderId: number; status: string; providerStatus: string | null; externalOrderId: string | null }) {
  const router = useRouter();
  const saving = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState(providerStatus ?? "");
  const [external, setExternal] = useState(externalOrderId ?? "");
  const [reason, setReason] = useState("");

  async function patch(key: string, body: Record<string, unknown>) {
    if (saving.current) return;
    saving.current = true;
    setBusy(key);
    setError(null);
    try {
      const response = await fetch(`/api/portal/enterprise/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json() as { ok: boolean; error?: string };
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Speichern fehlgeschlagen.");
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Speichern fehlgeschlagen.");
    } finally {
      saving.current = false;
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="label">Auftragsstatus</p>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUSES.map((value) => (
            <button key={value} type="button" disabled={busy !== null || value === status}
              onClick={() => patch(`status:${value}`, { status: value, cancellationReason: ["cancelled","storno"].includes(value) ? reason || undefined : undefined })}
              className={`chip h-9 px-3.5 ${value === status ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-700 hover:border-ink/40"}`}>
              {busy === `status:${value}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : LABELS[value]}
            </button>
          ))}
        </div>
      </div>
      <label className="label">Storno-/Ablehnungsgrund<textarea rows={2} maxLength={1000} className="field" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      <div className="grid gap-3">
        <label className="label">Providerstatus<input maxLength={160} className="field" value={provider} onChange={(e) => setProvider(e.target.value)} /></label>
        <label className="label">Externe Auftrags-ID<input maxLength={160} className="field" value={external} onChange={(e) => setExternal(e.target.value)} /></label>
        <button type="button" disabled={busy !== null} onClick={() => patch("provider", { providerStatus: provider, externalOrderId: external })}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold hover:border-ink/40 disabled:opacity-50">
          {busy === "provider" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Providerdaten speichern
        </button>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p>}
    </div>
  );
}
