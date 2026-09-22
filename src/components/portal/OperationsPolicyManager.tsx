"use client";

import { Loader2, Save, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import {
  OPERATIONS_POLICY_FIELDS,
  type OperationsPolicySnapshot,
  type OperationsPolicyValues,
} from "@/lib/operations-policy-shared";

const LIMITS: Record<keyof OperationsPolicyValues, { min: number; max: number }> = {
  leadNextActionMissingHours: { min: 1, max: 720 },
  leadNextActionHighHours: { min: 1, max: 2160 },
  customerReviewHighDays: { min: 1, max: 365 },
  opportunityReviewHighDays: { min: 1, max: 365 },
  orderStaleDays: { min: 1, max: 90 },
  providerReferenceMissingHours: { min: 1, max: 720 },
  providerStatusMissingHours: { min: 1, max: 720 },
  activationStaleDays: { min: 1, max: 90 },
  documentsStaleHours: { min: 1, max: 720 },
};

export function OperationsPolicyManager({ policy }: { policy: OperationsPolicySnapshot }) {
  const router = useRouter();
  const saving = useRef(false);
  const [values, setValues] = useState<OperationsPolicyValues>(() => ({
    leadNextActionMissingHours: policy.leadNextActionMissingHours,
    leadNextActionHighHours: policy.leadNextActionHighHours,
    customerReviewHighDays: policy.customerReviewHighDays,
    opportunityReviewHighDays: policy.opportunityReviewHighDays,
    orderStaleDays: policy.orderStaleDays,
    providerReferenceMissingHours: policy.providerReferenceMissingHours,
    providerStatusMissingHours: policy.providerStatusMissingHours,
    activationStaleDays: policy.activationStaleDays,
    documentsStaleHours: policy.documentsStaleHours,
  }));
  const [state, setState] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true;
    setState(null);
    try {
      const response = await fetch("/api/portal/admin/enterprise/operations-policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json() as { ok: boolean; error?: string };
      if (!response.ok || !json.ok) throw new Error(json.error ?? "SLA-Policy konnte nicht gespeichert werden.");
      setState({ type: "success", text: "SLA-Policy gespeichert und im Audit-Log protokolliert." });
      router.refresh();
    } catch (error) {
      setState({ type: "error", text: error instanceof Error ? error.message : "SLA-Policy konnte nicht gespeichert werden." });
    } finally {
      saving.current = false;
    }
  }

  return (
    <section className="rounded-[22px] border border-electric/15 bg-[linear-gradient(145deg,rgba(79,141,255,0.08),rgba(13,25,46,0.92))] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-electric-soft">Operations Policy</p>
          <h2 className="mt-2 text-[18px] font-extrabold">SLA- & Eskalationsgrenzen</h2>
          <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-steel">
            Eine zentrale Policy steuert Order-Workqueue, Providerwarnungen, Command Center, Reporting und den täglichen Qualitäts-Wächter. Änderungen erzeugen ausschließlich interne Warnungen und Aufgaben – keine autonome Kundenkommunikation.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1.5 text-[10.5px] font-bold text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> auditierbar</span>
      </div>

      <form onSubmit={submit} className="mt-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {OPERATIONS_POLICY_FIELDS.map((field) => {
            const limits = LIMITS[field.key];
            return (
              <label key={field.key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <span className="text-[12.5px] font-extrabold text-slate-100">{field.label}</span>
                <span className="mt-1 block min-h-10 text-[10.5px] leading-relaxed text-steel">{field.description}</span>
                <span className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    required
                    min={limits.min}
                    max={limits.max}
                    value={values[field.key]}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isFinite(next)) setValues((current) => ({ ...current, [field.key]: next }));
                    }}
                    className="field h-11 bg-white text-ink"
                    aria-label={field.label}
                  />
                  <span className="min-w-14 text-[10.5px] font-bold text-steel">{field.unit}</span>
                </span>
              </label>
            );
          })}
        </div>
        {state && <p role={state.type === "error" ? "alert" : "status"} className={"mt-4 rounded-xl border px-3 py-2 text-[12px] " + (state.type === "error" ? "border-red-300/30 bg-red-400/[0.08] text-red-200" : "border-emerald-300/30 bg-emerald-400/[0.08] text-emerald-200")}>{state.text}</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[10.5px] text-steel">{policy.updatedAt ? "Zuletzt geändert: " + new Date(policy.updatedAt).toLocaleString("de-DE") : "Standardwerte aktiv · noch keine protokollierte Änderung"}</p>
          <button type="submit" disabled={saving.current} className="inline-flex h-10 items-center gap-2 rounded-full bg-electric px-4 text-[12px] font-extrabold text-white hover:bg-electric-deep disabled:opacity-50">
            {saving.current ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Policy speichern
          </button>
        </div>
      </form>
    </section>
  );
}
