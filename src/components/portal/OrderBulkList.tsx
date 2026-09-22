"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BulkToolbar } from "@/components/portal/BulkToolbar";
import { formatDate } from "@/components/portal/ui";

type Row = {
  id: number;
  orderNumber: string;
  customerName: string;
  providerName: string;
  productName: string | null;
  advisorName: string | null;
  updatedAt: string;
  status: string;
  expectedCommission: string | null;
  operationalAttention: boolean;
  providerWarning: boolean;
};

const STATUS_OPTIONS = [
  ["draft","Entwurf"],["documents_missing","Unterlagen fehlen"],["ready_to_submit","Einreichbereit"],["submitted","Eingereicht"],
  ["provider_review","Provider-Prüfung"],["accepted","Angenommen"],["activation_pending","Aktivierung offen"],["active","Aktiv"],
  ["rejected","Abgelehnt"],["cancelled","Storniert"],["storno","Storno"],
].map(([value,label]) => ({ value, label }));

const LABELS = Object.fromEntries(STATUS_OPTIONS.map((option) => [option.value, option.label]));

export function OrderBulkList({ rows, showCommission, canEdit, canCancel, assignees = [] }: { rows: Row[]; showCommission: boolean; canEdit: boolean; canCancel: boolean; assignees?: Array<{ id: number; name: string }> }) {
  const [selected, setSelected] = useState<number[]>([]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = rows.length > 0 && selected.length === rows.length;
  const availableStatusOptions = canCancel
    ? STATUS_OPTIONS
    : STATUS_OPTIONS.filter((option) => !["cancelled", "storno"].includes(option.value));

  function toggle(id: number) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  return (
    <div>
      {canEdit ? (
        <>
          <div className="flex items-center gap-3 border-b border-line bg-paper/60 px-5 py-3 sm:px-6">
            <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? [] : rows.map((row) => row.id))} className="h-4 w-4 rounded border-line" aria-label="Alle Aufträge auswählen" />
            <p className="text-[11.5px] font-semibold text-steel">Mehrfachauswahl · Storno nur mit Sicherheitsabfrage</p>
          </div>
          {selected.length > 0 && <div className="px-3 pt-3 sm:px-4"><BulkToolbar entity="order" selectedIds={selected} statusOptions={availableStatusOptions} assignees={assignees} onCompleted={() => setSelected([])} /></div>}
        </>
      ) : (
        <div className="border-b border-line bg-paper/60 px-5 py-3 text-[11.5px] font-semibold text-steel sm:px-6">Nur Leserechte · Änderungen sind für diese Rolle deaktiviert.</div>
      )}
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li key={row.id} className={(canEdit ? "grid grid-cols-[auto_1fr] " : "") + (selectedSet.has(row.id) ? "bg-electric/[0.035]" : "")}>
            {canEdit && <label className="grid w-12 place-items-center border-r border-line/70 sm:w-14"><input type="checkbox" checked={selectedSet.has(row.id)} onChange={() => toggle(row.id)} className="h-4 w-4 rounded border-line" aria-label={row.orderNumber + " auswählen"} /></label>}
            <Link href={"/portal/auftraege/" + row.id} className="grid gap-3 px-4 py-4 hover:bg-paper sm:grid-cols-[1fr_auto] sm:items-center sm:px-5">
              <div><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{row.orderNumber}</p><span className="text-[12px] text-steel">{row.customerName}</span>{row.operationalAttention && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-800">SLA prüfen</span>}{row.providerWarning && <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10.5px] font-bold text-red-700">Provider prüfen</span>}</div><p className="mt-0.5 text-[13px] text-steel">{row.providerName} · {row.productName || "ohne Produkt"} · {row.advisorName || "ohne Berater"} · {formatDate(row.updatedAt)}</p></div>
              <div className="flex items-center gap-2"><span className="chip border-line bg-white">{LABELS[row.status] ?? row.status}</span>{showCommission && row.expectedCommission && <span className="text-[13px] font-semibold">{Number(row.expectedCommission).toLocaleString("de-DE",{style:"currency",currency:"EUR"})}</span>}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
