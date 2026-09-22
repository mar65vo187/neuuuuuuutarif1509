"use client";

import { Loader2, UserCheck, WandSparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type StatusOption = { value: string; label: string };

export function BulkToolbar({
  entity,
  selectedIds,
  statusOptions,
  allowAssignToMe = false,
  assignees = [],
  onCompleted,
}: {
  entity: "lead" | "order" | "task";
  selectedIds: number[];
  statusOptions: StatusOption[];
  allowAssignToMe?: boolean;
  assignees?: Array<{ id: number; name: string }>;
  onCompleted: () => void;
}) {
  const router = useRouter();
  const saving = useRef(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<"status" | "assign" | "assignEmployee" | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  if (selectedIds.length === 0) return null;

  async function run(action: "status" | "assign_to_me" | "assign_employee", value?: string) {
    if (saving.current) return;
    if (action === "status" && !value) {
      setMessage({ kind: "error", text: "Bitte zuerst einen Status auswählen." });
      return;
    }
    if (entity === "order" && action === "status" && (value === "cancelled" || value === "storno")) {
      const label = value === "storno" ? "Storno" : "Storniert";
      if (!window.confirm(selectedIds.length + " Aufträge auf „" + label + "“ setzen? Stornierte Aufträge können nicht reaktiviert werden.")) return;
    }
    if (entity === "lead" && action === "status" && (value === "abgeschlossen" || value === "verloren")) {
      const label = value === "abgeschlossen" ? "Abgeschlossen" : "Nicht zustande";
      if (!window.confirm(`${selectedIds.length} Leads auf „${label}“ setzen? Offene CRM-Wiedervorlagen werden beendet.`)) return;
    }

    saving.current = true;
    setBusy(action === "status" ? "status" : action === "assign_employee" ? "assignEmployee" : "assign");
    setMessage(null);
    try {
      const response = await fetch("/api/portal/enterprise/bulk", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, ids: selectedIds, action, value, employeeId: action === "assign_employee" ? Number(employeeId) : undefined }),
        signal: AbortSignal.timeout(entity === "order" ? 45000 : 20000),
      });
      const json = await response.json().catch(() => null) as {
        ok?: boolean;
        changed?: number;
        failedCount?: number;
        failed?: Array<{ id: number; error: string }>;
        error?: string;
      } | null;
      if (response.status === 401) {
        window.location.replace("/portal/login?next=" + encodeURIComponent(window.location.pathname + window.location.search));
        return;
      }
      if (!response.ok || !json?.ok) {
        const detail = json?.failed?.[0]?.error;
        throw new Error(detail || json?.error || "Bulk-Aktion fehlgeschlagen.");
      }
      const changed = json.changed ?? 0;
      const failed = json.failedCount ?? 0;
      setMessage({
        kind: failed ? "error" : "ok",
        text: failed ? changed + " geändert · " + failed + " konnten nicht geändert werden." : changed + " Datensätze aktualisiert.",
      });
      if (!failed) onCompleted();
      router.refresh();
    } catch (cause) {
      setMessage({ kind: "error", text: cause instanceof Error ? cause.message : "Bulk-Aktion fehlgeschlagen." });
    } finally {
      saving.current = false;
      setBusy(null);
    }
  }

  return (
    <div className="sticky top-[74px] z-10 rounded-[18px] border border-electric/20 bg-white/95 p-3 shadow-soft backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-11 items-center rounded-full bg-ink px-3 text-sm font-extrabold text-white">{selectedIds.length} ausgewählt</span>
        <select aria-label="Status für ausgewählte Datensätze" value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 min-w-[180px] rounded-xl border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-electric">
          <option value="">Status wählen…</option>
          {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <button type="button" onClick={() => run("status", status)} disabled={busy !== null || !status} className="inline-flex h-11 items-center gap-2 rounded-full bg-electric px-3.5 text-sm font-semibold text-white disabled:opacity-50">
          {busy === "status" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WandSparkles className="h-3.5 w-3.5" />} Status anwenden
        </button>
        {allowAssignToMe && <button type="button" onClick={() => run("assign_to_me")} disabled={busy !== null} className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-sm font-semibold hover:border-electric/30 disabled:opacity-50">{busy === "assign" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />} Mir zuweisen</button>}
        {entity === "lead" && assignees.length > 0 && <><select aria-label="Zuständigen Mitarbeiter wählen" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="h-11 min-w-[180px] rounded-xl border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-electric"><option value="">Mitarbeiter wählen…</option>{assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select><button type="button" onClick={() => run("assign_employee")} disabled={busy !== null || !employeeId} className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-sm font-semibold hover:border-electric/30 disabled:opacity-50">{busy === "assignEmployee" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />} Zuweisen</button></>}
        <button type="button" onClick={onCompleted} disabled={busy !== null} className="ml-auto grid h-11 w-11 place-items-center rounded-full text-steel hover:bg-paper hover:text-ink" aria-label="Auswahl aufheben"><X className="h-4 w-4" /></button>
      </div>
      {message && <p role={message.kind === "error" ? "alert" : "status"} className={"mt-2 text-sm font-semibold " + (message.kind === "ok" ? "text-emerald-700" : "text-amber-800")}>{message.text}</p>}
    </div>
  );
}
