"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { BulkToolbar } from "@/components/portal/BulkToolbar";
import { TaskActions } from "@/components/portal/TaskActions";
import { formatDate } from "@/components/portal/ui";

type Row = {
  id: number;
  title: string;
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

const STATUS_OPTIONS = [
  { value: "open", label: "Offen" },
  { value: "in_progress", label: "In Arbeit" },
  { value: "completed", label: "Erledigt" },
  { value: "cancelled", label: "Abgebrochen" },
];

export function TaskBulkList({ rows }: { rows: Row[] }) {
  const [selected, setSelected] = useState<number[]>([]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = rows.length > 0 && selected.length === rows.length;

  function toggle(id: number) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-line bg-paper/60 px-5 py-3 sm:px-6">
        <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : rows.map((row) => row.id))} className="h-4 w-4 rounded border-line" aria-label="Alle Aufgaben auswählen" />
        <p className="text-[11.5px] font-semibold text-steel">Mehrfachauswahl</p>
      </div>
      {selected.length > 0 && <div className="px-3 pt-3 sm:px-4"><BulkToolbar entity="task" selectedIds={selected} statusOptions={STATUS_OPTIONS} onCompleted={() => setSelected([])} /></div>}
      <ul className="divide-y divide-line">
        {rows.map((task) => {
          const href = task.entityHref || "/portal/aufgaben";
          return (
            <li key={task.id} className={"grid grid-cols-[auto_1fr] " + (selectedSet.has(task.id) ? "bg-electric/[0.035]" : "")}>
              <label className="grid w-12 place-items-center border-r border-line/70 sm:w-14"><input type="checkbox" checked={selectedSet.has(task.id)} onChange={() => toggle(task.id)} className="h-4 w-4 rounded border-line" aria-label={task.title + " auswählen"} /></label>
              <div className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-5">
                <Link href={href} className="min-w-0 hover:text-electric-deep">
                  <div className="flex items-center gap-2"><p className="truncate text-[14px] font-bold">{task.title}</p>{task.overdue && <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" aria-label="überfällig" />}</div>
                  <p className="mt-0.5 text-[12.5px] font-semibold text-platinum">{task.entityType === "general" ? "Allgemeine Aufgabe" : task.entityTitle || (task.entityType + " #" + task.entityId)}</p>
                  {task.entitySubtitle && <p className="mt-0.5 text-[11.5px] text-steel">{task.entitySubtitle}</p>}
                  <p className="mt-1 text-[11.5px] text-steel">Fällig {formatDate(task.dueAt)} · {task.assigneeName || "nicht zugewiesen"} · Priorität: {task.priority} · Status: {task.status}</p>
                </Link>
                <TaskActions id={task.id} status={task.status} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
