"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function TaskActions({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/portal/enterprise/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status === "completed" ? "open" : "completed" }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json() as { ok: boolean; error?: string };
      if (!response.ok || !json.ok) throw new Error(json.error ?? "Speichern fehlgeschlagen.");
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Speichern fehlgeschlagen.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return <div>
    <button type="button" disabled={busy} onClick={complete} className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-[13px] font-semibold hover:border-ink/40 disabled:opacity-50">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      {status === "completed" ? "Wieder öffnen" : "Erledigt"}
    </button>
    {error && <p className="mt-2 text-[12px] text-red-700">{error}</p>}
  </div>;
}
