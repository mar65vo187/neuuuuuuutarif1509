"use client";

import Link from "next/link";
import { AlarmClock, ArrowRight, CalendarPlus, Mail, Network, PackageCheck, Phone, Sparkles } from "lucide-react";
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
  phone: string | null;
  email: string | null;
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
  companyName?: string | null;
  audience?: "b2c" | "b2b" | null;
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

export function LeadBulkList({
  rows,
  assignees = [],
  canEdit = true,
  canAssign = false,
}: {
  rows: Row[];
  assignees?: Array<{ id: number; name: string }>;
  canEdit?: boolean;
  canAssign?: boolean;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  // A refresh may remove records even without a route change. Never submit stale IDs.
  const visibleIds = useMemo(() => new Set(rows.map((row) => row.id)), [rows]);
  const visibleSelected = selected.filter((id) => visibleIds.has(id));
  const selectedSet = new Set(visibleSelected);
  const allSelected = rows.length > 0 && visibleSelected.length === rows.length;
  const partiallySelected = visibleSelected.length > 0 && !allSelected;

  function toggle(id: number) {
    setSelected((current) => {
      const visible = current.filter((value) => visibleIds.has(value));
      return visible.includes(id) ? visible.filter((value) => value !== id) : [...visible, id];
    });
  }

  return (
    <div>
      {canEdit && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper/60 px-4 py-2 sm:px-5">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-xs font-bold text-ink">
              <input type="checkbox" checked={allSelected} ref={(input) => { if (input) input.indeterminate = partiallySelected; }} onChange={() => setSelected(allSelected ? [] : rows.map((row) => row.id))} className="h-5 w-5 rounded border-line accent-electric" />
              {allSelected ? "Alle auf dieser Seite ausgewählt" : "Diese Seite auswählen"}
            </label>
            <p role="status" className="text-xs text-steel">{visibleSelected.length ? `${visibleSelected.length} von ${rows.length} ausgewählt` : `${rows.length} Leads auf dieser Seite`}</p>
          </div>
          {visibleSelected.length > 0 && <div className="px-3 pt-3 sm:px-4"><BulkToolbar entity="lead" selectedIds={visibleSelected} statusOptions={STATUS_OPTIONS} allowAssignToMe={canAssign} assignees={canAssign ? assignees : []} onCompleted={() => setSelected([])} /></div>}
        </>
      )}
      <ul className="divide-y divide-line" aria-label="Lead-Ergebnisse">
        {rows.map((lead) => {
          const isClosed = lead.status === "abgeschlossen" || lead.status === "verloren";
          const hiddenProducts = Math.max(0, lead.existingProductNames.length - 2) + Math.max(0, lead.interestProductNames.length - 2) + Math.max(0, lead.soldProductNames.length - 2);
          return (
            <li key={lead.id} className={`flex min-w-0 items-stretch ${selectedSet.has(lead.id) ? "bg-electric/[0.06]" : ""}`}>
              {canEdit && <label className="flex w-11 shrink-0 cursor-pointer items-start justify-center border-r border-line/70 pt-7 sm:w-12"><input type="checkbox" checked={selectedSet.has(lead.id)} onChange={() => toggle(lead.id)} className="h-5 w-5 rounded border-line accent-electric" aria-label={`${lead.name || `Lead #${lead.id}`} auswählen`} /></label>}
              <article aria-labelledby={`lead-name-${lead.id}`} className="min-w-0 flex-1 px-3 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <h3 id={`lead-name-${lead.id}`}><Link href={`/portal/leads/${lead.id}`} className="inline-flex min-h-11 items-center gap-2 break-words text-base font-extrabold text-ink hover:text-electric-deep">{lead.name || `Lead #${lead.id}`}<ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-steel" /></Link></h3>
                    {lead.companyName && <p className="break-words text-sm font-bold text-ink-700">{lead.companyName}</p>}
                    <p className="text-xs leading-relaxed text-steel">#{lead.id} · {lead.topic || "Thema noch offen"}{lead.audience === "b2b" ? " · Geschäftskunde" : ""}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5"><StatusBadge status={lead.status} /><span className={`chip px-2 py-1 text-[11px] ${PRIORITY_STYLES[lead.priority] ?? PRIORITY_STYLES.normal}`}>{LEAD_PRIORITY_LABELS[lead.priority] ?? lead.priority}</span></div>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)]">
                  <div className="min-w-0 space-y-2">
                    {(lead.phone || lead.email) ? <div className="flex flex-wrap gap-2">
                      {lead.phone && <a href={`tel:${lead.phone.replace(/[^+0-9*#,;]/g, "")}`} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink hover:border-electric/40" aria-label={`${lead.name} anrufen: ${lead.phone}`}><Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-electric-deep" /><span className="break-all">{lead.phone}</span></a>}
                      {lead.email && <a href={`mailto:${lead.email}`} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink hover:border-electric/40" aria-label={`E-Mail an ${lead.name}: ${lead.email}`}><Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-electric-deep" /><span className="truncate">{lead.email}</span></a>}
                    </div> : <p className="text-xs text-amber-800">Telefon und E-Mail fehlen noch.</p>}
                    <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs leading-relaxed text-steel"><span>Angelegt von: <strong className="font-semibold text-ink-700">{lead.createdByName ?? "Website / System"}</strong></span><span>Zuständig: <strong className="font-semibold text-ink-700">{lead.assignedName ?? "Noch offen"}</strong></span></p>
                    {lead.contactOutcome !== "open" && <p className="text-xs text-steel">Letzter Kontakt: <span className="font-semibold text-ink-700">{LEAD_CONTACT_OUTCOME_LABELS[lead.contactOutcome] ?? lead.contactOutcome}</span></p>}
                  </div>
                  <div className="min-w-0">
                    {lead.nextActionAt && !isClosed ? <div className={`rounded-xl border px-3 py-2.5 ${lead.nextActionOverdue ? "border-red-300/30 bg-red-50 text-red-700" : "border-line bg-paper/60 text-ink-700"}`}><p className="flex items-center gap-1.5 text-xs font-bold"><AlarmClock aria-hidden="true" className="h-4 w-4 shrink-0" />{lead.nextActionOverdue ? "Wiedervorlage überfällig" : "Nächster Schritt"}</p><p className="mt-1 text-sm font-extrabold">{formatDate(lead.nextActionAt)}</p>{canEdit && <Link href={`/portal/leads/${lead.id}#bearbeiten`} className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-xs font-bold underline underline-offset-4">Bearbeiten <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" /></Link>}</div> : !isClosed && lead.status !== "termin_bestaetigt" ? <div className="rounded-xl border border-amber-200/30 bg-amber-50 px-3 py-2.5 text-amber-800"><p className="text-xs font-bold">Noch kein nächster Schritt geplant</p>{canEdit && <Link href={`/portal/leads/${lead.id}#bearbeiten`} className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-xs font-bold underline underline-offset-4"><CalendarPlus aria-hidden="true" className="h-4 w-4" /> Wiedervorlage planen</Link>}</div> : null}
                  </div>
                </div>

                {(lead.existingProductNames.length > 0 || lead.interestProductNames.length > 0 || lead.soldProductNames.length > 0) && <div className="mt-3 flex flex-wrap gap-1.5">
                  {lead.existingProductNames.slice(0, 2).map((name, index) => <span key={`existing:${index}:${name}`} className="inline-flex max-w-full items-center gap-1 rounded-lg border border-amber-200/30 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800"><PackageCheck aria-hidden="true" className="h-3 w-3 shrink-0" /><span className="break-words">Hat: {name}</span></span>)}
                  {lead.interestProductNames.slice(0, 2).map((name, index) => <span key={`interest:${index}:${name}`} className="inline-flex max-w-full items-center gap-1 rounded-lg border border-electric/20 bg-electric/[0.07] px-2 py-1 text-[11px] font-semibold text-electric-deep"><Sparkles aria-hidden="true" className="h-3 w-3 shrink-0" /><span className="break-words">Interesse: {name}</span></span>)}
                  {lead.soldProductNames.slice(0, 2).map((name, index) => <span key={`sold:${index}:${name}`} className="inline-flex max-w-full items-center gap-1 rounded-lg border border-emerald-200/30 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800"><PackageCheck aria-hidden="true" className="h-3 w-3 shrink-0" /><span className="break-words">Abschluss: {name}</span></span>)}
                  {hiddenProducts > 0 && <Link href={`/portal/leads/${lead.id}`} className="inline-flex min-h-11 items-center px-2 text-xs font-bold text-electric-deep">+{hiddenProducts} weitere Produkte</Link>}
                </div>}

                <details className="mt-3 rounded-lg border border-line bg-paper/30 px-3">
                  <summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold text-steel">Weitere Angaben · {formatDate(lead.createdAt)}</summary>
                  <div className="flex flex-wrap items-center gap-2 border-t border-line py-3 text-xs leading-relaxed text-steel">
                    <TypeBadge type={lead.type} />
                    <span>{lead.region || "Region offen"}</span>
                    {lead.preferredChannel && <span>Kontaktweg: {lead.preferredChannel}</span>}
                    {lead.preferredTime && <span>Wunschzeit: {lead.preferredTime}</span>}
                    {lead.advisorName && <span>Wunschberater: {lead.advisorName}</span>}
                    {lead.referralSourceName && <span className="inline-flex items-center gap-1 text-electric-deep"><Network aria-hidden="true" className="h-3.5 w-3.5" /> Empfohlen von: {lead.referralSourceName}</span>}
                    {lead.tags.map((tag, index) => <span key={`${index}:${tag}`} className="rounded-lg border border-line px-2 py-1 text-ink-700">{tag}</span>)}
                  </div>
                </details>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
