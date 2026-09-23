"use client";

import { Check, Loader2, Pencil, RotateCcw, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { formatBerlinDateTimeInput, parseBerlinDateTimeInput } from "@/lib/portal-date-time";

export const TASK_STATUS_OPTIONS = [
  { value: "open", label: "Offen" },
  { value: "in_progress", label: "In Arbeit" },
  { value: "completed", label: "Erledigt" },
  { value: "cancelled", label: "Abgebrochen" },
];

export const TASK_PRIORITY_OPTIONS = [
  { value: "low", label: "Niedrig" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Hoch" },
  { value: "critical", label: "Kritisch" },
];

const ACTION = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink hover:border-electric/50 disabled:cursor-wait disabled:opacity-60";

type TaskPatch = { status?: string; priority?: string; dueAt?: string | null };

export function TaskActions({ id, title, status, priority, dueAt }: { id: number; title: string; status: string; priority: string; dueAt: string | null }) {
  const router = useRouter();
  const saving = useRef(false);
  const [busy, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const reopen = status === "completed" || status === "cancelled";
  const dueInput = formatBerlinDateTimeInput(dueAt);

  useEffect(() => {
    if (!busy) saving.current = false;
  }, [busy]);

  function save(patch: TaskPatch) {
    if (saving.current || busy) return;
    if (!Object.keys(patch).length) {
      setMessage({ kind: "success", text: "Keine Änderungen zu speichern." });
      return;
    }
    saving.current = true;
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/portal/enterprise/tasks/${id}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
          signal: AbortSignal.timeout(15000),
        });
        const json = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
        if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Die Änderung konnte nicht bestätigt werden. Bitte aktualisiere die Ansicht.");
        setMessage({ kind: "success", text: patch.status === "completed" ? "Aufgabe erledigt." : patch.status === "open" ? "Aufgabe ist wieder offen." : "Änderungen gespeichert." });
        setEditing(false);
        startTransition(() => router.refresh());
      } catch (problem) {
        const uncertain = problem instanceof TypeError || (problem instanceof DOMException && ["TimeoutError", "AbortError"].includes(problem.name));
        setMessage({ kind: "error", text: uncertain ? "Die Verbindung wurde unterbrochen. Prüfe den aktualisierten Aufgabenstatus vor einem weiteren Versuch." : problem instanceof Error ? problem.message : "Speichern fehlgeschlagen." });
        if (uncertain) startTransition(() => router.refresh());
      }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || busy) return;
    const data = new FormData(event.currentTarget);
    const patch: TaskPatch = {};
    const nextStatus = String(data.get("status") ?? status);
    const nextPriority = String(data.get("priority") ?? priority);
    const nextDue = String(data.get("dueAt") ?? "");
    if (nextStatus !== status) patch.status = nextStatus;
    if (nextPriority !== priority) patch.priority = nextPriority;
    try {
      // Preserve the original instant when only status or priority changes.
      if (nextDue !== dueInput) patch.dueAt = parseBerlinDateTimeInput(nextDue);
      save(patch);
    } catch (problem) {
      setMessage({ kind: "error", text: problem instanceof Error ? problem.message : "Bitte Datum und Uhrzeit prüfen." });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => save({ status: reopen ? "open" : "completed" })} className={ACTION}>
          {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : reopen ? <RotateCcw aria-hidden="true" className="h-4 w-4" /> : <Check aria-hidden="true" className="h-4 w-4" />}
          {reopen ? "Wieder öffnen" : "Als erledigt markieren"}
        </button>
        <button type="button" disabled={busy} onClick={() => { setEditing(!editing); setMessage(null); }} aria-expanded={editing} aria-controls={`task-edit-${id}`} aria-label={`${title} bearbeiten`} className={ACTION}>
          {editing ? <X aria-hidden="true" className="h-4 w-4" /> : <Pencil aria-hidden="true" className="h-4 w-4" />}{editing ? "Bearbeitung schließen" : "Bearbeiten"}
        </button>
      </div>
      {editing && (
        <form id={`task-edit-${id}`} onSubmit={submit} className="rounded-xl border border-line bg-paper p-4">
          <fieldset disabled={busy} className="grid gap-3 md:grid-cols-3">
            <legend className="mb-3 text-sm font-semibold text-ink">Aufgabe bearbeiten</legend>
            <label htmlFor={`task-status-${id}`} className="text-sm font-semibold text-steel">Status
              <select id={`task-status-${id}`} name="status" defaultValue={status} className="field mt-1 min-h-11">
                {TASK_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label htmlFor={`task-priority-${id}`} className="text-sm font-semibold text-steel">Priorität
              <select id={`task-priority-${id}`} name="priority" defaultValue={priority} className="field mt-1 min-h-11">
                {TASK_PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label htmlFor={`task-due-${id}`} className="text-sm font-semibold text-steel">Fällig (Berlin)
              <input id={`task-due-${id}`} name="dueAt" type="datetime-local" defaultValue={dueInput} className="field mt-1 min-h-11" />
            </label>
            <p className="text-sm text-steel md:col-span-3">Ein leeres Datumsfeld entfernt den Termin. Status und Priorität lassen sich unabhängig davon ändern.</p>
            <button type="submit" className={`${ACTION} md:justify-self-start`}><Save aria-hidden="true" className="h-4 w-4" /> Änderungen speichern</button>
          </fieldset>
        </form>
      )}
      {busy && <p role="status" className="text-sm text-steel">Änderung wird gespeichert und die Ansicht aktualisiert …</p>}
      {message && <p role={message.kind === "error" ? "alert" : "status"} className={`rounded-xl px-3 py-2 text-sm ${message.kind === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{message.text}</p>}
    </div>
  );
}
