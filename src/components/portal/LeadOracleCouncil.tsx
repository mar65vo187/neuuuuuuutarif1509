"use client";

import { useState } from "react";
import { BrainCircuit, CheckCircle2, CircleAlert, LoaderCircle, ShieldCheck, XCircle } from "lucide-react";

type CouncilResult = {
  status: "QUALIFIED" | "REVIEW_REQUIRED" | "DISQUALIFIED";
  score: number;
  decisionMaker: { confirmed: boolean; evidence: string[] };
  need: { confirmed: boolean; area: string; evidence: string[] };
  contactBasis: { confirmed: boolean; evidence: string[] };
  summary: string;
  reasons: string[];
  missingQuestions: string[];
  recommendedApproach: string;
  objections: Array<{ objection: string; response: string }>;
  models: { qualifier: string; challenger: string; revision: string };
};

const STATUS = {
  QUALIFIED: {
    label: "QUALIFIED",
    description: "Entscheider + Bedarf + Kontaktgrundlage bestätigt",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: CheckCircle2,
  },
  REVIEW_REQUIRED: {
    label: "REVIEW REQUIRED",
    description: "Mindestens ein harter Nachweis fehlt",
    className: "border-amber-200 bg-amber-50 text-amber-950",
    icon: CircleAlert,
  },
  DISQUALIFIED: {
    label: "DISQUALIFIED",
    description: "Harte Ausschlussbedingung erkannt",
    className: "border-red-200 bg-red-50 text-red-950",
    icon: XCircle,
  },
} as const;

function EvidenceFlag({ label, confirmed }: { label: string; confirmed: boolean }) {
  return (
    <div className={"rounded-xl border px-3 py-2 " + (confirmed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
      <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] opacity-65">{label}</p>
      <p className="mt-1 text-[12.5px] font-extrabold">{confirmed ? "Bestätigt" : "Noch offen"}</p>
    </div>
  );
}

export function LeadOracleCouncil({ leadId }: { leadId: number }) {
  const [result, setResult] = useState<CouncilResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/portal/leads/${leadId}/oracle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null) as { ok?: boolean; result?: CouncilResult; error?: string } | null;
      if (!response.ok || !payload?.ok || !payload.result) {
        throw new Error(payload?.error || "Lead-KI konnte nicht ausgeführt werden.");
      }
      setResult(payload.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lead-KI konnte nicht ausgeführt werden.");
    } finally {
      setLoading(false);
    }
  }

  const status = result ? STATUS[result.status] : null;
  const StatusIcon = status?.icon ?? BrainCircuit;

  return (
    <section className="rounded-[22px] border border-ink/10 bg-white p-4 shadow-[0_16px_45px_rgba(15,23,42,0.05)] sm:p-5" aria-label="Dual-AI Lead Council">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink text-electric-soft">
            <BrainCircuit className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-steel">ORACLE · Dual-AI Lead Council</p>
            <h2 className="mt-1 text-[16px] font-extrabold text-ink">Entscheider, Bedarf und Kontaktgrundlage prüfen</h2>
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-steel">
              Qwen qualifiziert, Mistral versucht die Freigabe zu widerlegen, Qwen revidiert. Harte CRM-Gates können von keinem Modell überstimmt werden.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-4 text-[12.5px] font-extrabold text-white transition hover:bg-electric disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {loading ? "Prüfung läuft…" : result ? "Neu prüfen" : "Lead qualifizieren"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] font-semibold text-red-900">
          {error}
        </div>
      )}

      {result && status && (
        <div className="mt-5 space-y-4">
          <div className={"rounded-[18px] border p-4 " + status.className}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <StatusIcon className="h-5 w-5" />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.14em]">{status.label}</p>
                  <p className="mt-0.5 text-[12px] font-semibold opacity-80">{status.description}</p>
                </div>
              </div>
              <div className="rounded-xl border border-current/10 bg-white/55 px-3 py-2 text-right">
                <p className="text-[9.5px] font-extrabold uppercase tracking-wider opacity-60">Council Score</p>
                <p className="text-[22px] font-black">{result.score}/100</p>
              </div>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed">{result.summary}</p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            <EvidenceFlag label="Entscheider" confirmed={result.decisionMaker.confirmed} />
            <EvidenceFlag label={"Bedarf · " + result.need.area} confirmed={result.need.confirmed} />
            <EvidenceFlag label="Kontaktgrundlage" confirmed={result.contactBasis.confirmed} />
          </div>

          {result.reasons.length > 0 && (
            <div className="rounded-xl border border-line bg-paper/65 p-4">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.13em] text-steel">Belege & Gegenprüfung</p>
              <ul className="mt-2.5 space-y-1.5 text-[12.5px] leading-relaxed text-ink">
                {result.reasons.map((reason, index) => <li key={index}>• {reason}</li>)}
              </ul>
            </div>
          )}

          {result.missingQuestions.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.13em] text-amber-800">Noch qualifizieren</p>
              <ol className="mt-2.5 space-y-1.5 text-[12.5px] leading-relaxed text-amber-950">
                {result.missingQuestions.map((question, index) => <li key={index}>{index + 1}. {question}</li>)}
              </ol>
            </div>
          )}

          {result.recommendedApproach && (
            <div className="rounded-xl border border-electric/15 bg-electric/[0.05] p-4">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.13em] text-electric-deep">Empfohlener Gesprächseinstieg</p>
              <p className="mt-2 whitespace-pre-line text-[12.5px] leading-relaxed text-ink">{result.recommendedApproach}</p>
            </div>
          )}

          {result.objections.length > 0 && (
            <div className="grid gap-2.5">
              {result.objections.map((item, index) => (
                <div key={index} className="rounded-xl border border-line bg-white p-3.5">
                  <p className="text-[11.5px] font-extrabold text-ink">{item.objection}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-steel">{item.response}</p>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] leading-relaxed text-steel">
            Modelle: {result.models.qualifier} → {result.models.challenger} → {result.models.revision}. Keine Namen, E-Mails oder Telefonnummern werden an die Modelle übergeben.
          </p>
        </div>
      )}
    </section>
  );
}
