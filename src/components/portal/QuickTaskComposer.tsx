"use client";

import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { parseBerlinDateTimeInput } from "@/lib/portal-date-time";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

export function QuickTaskComposer({
  assignees,
  currentUserId,
}: {
  assignees: Array<{ id: number; name: string }>;
  currentUserId: number;
}) {
  const router = useRouter();
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setMessage(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const due = String(data.get("dueAt") ?? "").trim();

    try {
      const response = await fetch("/api/portal/tasks", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.get("title"),
          description: data.get("description"),
          priority: data.get("priority"),
          assignedToEmployeeId: Number(data.get("assignedToEmployeeId") || currentUserId),
          dueAt: parseBerlinDateTimeInput(due),
          entityType: "general",
          entityId: 0,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (response.status === 401) {
        window.location.replace("/portal/login?next=%2Fportal");
        return;
      }
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Aufgabe konnte nicht angelegt werden.");
      form.reset();
      setMessage({ type: "success", text: "Aufgabe angelegt." });
      router.refresh();
    } catch (cause) {
      setMessage({ type: "error", text: cause instanceof Error ? cause.message : "Aufgabe konnte nicht angelegt werden." });
    } finally {
      setBusy(false);
      saving.current = false;
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="label">Aufgabe
        <input name="title" required minLength={2} maxLength={180} className="field mt-1 min-h-11" placeholder="z. B. Kunde zurückrufen" />
      </label>
      <label className="label">Notiz
        <textarea name="description" maxLength={2000} rows={2} className="field mt-1 resize-none" placeholder="Optionaler Kontext" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label">Priorität
          <select name="priority" defaultValue="normal" className="field mt-1 min-h-11">
            <option value="low">Niedrig</option>
            <option value="normal">Normal</option>
            <option value="high">Hoch</option>
            <option value="critical">Kritisch</option>
          </select>
        </label>
        <label className="label">Fällig
          <input name="dueAt" type="datetime-local" className="field mt-1 min-h-11" />
        </label>
      </div>
      {assignees.length > 1 && (
        <label className="label">Zuweisen an
          <select name="assignedToEmployeeId" defaultValue={String(currentUserId)} className="field mt-1 min-h-11">
            {assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label>
      )}
      {message && (
        <p className={`rounded-xl px-3 py-2 text-[12px] font-semibold ${message.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {message.type === "success" && <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5" />}
          {message.text}
        </p>
      )}
      <button disabled={busy} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white transition hover:bg-electric disabled:cursor-not-allowed disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Aufgabe anlegen
      </button>
    </form>
  );
}
