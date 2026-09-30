"use client";

import { useRouter } from "next/navigation";
import { Loader2, Save, TrendingUp } from "lucide-react";
import { useRef, useState } from "react";
import { LEAD_LOST_REASON_LABELS } from "@/lib/content";
import { parseEuroInput } from "@/lib/money-input";

type Props = {
  leadId: number;
  status: string;
  dealValueCents: number | null;
  winProbability: number | null;
  expectedCloseAt: string | null;
  lostReason: string | null;
};

const PROBABILITY_STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function centsToInput(cents: number | null) {
  if (cents === null) return "";
  return (cents / 100).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function LeadForecastPanel({ leadId, status, dealValueCents, winProbability, expectedCloseAt, lostReason }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(centsToInput(dealValueCents));
  const [probability, setProbability] = useState(winProbability === null ? "" : String(winProbability));
  const [closeDate, setCloseDate] = useState(expectedCloseAt ?? "");
  const [reason, setReason] = useState(lostReason ?? "");
  const [busy, setBusy] = useState<"forecast" | "reason" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const saving = useRef(false);
  const lost = status === "verloren";

  const cents = parseEuroInput(value);
  const weighted = typeof cents === "number" && probability !== ""
    ? Math.round(cents * Number(probability) / 100)
    : null;

  async function send(key: "forecast" | "reason", body: Record<string, unknown>) {
    if (saving.current) return;
    saving.current = true;
    setBusy(key);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch(`/api/portal/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 401) {
        window.location.replace(`/portal/login?next=${encodeURIComponent(`/portal/leads/${leadId}`)}`);
        return;
      }
      const json = (await res.json().catch(() => ({ ok: false }))) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      setSaved(key === "forecast" ? "Forecast gespeichert." : "Verlustgrund gespeichert.");
      router.refresh();
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      saving.current = false;
      setBusy(null);
    }
  }

  function saveForecast() {
    if (cents === undefined) {
      setError("Bitte den Wert als Eurobetrag eingeben, z. B. 1.200 oder 1200,50.");
      return;
    }
    void send("forecast", {
      dealValueCents: cents,
      winProbability: probability === "" ? null : Number(probability),
      expectedCloseAt: closeDate || null,
    });
  }

  function saveReason() {
    if (!reason) {
      setError("Bitte einen Verlustgrund auswählen.");
      return;
    }
    void send("reason", { lostReason: reason });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-electric/10 text-electric-deep"><TrendingUp className="h-4 w-4" aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold">Forecast</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-steel">Erwarteter Wert, Abschlusswahrscheinlichkeit und Datum fließen in den gewichteten Forecast im Reporting ein.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="label">Erwarteter Wert (€)</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className="field"
            placeholder="z. B. 1.200"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={cents === undefined}
          />
        </label>
        <label className="block">
          <span className="label">Wahrscheinlichkeit</span>
          <select className="field" value={probability} onChange={(event) => setProbability(event.target.value)}>
            <option value="">Keine Angabe</option>
            {PROBABILITY_STEPS.map((step) => <option key={step} value={String(step)}>{step} %</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Abschluss erwartet</span>
          <input type="date" className="field" value={closeDate} onChange={(event) => setCloseDate(event.target.value)} />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-steel" aria-live="polite">
          {weighted !== null
            ? <>Gewichteter Wert: <strong className="text-ink">{(weighted / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</strong></>
            : "Gewichteter Wert erscheint, sobald Wert und Wahrscheinlichkeit gesetzt sind."}
        </p>
        <button
          type="button"
          onClick={saveForecast}
          disabled={busy !== null}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white hover:bg-electric disabled:opacity-60"
        >
          {busy === "forecast" ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          Forecast speichern
        </button>
      </div>

      {lost && (
        <div className={`rounded-xl border p-4 ${lostReason ? "border-line bg-paper" : "border-amber-300 bg-amber-50"}`}>
          {!lostReason && <p className="mb-2 text-[12px] font-semibold text-amber-900">Bitte Verlustgrund angeben – nur so zeigt das Reporting, woran Abschlüsse scheitern.</p>}
          <label className="block">
            <span className="label">Warum ist es nicht zustande gekommen?</span>
            <select className="field" value={reason} onChange={(event) => setReason(event.target.value)}>
              <option value="">Bitte wählen</option>
              {Object.entries(LEAD_LOST_REASON_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={saveReason}
            disabled={busy !== null}
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-ink hover:border-ink/40 disabled:opacity-60"
          >
            {busy === "reason" ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
            Verlustgrund speichern
          </button>
        </div>
      )}

      <div role="status" aria-live="polite">
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-800">{error}</p> : null}
        {!error && saved ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">{saved}</p> : null}
      </div>
    </div>
  );
}
