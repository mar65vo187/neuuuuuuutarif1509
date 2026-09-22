"use client";

import {
  Archive,
  BellRing,
  Check,
  CheckCheck,
  Clock3,
  ExternalLink,
  Inbox,
  Loader2,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type NotificationRow = {
  id: number;
  category: string;
  priority: string;
  subject: string;
  body: string;
  status: string;
  createdLabel: string;
  snoozedLabel: string | null;
  archived: boolean;
  actionUrl: string | null;
};

type Action = "mark_read" | "mark_unread" | "archive" | "restore" | "snooze" | "unsnooze";

const priorityLabel: Record<string, string> = {
  critical: "Kritisch",
  high: "Hoch",
  normal: "Normal",
};

const priorityClass: Record<string, string> = {
  critical: "border-red-200/60 bg-red-50 text-red-800",
  high: "border-amber-200/70 bg-amber-50 text-amber-800",
  normal: "border-line bg-paper text-steel",
};

function categoryLabel(value: string) {
  if (value === "automation") return "Automation";
  if (value === "quality") return "Qualität";
  if (value === "system") return "System";
  if (value === "service") return "Service";
  return value || "Hinweis";
}

export function NotificationInboxList({
  rows,
  unreadCount,
  view,
}: {
  rows: NotificationRow[];
  unreadCount: number;
  view: "active" | "unread" | "read" | "snoozed" | "archived";
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(id: number) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAll() {
    const ids = rows.map((row) => row.id);
    setSelected((current) => current.length === ids.length ? [] : ids);
  }

  async function run(action: Action, ids?: number[], until?: string, all = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const payload = all
        ? { action: "mark_read" as const, all: true }
        : action === "snooze"
          ? { action, ids: ids ?? [], until }
          : { action, ids: ids ?? [] };
      const response = await fetch("/api/portal/notifications", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Aktion konnte nicht ausgeführt werden.");
      setSelected([]);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Aktion konnte nicht ausgeführt werden.");
    } finally {
      setBusy(false);
    }
  }

  const selectedCount = selected.length;
  const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleAll}
            disabled={rows.length === 0 || busy}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-paper px-3 text-[12px] font-bold text-ink hover:border-electric/30 hover:text-electric-deep disabled:opacity-40"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {selectedCount === rows.length && rows.length > 0 ? "Auswahl lösen" : "Seite auswählen"}
          </button>
          {selectedCount > 0 && (
            <span className="rounded-full bg-electric/[0.08] px-3 py-1.5 text-[11px] font-extrabold text-electric-deep">
              {selectedCount} ausgewählt
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {selectedCount > 0 && view !== "archived" && (
            <>
              <button type="button" disabled={busy} onClick={() => run("mark_read", selected)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-[12px] font-bold hover:border-electric/30 hover:text-electric-deep disabled:opacity-40">
                <CheckCheck className="h-4 w-4" aria-hidden="true" /> Gelesen
              </button>
              {view === "snoozed" ? (
                <button type="button" disabled={busy} onClick={() => run("unsnooze", selected)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-[12px] font-bold hover:border-electric/30 hover:text-electric-deep disabled:opacity-40">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Jetzt anzeigen
                </button>
              ) : (
                <button type="button" disabled={busy} onClick={() => run("snooze", selected, tomorrow())} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-[12px] font-bold hover:border-electric/30 hover:text-electric-deep disabled:opacity-40">
                  <Clock3 className="h-4 w-4" aria-hidden="true" /> 24 Std. später
                </button>
              )}
              <button type="button" disabled={busy} onClick={() => run("archive", selected)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-[12px] font-bold hover:border-electric/30 hover:text-electric-deep disabled:opacity-40">
                <Archive className="h-4 w-4" aria-hidden="true" /> Archivieren
              </button>
            </>
          )}
          {selectedCount > 0 && view === "archived" && (
            <button type="button" disabled={busy} onClick={() => run("restore", selected)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-[12px] font-bold hover:border-electric/30 hover:text-electric-deep disabled:opacity-40">
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Wiederherstellen
            </button>
          )}
          {unreadCount > 0 && view !== "archived" && (
            <button type="button" disabled={busy} onClick={() => run("mark_read", undefined, undefined, true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-electric px-4 text-[12px] font-extrabold text-white hover:bg-electric-deep disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCheck className="h-4 w-4" aria-hidden="true" />}
              Alle ungelesenen gelesen
            </button>
          )}
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200/70 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-800">{error}</p>}

      {rows.length === 0 ? (
        <div className="grid min-h-72 place-items-center rounded-3xl border border-line bg-white px-6 text-center">
          <div>
            <Inbox className="mx-auto h-9 w-9 text-electric-deep" aria-hidden="true" />
            <p className="mt-3 text-[15px] font-extrabold">In dieser Ansicht ist nichts offen.</p>
            <p className="mt-1 max-w-md text-[12.5px] leading-relaxed text-steel">Filter ändern oder später wiederkommen. Snoozed Hinweise erscheinen automatisch wieder, sobald ihre Wiedervorlage fällig ist.</p>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const unread = row.status === "pending";
            return (
              <li key={row.id} className={"rounded-3xl border bg-white p-4 shadow-[0_12px_35px_rgba(8,18,34,0.04)] sm:p-5 " + (unread ? "border-electric/25" : "border-line")}>
                <div className="grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-start">
                  <label className="mt-1 inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(row.id)}
                      onChange={() => toggle(row.id)}
                      className="h-4 w-4 rounded border-line accent-[var(--color-electric)]"
                      aria-label={`Meldung ${row.subject} auswählen`}
                    />
                  </label>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] " + (priorityClass[row.priority] ?? priorityClass.normal)}>
                        {row.priority === "critical" ? <BellRing className="h-3 w-3" aria-hidden="true" /> : null}
                        {priorityLabel[row.priority] ?? row.priority}
                      </span>
                      <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[10px] font-bold text-steel">{categoryLabel(row.category)}</span>
                      {unread && <span className="rounded-full bg-electric px-2.5 py-1 text-[10px] font-extrabold text-white">Neu</span>}
                      {row.snoozedLabel && <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-1 text-[10px] font-bold text-steel"><Clock3 className="h-3 w-3" aria-hidden="true" /> bis {row.snoozedLabel}</span>}
                    </div>

                    <h2 className="mt-3 text-[15px] font-extrabold tracking-tight text-ink">{row.subject}</h2>
                    <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-steel">{row.body}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {row.actionUrl && (
                        <Link href={row.actionUrl} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-ink px-3 text-[11.5px] font-extrabold text-white hover:bg-electric-deep">
                          Vorgang öffnen <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      )}
                      {!row.archived && (
                        <button type="button" disabled={busy} onClick={() => run(unread ? "mark_read" : "mark_unread", [row.id])} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-line bg-white px-3 text-[11.5px] font-bold hover:border-electric/30 hover:text-electric-deep disabled:opacity-40">
                          {unread ? <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                          {unread ? "Als gelesen" : "Wieder ungelesen"}
                        </button>
                      )}
                      {!row.archived && view !== "snoozed" && (
                        <button type="button" disabled={busy} onClick={() => run("snooze", [row.id], tomorrow())} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-line bg-white px-3 text-[11.5px] font-bold hover:border-electric/30 hover:text-electric-deep disabled:opacity-40">
                          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Morgen
                        </button>
                      )}
                      {!row.archived && view === "snoozed" && (
                        <button type="button" disabled={busy} onClick={() => run("unsnooze", [row.id])} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-line bg-white px-3 text-[11.5px] font-bold hover:border-electric/30 hover:text-electric-deep disabled:opacity-40">
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Jetzt anzeigen
                        </button>
                      )}
                      <button type="button" disabled={busy} onClick={() => run(row.archived ? "restore" : "archive", [row.id])} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-line bg-white px-3 text-[11.5px] font-bold hover:border-electric/30 hover:text-electric-deep disabled:opacity-40">
                        {row.archived ? <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> : <Archive className="h-3.5 w-3.5" aria-hidden="true" />}
                        {row.archived ? "Wiederherstellen" : "Archivieren"}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] font-semibold text-steel sm:text-right">{row.createdLabel}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
