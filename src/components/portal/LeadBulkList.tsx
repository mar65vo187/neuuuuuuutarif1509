"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { BulkToolbar } from "@/components/portal/BulkToolbar";
import { StatusBadge, TypeBadge, formatDate } from "@/components/portal/ui";
import { LEAD_STATUS_LABELS } from "@/lib/content";

type Row = {
  id: number;
  name: string;
  topic: string | null;
  region: string | null;
  preferredChannel: string | null;
  preferredTime: string | null;
  createdAt: string;
  advisorName: string | null;
  assignedName: string | null;
  type: string;
  status: string;
};

const STATUS_OPTIONS = Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => ({ value, label }));

export function LeadBulkList({ rows, assignees = [] }: { rows: Row[]; assignees?: Array<{ id: number; name: string }> }) {
  const [selected, setSelected] = useState<number[]>([]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = rows.length > 0 && selected.length === rows.length;

  function toggle(id: number) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-line bg-paper/60 px-5 py-3 sm:px-6">
        <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : rows.map((row) => row.id))} className="h-4 w-4 rounded border-line" aria-label="Alle Leads auswählen" />
        <p className="text-[11.5px] font-semibold text-steel">{allSelected ? "Alle ausgewählt" : "Mehrfachauswahl"}</p>
      </div>
      {selected.length > 0 && <div className="px-3 pt-3 sm:px-4"><BulkToolbar entity="lead" selectedIds={selected} statusOptions={STATUS_OPTIONS} allowAssignToMe assignees={assignees} onCompleted={() => setSelected([])} /></div>}
      <ul className="divide-y divide-line">
        {rows.map((lead) => (
          <li key={lead.id} className={"grid grid-cols-[auto_1fr] items-stretch " + (selectedSet.has(lead.id) ? "bg-electric/[0.035]" : "")}>
            <label className="grid w-12 place-items-center border-r border-line/70 sm:w-14"><input type="checkbox" checked={selectedSet.has(lead.id)} onChange={() => toggle(lead.id)} className="h-4 w-4 rounded border-line" aria-label={lead.name + " auswählen"} /></label>
            <Link href={"/portal/leads/" + lead.id} className="grid gap-3 px-4 py-4 transition-colors hover:bg-paper sm:grid-cols-[1fr_auto] sm:items-center sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><p className="text-[15.5px] font-bold">{lead.name}</p><span className="text-[12px] text-steel">#{lead.id}</span>{lead.status === "neu" && <span className="h-2 w-2 rounded-full bg-electric" aria-label="neu" />}</div>
                <p className="mt-0.5 truncate text-[13.5px] text-steel">{lead.topic ?? "Ohne Thema"} · {lead.region ?? "Region offen"} · {lead.preferredChannel ?? "Kanal offen"}{lead.preferredTime ? " · Wunsch: " + lead.preferredTime : ""}</p>
                <p className="mt-0.5 text-[12.5px] text-steel">{formatDate(lead.createdAt)}{lead.advisorName ? " · für " + lead.advisorName : ""}{lead.assignedName ? " · bearbeitet von " + lead.assignedName : " · noch nicht übernommen"}</p>
              </div>
              <div className="flex items-center gap-2 sm:justify-end"><TypeBadge type={lead.type} /><StatusBadge status={lead.status} /><ArrowRight className="hidden h-4 w-4 text-steel sm:block" /></div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
