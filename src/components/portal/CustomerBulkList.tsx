"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Network, SlidersHorizontal, Target, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/components/portal/ui";

type Row = {
  id: number;
  customerNumber: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  referredByName: string | null;
  referralCount: number;
  activeOrderCount: number;
  openOpportunityCount: number;
  reviewOverdue: boolean;
  relationshipStatus: string | null;
  crmRiskLevel: string | null;
  updatedAt: string;
  lastContactAt: string | null;
  nextReviewAt: string | null;
};

type CustomerAction = "customer_lifecycle" | "customer_relationship" | "customer_risk" | "customer_review";

const ACTIONS: Array<{ value: CustomerAction; label: string }> = [
  { value: "customer_lifecycle", label: "Lifecycle" },
  { value: "customer_relationship", label: "Beziehungsstatus" },
  { value: "customer_risk", label: "Risikostufe" },
  { value: "customer_review", label: "Bestandscheck" },
];

const VALUES: Record<CustomerAction, Array<{ value: string; label: string }>> = {
  customer_lifecycle: [
    { value: "prospect", label: "Potenzialkunde" },
    { value: "active", label: "Aktiv" },
    { value: "retention", label: "Bestandspflege" },
    { value: "dormant", label: "Ruhend" },
    { value: "closed", label: "Beendet" },
  ],
  customer_relationship: [
    { value: "new", label: "Neu" },
    { value: "developing", label: "Im Aufbau" },
    { value: "established", label: "Etabliert" },
    { value: "at_risk", label: "Gefährdet" },
    { value: "inactive", label: "Inaktiv" },
  ],
  customer_risk: [
    { value: "low", label: "Niedrig" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "Hoch" },
    { value: "critical", label: "Kritisch" },
  ],
  customer_review: [
    { value: "7", label: "In 7 Tagen" },
    { value: "30", label: "In 30 Tagen" },
    { value: "90", label: "In 90 Tagen" },
    { value: "180", label: "In 180 Tagen" },
    { value: "clear", label: "Termin entfernen" },
  ],
};

function CustomerBulkToolbar({ selectedIds, onCompleted }: { selectedIds: number[]; onCompleted: () => void }) {
  const router = useRouter();
  const saving = useRef(false);
  const [action, setAction] = useState<CustomerAction>("customer_lifecycle");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const options = VALUES[action];

  function changeAction(next: CustomerAction) {
    setAction(next);
    setValue("");
    setMessage(null);
  }

  async function run() {
    if (saving.current || !value) return;
    const selectedLabel = options.find((option) => option.value === value)?.label ?? value;
    if (
      (action === "customer_lifecycle" && value === "closed")
      || (action === "customer_relationship" && value === "inactive")
    ) {
      if (!window.confirm(`${selectedIds.length} Kunden auf „${selectedLabel}“ setzen? Die Änderung betrifft die Customer-360-Steuerung dieser Datensätze.`)) return;
    }

    saving.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/portal/enterprise/bulk", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: "customer", ids: selectedIds, action, value }),
        signal: AbortSignal.timeout(20000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; changed?: number; error?: string } | null;
      if (response.status === 401) {
        window.location.replace("/portal/login?next=" + encodeURIComponent(window.location.pathname + window.location.search));
        return;
      }
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Kunden konnten nicht aktualisiert werden.");
      const changed = json.changed ?? 0;
      setMessage({ kind: "ok", text: changed + " Kunden aktualisiert." });
      onCompleted();
      router.refresh();
    } catch (cause) {
      setMessage({ kind: "error", text: cause instanceof Error ? cause.message : "Kunden konnten nicht aktualisiert werden." });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="sticky top-[74px] z-10 rounded-[18px] border border-electric/20 bg-white/95 p-3 shadow-soft backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-11 items-center rounded-full bg-ink px-3 text-sm font-extrabold text-white">{selectedIds.length} ausgewählt</span>
        <select
          aria-label="Kundenfeld für Massenaktion"
          value={action}
          onChange={(event) => changeAction(event.target.value as CustomerAction)}
          className="h-11 min-w-[170px] rounded-xl border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-electric focus:ring-2 focus:ring-electric/15"
        >
          {ACTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <select
          aria-label="Neuer Wert für ausgewählte Kunden"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-11 min-w-[170px] rounded-xl border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-electric focus:ring-2 focus:ring-electric/15"
        >
          <option value="">Wert wählen…</option>
          {options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <button
          type="button"
          onClick={run}
          disabled={busy || !value}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-electric px-4 text-sm font-semibold text-white hover:bg-electric-deep disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SlidersHorizontal className="h-4 w-4" />} Anwenden
        </button>
        <button type="button" onClick={onCompleted} disabled={busy} className="ml-auto grid h-11 w-11 place-items-center rounded-full text-steel hover:bg-paper hover:text-ink disabled:opacity-50" aria-label="Auswahl aufheben">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-steel">Änderungen gelten nur für die ausgewählten Kunden dieser Seite und werden im Audit-Protokoll dokumentiert.</p>
      {message && <p role={message.kind === "error" ? "alert" : "status"} className={"mt-2 text-sm font-semibold " + (message.kind === "ok" ? "text-emerald-700" : "text-red-700")}>{message.text}</p>}
    </div>
  );
}

export function CustomerBulkList({ rows, canEdit }: { rows: Row[]; canEdit: boolean }) {
  const [selected, setSelected] = useState<number[]>([]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = rows.length > 0 && selected.length === rows.length;

  function toggle(id: number) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  return (
    <div>
      {canEdit ? (
        <>
          <div className="flex items-center gap-3 border-b border-line bg-paper/60 px-5 py-3 sm:px-6">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? [] : rows.map((row) => row.id))}
              className="h-4 w-4 rounded border-line"
              aria-label="Alle Kunden auf dieser Seite auswählen"
            />
            <div>
              <p className="text-[11.5px] font-semibold text-steel">Mehrfachauswahl · nur aktuelle Seite</p>
              <p className="mt-0.5 text-[10.5px] text-steel/80">Lifecycle, Beziehung, Risiko und Bestandscheck gesammelt pflegen.</p>
            </div>
          </div>
          {selected.length > 0 && <div className="px-3 pt-3 sm:px-4"><CustomerBulkToolbar selectedIds={selected} onCompleted={() => setSelected([])} /></div>}
        </>
      ) : (
        <div className="border-b border-line bg-paper/60 px-5 py-3 text-[11.5px] font-semibold text-steel sm:px-6">Nur Leserechte · Änderungen sind für diese Rolle deaktiviert.</div>
      )}

      <ul className="divide-y divide-line">
        {rows.map((customer) => {
          const name = customer.companyName || [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Ohne Name";
          return (
            <li key={customer.id} className={(canEdit ? "grid grid-cols-[auto_1fr] " : "") + (selectedSet.has(customer.id) ? "bg-electric/[0.035]" : "")}>
              {canEdit && (
                <label className="grid w-12 place-items-center border-r border-line/70 sm:w-14">
                  <input type="checkbox" checked={selectedSet.has(customer.id)} onChange={() => toggle(customer.id)} className="h-4 w-4 rounded border-line" aria-label={name + " auswählen"} />
                </label>
              )}
              <Link href={`/portal/kunden/${customer.id}`} className="grid gap-3 px-5 py-4 hover:bg-paper sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{name}</p>
                    <span className="text-[12px] text-steel">{customer.customerNumber}</span>
                    {customer.referredByName && <span className="inline-flex items-center gap-1 rounded-full border border-electric/15 bg-electric/[0.06] px-2 py-0.5 text-[10.5px] font-bold text-electric-deep"><Network className="h-3 w-3" /> von {customer.referredByName}</span>}
                    {customer.referralCount > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700"><Network className="h-3 w-3" /> {customer.referralCount} Empfehlung{customer.referralCount === 1 ? "" : "en"}</span>}
                    {customer.activeOrderCount > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> {customer.activeOrderCount} aktiv</span>}
                    {customer.openOpportunityCount > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-electric/20 bg-electric/[0.06] px-2 py-0.5 text-[10.5px] font-bold text-electric-deep"><Target className="h-3 w-3" /> {customer.openOpportunityCount} Potenzial</span>}
                    {customer.reviewOverdue && <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-800"><Clock3 className="h-3 w-3" /> Review fällig</span>}
                    {(customer.relationshipStatus === "at_risk" || customer.crmRiskLevel === "high" || customer.crmRiskLevel === "critical") && <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10.5px] font-bold text-red-700"><AlertTriangle className="h-3 w-3" /> Risiko</span>}
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-steel">{customer.email || "Keine E-Mail"} · {customer.phone || "Kein Telefon"} · {customer.city || "Ort offen"}</p>
                </div>
                <div className="text-[12px] text-steel sm:text-right">
                  <p>Aktualisiert {formatDate(customer.updatedAt)}</p>
                  {customer.lastContactAt && <p className="mt-0.5">Kontakt {formatDate(customer.lastContactAt)}</p>}
                  {customer.nextReviewAt && <p className="mt-0.5">Review {formatDate(customer.nextReviewAt)}</p>}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
