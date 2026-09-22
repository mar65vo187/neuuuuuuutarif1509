"use client";

import { CheckCircle2, Loader2, Save, UserRoundCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

type Assignee = { id: number; name: string };

export function ServiceCaseManager({
  id,
  status,
  priority,
  ownerEmployeeId,
  resolution,
  canAssign,
  assignees,
}: {
  id: number;
  status: string;
  priority: string;
  ownerEmployeeId: number | null;
  resolution: string | null;
  canAssign: boolean;
  assignees: Assignee[];
}) {
  const router = useRouter();
  const saving = useRef(false);
  const [selectedStatus, setSelectedStatus] = useState(status);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    const form = new FormData(event.currentTarget);
    const rawOwner = String(form.get("ownerEmployeeId") ?? "");
    const payload = {
      status: String(form.get("status") || status),
      priority: String(form.get("priority") || priority),
      ...(canAssign ? { ownerEmployeeId: rawOwner ? Number(rawOwner) : null } : {}),
      note: String(form.get("note") || ""),
      resolution: String(form.get("resolution") || ""),
    };
    saving.current = true;
    setBusy(true);
    setState(null);
    try {
      const response = await fetch(`/api/portal/service-cases/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Servicefall konnte nicht gespeichert werden.");
      setState({ type: "success", text: "Servicefall aktualisiert und im Audit protokolliert." });
      (event.currentTarget.elements.namedItem("note") as HTMLTextAreaElement | null)?.setAttribute("value", "");
      router.refresh();
    } catch (cause) {
      setState({ type: "error", text: cause instanceof Error ? cause.message : "Servicefall konnte nicht gespeichert werden." });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  const closing = selectedStatus === "resolved" || selectedStatus === "closed";

  return (
    <form onSubmit={submit} className="space-y-4 rounded-[22px] border border-line bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2"><UserRoundCheck className="h-4 w-4 text-electric-deep" aria-hidden="true" /><h2 className="text-[15px] font-extrabold">Fallsteuerung</h2></div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1.5 text-xs font-bold">
          Status
          <select name="status" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="field h-11 font-normal">
            <option value="open">Offen</option>
            <option value="in_progress">In Bearbeitung</option>
            <option value="waiting_customer">Wartet auf Kunde</option>
            <option value="waiting_provider">Wartet auf Provider</option>
            <option value="resolved">Gelöst</option>
            <option value="closed">Geschlossen</option>
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-bold">
          Priorität
          <select name="priority" defaultValue={priority} className="field h-11 font-normal">
            <option value="critical">Kritisch</option>
            <option value="high">Hoch</option>
            <option value="normal">Normal</option>
            <option value="low">Niedrig</option>
          </select>
        </label>
        {canAssign && (
          <label className="space-y-1.5 text-xs font-bold md:col-span-2">
            Zuständig
            <select name="ownerEmployeeId" defaultValue={ownerEmployeeId ? String(ownerEmployeeId) : ""} className="field h-11 font-normal">
              <option value="">Nicht zugewiesen</option>
              {assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </label>
        )}
      </div>
      <label className="block space-y-1.5 text-xs font-bold">
        Interne Notiz
        <textarea name="note" maxLength={3000} rows={3} className="field resize-y py-3 font-normal" placeholder="Was wurde geprüft oder ist als Nächstes zu tun?" />
      </label>
      <label className="block space-y-1.5 text-xs font-bold">
        Lösung {closing ? "*" : ""}
        <textarea name="resolution" defaultValue={resolution ?? ""} required={closing} maxLength={3000} rows={3} className="field resize-y py-3 font-normal" placeholder="Lösung nachvollziehbar dokumentieren" />
      </label>
      {state && <p role={state.type === "error" ? "alert" : "status"} className={"rounded-xl border px-3 py-2 text-[12px] font-semibold " + (state.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>{state.text}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-ink px-4 text-[12px] font-extrabold text-white hover:bg-electric-deep disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : closing ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          Änderungen speichern
        </button>
      </div>
    </form>
  );
}
