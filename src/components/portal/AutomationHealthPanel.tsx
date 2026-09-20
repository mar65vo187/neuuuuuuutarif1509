"use client";

import { AlertTriangle, CheckCircle2, Loader2, Play, RotateCcw, Workflow } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Run = {
  id: number;
  ruleName: string | null;
  eventType: string;
  entityType: string;
  entityId: string | null;
  status: string;
  createdAt: Date | string;
};

type Delivery = {
  id: number;
  endpointName: string;
  status: string;
  responseCode: number | null;
  attempts: number;
  lastError: string | null;
  createdAt: Date | string;
};

export function AutomationHealthPanel({
  rules,
  runHealth,
  runs,
  webhooks,
  deliveryHealth,
  deliveries,
  outbox,
}: {
  rules: { total: number; active: number };
  runHealth: { recent: number; failed: number };
  runs: Run[];
  webhooks: { total: number; active: number };
  deliveryHealth: { recent: number; failed: number };
  deliveries: Delivery[];
  outbox: { pending: number; failed: number; processed: number; ready: number };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function processNow() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/portal/admin/enterprise/process-outbox", {
        method: "POST",
        credentials: "same-origin",
        signal: AbortSignal.timeout(30000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; processed?: number; failed?: number; error?: string } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Outbox konnte nicht verarbeitet werden.");
      setMessage((json.processed ?? 0) + " verarbeitet · " + (json.failed ?? 0) + " fehlgeschlagen");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Outbox konnte nicht verarbeitet werden.");
    } finally {
      setBusy(false);
    }
  }

  const cards = [
    { label: "Automation-Regeln", value: rules.active + "/" + rules.total, issue: false },
    { label: "Run-Fehler", value: String(runHealth.failed), issue: runHealth.failed > 0 },
    { label: "Webhook Endpoints", value: webhooks.active + "/" + webhooks.total, issue: false },
    { label: "Delivery-Fehler", value: String(deliveryHealth.failed), issue: deliveryHealth.failed > 0 },
    { label: "Outbox bereit", value: String(outbox.ready), issue: outbox.ready > 10 },
    { label: "Outbox fehlgeschlagen", value: String(outbox.failed), issue: outbox.failed > 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map((card) => <div key={card.label} className={"rounded-[18px] border p-4 " + (card.issue ? "border-red-200 bg-red-50" : "border-line bg-white")}><p className="text-[11px] font-semibold text-steel">{card.label}</p><p className={"mt-2 text-[24px] font-extrabold " + (card.issue ? "text-red-700" : "")}>{card.value}</p></div>)}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[22px] border border-line bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Workflow className="h-4.5 w-4.5 text-electric-deep" /><h3 className="font-extrabold">Automation Runs</h3></div><span className="text-[11px] text-steel">letzte {runs.length}</span></div>
          <ul className="mt-4 divide-y divide-line">
            {runs.slice(0, 12).map((run) => <li key={run.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto]"><div><p className="text-[12.5px] font-bold">{run.ruleName || run.eventType}</p><p className="text-[11px] text-steel">{run.eventType} · {run.entityType}{run.entityId ? " #" + run.entityId : ""}</p></div><span className={"inline-flex h-7 items-center gap-1.5 text-[11px] font-bold " + (run.status === "success" ? "text-emerald-700" : "text-red-700")}>{run.status === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}{run.status}</span></li>)}
          </ul>
          {runs.length === 0 && <p className="mt-4 text-[12px] text-steel">Noch keine Automation Runs vorhanden.</p>}
        </div>

        <div className="rounded-[22px] border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><RotateCcw className="h-4.5 w-4.5 text-electric-deep" /><h3 className="font-extrabold">Webhook Delivery</h3></div><button type="button" onClick={processNow} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-3.5 text-[12px] font-semibold text-white hover:bg-electric disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Outbox jetzt verarbeiten</button></div>
          {message && <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-[11.5px] font-semibold">{message}</p>}
          <ul className="mt-4 divide-y divide-line">
            {deliveries.slice(0, 12).map((delivery) => <li key={delivery.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto]"><div><p className="text-[12.5px] font-bold">{delivery.endpointName}</p><p className="text-[11px] text-steel">{delivery.responseCode ? "HTTP " + delivery.responseCode : delivery.lastError || "keine Antwort"} · Versuch {delivery.attempts}</p></div><span className={"text-[11px] font-bold " + (delivery.status === "delivered" ? "text-emerald-700" : "text-red-700")}>{delivery.status}</span></li>)}
          </ul>
          {deliveries.length === 0 && <p className="mt-4 text-[12px] text-steel">Noch keine Webhook-Auslieferungen vorhanden.</p>}
        </div>
      </div>
    </div>
  );
}
