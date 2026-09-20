"use client";

import Link from "next/link";
import { AlarmClock, ArrowRight, Network, PackageCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { BulkToolbar } from "@/components/portal/BulkToolbar";
import { StatusBadge, TypeBadge, formatDate } from "@/components/portal/ui";
import { LEAD_CONTACT_OUTCOME_LABELS, LEAD_PRIORITY_LABELS, LEAD_STATUS_LABELS } from "@/lib/content";

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
  createdByName: string | null;
  type: string;
  status: string;
  priority: string;
  contactOutcome: string;
  nextActionAt: string | null;
  nextActionOverdue: boolean;
  tags: string[];
  existingProductNames: string[];
  interestProductNames: string[];
  soldProductNames: string[];
  referralSourceName?: string | null;
};

const STATUS_OPTIONS = Object.entries(LEAD_STATUS_LABELS)
  .filter(([value]) => value !== "termin_bestaetigt")
  .map(([value, label]) => ({ value, label }));

const PRIORITY_STYLES: Record<string, string> = {
  low: "border-line bg-paper text-steel",
  normal: "border-line bg-white text-ink-700",
  high: "border-amber-300 bg-amber-50 text-amber-800",
  hot: "border-red-300 bg-red-50 text-red-700",
};

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
            <label className="grid w-12 place-items-center border-r border-line/70 sm:w-14"><input type="checkbox" checked={selectedSet.has(lead.id)} onChange={() => toggle(lead.id)} className="h-4 w-4 rounded border-line" aria-label={(lead.name || `Lead #${lead.id}`) + " auswählen"} /></label>
            <Link href={"/portal/leads/" + lead.id} className="grid gap-3 px-4 py-4 transition-colors hover:bg-paper sm:grid-cols-[1fr_auto] sm:items-center sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15.5px] font-bold">{lead.name || `Lead #${lead.id}`}</p>
                  <span className="text-[12px] text-steel">#{lead.id}</span>
                  {lead.status === "neu" && <span className="h-2 w-2 rounded-full bg-electric" aria-label="neu" />}
                  <span className={`chip px-2 py-0.5 text-[10.5px] ${PRIORITY_STYLES[lead.priority] ?? PRIORITY_STYLES.normal}`}>{LEAD_PRIORITY_LABELS[lead.priority] ?? lead.priority}</span>
                  {lead.contactOutcome !== "open" && <span className="chip border-line bg-paper px-2 py-0.5 text-[10.5px] text-steel">{LEAD_CONTACT_OUTCOME_LABELS[lead.contactOutcome] ?? lead.contactOutcome}</span>}
                  {lead.referralSourceName && <span className="inline-flex items-center gap-1 rounded-full border border-electric/15 bg-electric/[0.06] px-2 py-0.5 text-[10.5px] font-bold text-electric-deep"><Network className="h-3 w-3" /> Vitamin B · {lead.referralSourceName}</span>}
                </div>
                <p className="mt-0.5 truncate text-[13.5px] text-steel">{lead.topic ?? "Ohne Thema"} · {lead.region ?? "Region offen"} · {lead.preferredChannel ?? "Kanal offen"}{lead.preferredTime ? " · Wunsch: " + lead.preferredTime : ""}</p>

                {(lead.existingProductNames.length > 0 || lead.interestProductNames.length > 0 || lead.soldProductNames.length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {lead.existingProductNames.slice(0, 2).map((name) => <span key={"existing:" + name} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-800"><PackageCheck className="h-3 w-3" /> Hat: {name}</span>)}
                    {lead.interestProductNames.slice(0, 2).map((name) => <span key={"interest:" + name} className="inline-flex items-center gap-1 rounded-full border border-electric/20 bg-electric/[0.07] px-2 py-0.5 text-[10.5px] font-bold text-electric-deep"><Sparkles className="h-3 w-3" /> Interesse: {name}</span>)}
                    {lead.soldProductNames.slice(0, 2).map((name) => <span key={"sold:" + name} className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800"><PackageCheck className="h-3 w-3" /> Abschluss: {name}</span>)}
                  </div>
                )}

                {lead.nextActionAt && (
                  <p className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-bold ${lead.nextActionOverdue ? "bg-red-50 text-red-700" : "bg-white/75 text-ink-700"}`}>
                    <AlarmClock className="h-3.5 w-3.5" /> {lead.nextActionOverdue ? "Überfällig: " : "Nächste Aktion: "}{formatDate(lead.nextActionAt)}
                  </p>
                )}

                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-steel">
                  <span>{formatDate(lead.createdAt)}</span>
                  <span className="inline-flex items-center rounded-full border border-electric/15 bg-electric/[0.07] px-2 py-0.5 font-semibold text-ink-700">Angelegt von: {lead.createdByName ?? "Website / System"}</span>
                  {lead.advisorName ? <span>Wunschberater: {lead.advisorName}</span> : null}
                  <span>{lead.assignedName ? "Zuständig: " + lead.assignedName : "Noch nicht zugewiesen"}</span>
                  {lead.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full border border-champagne/25 bg-champagne/10 px-2 py-0.5 text-[10.5px] font-semibold text-ink-700">{tag}</span>)}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:justify-end"><TypeBadge type={lead.type} /><StatusBadge status={lead.status} /><ArrowRight className="hidden h-4 w-4 text-steel sm:block" /></div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
