"use client";

import { Loader2, Save, ShieldCheck } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type CustomerOption = { id: number; customerNumber: string; name: string };
type OrderOption = { id: number; customerId: number; externalOrderId: string | null; status: string };
type AssigneeOption = { id: number; name: string };

export function ServiceCaseCreateForm({
  customers,
  orders,
  assignees,
  canAssign,
  initialCustomerId,
  initialOrderId,
  currentUserId,
}: {
  customers: CustomerOption[];
  orders: OrderOption[];
  assignees: AssigneeOption[];
  canAssign: boolean;
  initialCustomerId?: number;
  initialOrderId?: number;
  currentUserId: number;
}) {
  const router = useRouter();
  const saving = useRef(false);
  const [customerId, setCustomerId] = useState(initialCustomerId ? String(initialCustomerId) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const filteredOrders = useMemo(() => {
    const id = Number(customerId);
    return Number.isSafeInteger(id) && id > 0 ? orders.filter((order) => order.customerId === id) : [];
  }, [customerId, orders]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    const form = new FormData(event.currentTarget);
    const parsedCustomerId = Number(form.get("customerId"));
    const parsedOrderId = Number(form.get("orderId"));
    const parsedOwnerId = Number(form.get("ownerEmployeeId"));
    if (!Number.isSafeInteger(parsedCustomerId) || parsedCustomerId < 1) {
      setError("Bitte einen Kunden auswählen.");
      return;
    }

    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const payload = {
        customerId: parsedCustomerId,
        orderId: Number.isSafeInteger(parsedOrderId) && parsedOrderId > 0 ? parsedOrderId : null,
        ...(canAssign && Number.isSafeInteger(parsedOwnerId) && parsedOwnerId > 0 ? { ownerEmployeeId: parsedOwnerId } : {}),
        type: String(form.get("type") || "general"),
        priority: String(form.get("priority") || "normal"),
        subject: String(form.get("subject") || ""),
        description: String(form.get("description") || ""),
      };
      const response = await fetch("/api/portal/service-cases", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; id?: number; error?: string } | null;
      if (!response.ok || !json?.ok || !json.id) throw new Error(json?.error ?? "Servicefall konnte nicht erstellt werden.");
      router.push(`/portal/service/${json.id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Servicefall konnte nicht erstellt werden.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="space-y-1.5 text-xs font-bold text-ink">
          Kunde *
          <select name="customerId" required value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="field h-11 font-normal">
            <option value="">Kunde auswählen</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customerNumber} · {customer.name}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-bold text-ink">
          Auftrag
          <select name="orderId" defaultValue={initialOrderId ? String(initialOrderId) : ""} disabled={!customerId} className="field h-11 font-normal disabled:opacity-50">
            <option value="">Kein konkreter Auftrag</option>
            {filteredOrders.map((order) => <option key={order.id} value={order.id}>{order.externalOrderId || `Auftrag #${order.id}`} · {order.status}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-bold text-ink">
          Fallart *
          <select name="type" defaultValue="general" className="field h-11 font-normal">
            <option value="general">Allgemeiner Service</option>
            <option value="complaint">Reklamation / Beschwerde</option>
            <option value="provider_issue">Providerfall</option>
            <option value="billing">Abrechnung</option>
            <option value="cancellation">Kündigung / Retention</option>
            <option value="documents">Unterlagen</option>
            <option value="technical">Technischer Fall</option>
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-bold text-ink">
          Priorität *
          <select name="priority" defaultValue="normal" className="field h-11 font-normal">
            <option value="critical">Kritisch</option>
            <option value="high">Hoch</option>
            <option value="normal">Normal</option>
            <option value="low">Niedrig</option>
          </select>
        </label>
        {canAssign && (
          <label className="space-y-1.5 text-xs font-bold text-ink lg:col-span-2">
            Zuständig
            <select name="ownerEmployeeId" defaultValue={String(currentUserId)} className="field h-11 font-normal">
              {assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </label>
        )}
      </div>

      <label className="block space-y-1.5 text-xs font-bold text-ink">
        Betreff *
        <input name="subject" required minLength={3} maxLength={180} className="field h-11 font-normal" placeholder="Kurz und eindeutig, z. B. Aktivierung seit 7 Tagen ohne Status" />
      </label>
      <label className="block space-y-1.5 text-xs font-bold text-ink">
        Sachverhalt
        <textarea name="description" maxLength={4000} rows={6} className="field min-h-36 resize-y py-3 font-normal" placeholder="Was ist passiert, was wurde bereits geprüft, welche Rückmeldung liegt vor?" />
      </label>

      <div className="rounded-2xl border border-electric/15 bg-electric/[0.04] p-4 text-[12px] leading-relaxed text-steel">
        <p className="flex items-center gap-2 font-extrabold text-ink"><ShieldCheck className="h-4 w-4 text-electric-deep" aria-hidden="true" /> Kontrollierter Workflow</p>
        <p className="mt-1">Die Fälligkeit wird automatisch aus der zentralen Service-SLA-Policy berechnet. Der Fall erzeugt eine interne Aufgabe; es wird keine Nachricht an den Kunden oder Provider automatisch versendet.</p>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-800">{error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-electric px-5 text-sm font-extrabold text-white hover:bg-electric-deep disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          Servicefall anlegen
        </button>
      </div>
    </form>
  );
}
