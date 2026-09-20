"use client";

import { CheckCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NotificationActions({ unreadIds }: { unreadIds: number[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (unreadIds.length === 0) return null;

  async function markAll() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/portal/notifications", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Benachrichtigungen konnten nicht aktualisiert werden.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Benachrichtigungen konnten nicht aktualisiert werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button type="button" onClick={markAll} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13px] font-semibold hover:border-electric/30 hover:text-electric-deep disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />} Alle als gelesen
      </button>
      {error && <p role="alert" className="text-[11px] font-semibold text-red-700">{error}</p>}
    </div>
  );
}
