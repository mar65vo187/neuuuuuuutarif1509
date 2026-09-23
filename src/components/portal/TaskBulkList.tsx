"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CalendarClock, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BulkToolbar } from "@/components/portal/BulkToolbar";
import { TaskActions, TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "@/components/portal/TaskActions";
import { formatDate } from "@/components/portal/ui";

type Row = {
  id: number;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueAt: string | null;
  entityType: string;
  entityId: number;
  assigneeName: string | null;
  overdue: boolean;
  entityTitle: string | null;
  entitySubtitle: string | null;
  entityHref: string | null;
};

const ENTITY_LABELS: Record<string, string> = { general: "Allgemeine Aufgabe", lead: "Lead", customer: "Kunde", order: "Auftrag", service_case: "Servicefall" };
const PRIORITY_STYLE: Record<string, string> = { critical: "border-red-200 bg-red-50 text-red-800", high: "border-amber-200 bg-amber-50 text-amber-800", normal: "border-line bg-paper text-ink", low: "border-line bg-paper text-steel" };

export function TaskBulkList({ rows, assignees = [] }: { rows: Row[]; assignees?: Array<{ id: number; name: string }> }) {
  const [selected, setSelected] = useState<number[]>([]);
  const visibleIds = useMemo(() => new Set(rows.map((row) => row.id)), [rows]);
  const visibleSelected = selected.filter((id) => visibleIds.has(id));
  const selectedSet = new Set(visibleSelected);
  const allSelected = rows.length > 0 && visibleSelected.length === rows.length;
  const partialSelected = visibleSelected.length > 0 && !allSelected;
  const allCheckbox = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (allCheckbox.current) allCheckbox.current.indeterminate = partialSelected;
  }, [partialSelected]);

  function toggle(id: number) {
    setSelected((current) => {
      const visible = current.filter((value) => visibleIds.has(value));
      return visible.includes(id) ? visible.filter((value) => value !== id) : [...visible, id];
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper/60 px-4 py-2 sm:px-6">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-steel">
          <input ref={allCheckbox} type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : rows.map((row) => row.id))} className="h-5 w-5 rounded border-line accent-electric" />
          Alle Aufgaben auf dieser Seite auswählen
        </label>
        <p className="text-sm text-steel">{visibleSelected.length} von {rows.length} ausgewählt</p>
      </div>
      {visibleSelected.length > 0 && <div className="px-3 pt-3 sm:px-4"><BulkToolbar entity="task" selectedIds={visibleSelected} statusOptions={TASK_STATUS_OPTIONS} assignees={assignees} onCompleted={() => setSelected([])} /></div>}
      <ul className="divide-y divide-line">
        {rows.map((task) => (
          <li key={task.id} className={`grid grid-cols-[44px_minmax(0,1fr)] ${selectedSet.has(task.id) ? "bg-electric/[0.06]" : ""}`}>
            <label className="flex min-h-11 cursor-pointer items-start justify-center border-r border-line/70 pt-5">
              <input type="checkbox" checked={selectedSet.has(task.id)} onChange={() => toggle(task.id)} className="h-5 w-5 rounded border-line accent-electric" aria-label={`${task.title} auswählen`} />
            </label>
            <article aria-labelledby={`task-title-${task.id}`} className="min-w-0 space-y-4 px-4 py-4 sm:px-5">
              <div>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 id={`task-title-${task.id}`} className="min-w-0 break-words text-base font-bold text-ink">{task.title}</h2>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-lg border px-2 py-1 text-sm font-semibold ${PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.normal}`}>Priorität: {TASK_PRIORITY_OPTIONS.find((option) => option.value === task.priority)?.label ?? task.priority}</span>
                    <span className="rounded-lg border border-line bg-paper px-2 py-1 text-sm font-semibold text-ink">{TASK_STATUS_OPTIONS.find((option) => option.value === task.status)?.label ?? task.status}</span>
                  </div>
                </div>
                {task.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-steel">{task.description}</p>}
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm leading-relaxed">
                  <p className={`inline-flex items-start gap-2 ${task.overdue ? "font-semibold text-red-800" : "text-steel"}`}>
                    {task.overdue ? <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /> : <CalendarClock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />}
                    <span>{task.overdue ? "Überfällig · " : ""}Fällig (Berlin): {task.dueAt ? <time dateTime={task.dueAt}>{formatDate(task.dueAt)}</time> : "Ohne Termin"}</span>
                  </p>
                  <p className="inline-flex items-start gap-2 text-steel"><UserRound aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span>Zuständig: {task.assigneeName || "Nicht zugewiesen"}</span></p>
                </div>
                {task.entityType === "general" ? <p className="mt-3 text-sm text-steel">Allgemeine Aufgabe</p> : task.entityHref ? (
                  <Link href={task.entityHref} className="mt-2 inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg py-2 text-sm font-semibold text-electric-deep hover:underline"><span className="break-words">{ENTITY_LABELS[task.entityType] ?? "Bezug"}: {task.entityTitle || `#${task.entityId}`}</span><ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" /></Link>
                ) : <p className="mt-3 text-sm text-steel">Verknüpfter Datensatz nicht verfügbar.</p>}
                {task.entitySubtitle && <p className="break-words text-sm text-steel">{task.entitySubtitle}</p>}
              </div>
              <TaskActions key={`${task.id}:${task.status}:${task.priority}:${task.dueAt ?? ""}`} id={task.id} title={task.title} status={task.status} priority={task.priority} dueAt={task.dueAt} />
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
