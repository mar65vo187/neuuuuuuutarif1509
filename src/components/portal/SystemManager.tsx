"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

type Provider = { id: number; name: string; category: string };
type Product = { id: number; providerId: number; name: string; category: string; expectedCommission: string | null };
type Automation = { id: number; name: string; eventType: string; active: boolean };

async function post(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const json = await response.json() as { ok: boolean; error?: string };
  if (!response.ok || !json.ok) throw new Error(json.error ?? "Speichern fehlgeschlagen.");
}

export function SystemManager({ providers, products, automations, canManageCommission }: { providers: Provider[]; products: Product[]; automations: Automation[]; canManageCommission: boolean }) {
  const router = useRouter();
  const saving = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventType, setEventType] = useState("lead.created");
  const [actionType, setActionType] = useState<"task" | "notification">("task");

  async function submitCatalog(event: FormEvent<HTMLFormElement>, kind: "provider" | "product") {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true; setBusy(kind); setError(null);
    const data = new FormData(event.currentTarget);
    try {
      await post("/api/portal/admin/enterprise/catalog", kind === "provider" ? {
        kind,
        name: data.get("name"),
        category: data.get("category"),
        externalPartnerId: data.get("externalPartnerId"),
      } : {
        kind,
        providerId: Number(data.get("providerId")),
        name: data.get("name"),
        category: data.get("category"),
        sku: data.get("sku"),
        expectedCommission: canManageCommission ? data.get("expectedCommission") || undefined : undefined,
      });
      event.currentTarget.reset();
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Speichern fehlgeschlagen.");
    } finally { saving.current = false; setBusy(null); }
  }

  async function submitAutomation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true; setBusy("automation"); setError(null);
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    try {
      await post("/api/portal/admin/enterprise/automations", {
        name: data.get("name"),
        eventType,
        conditions: {},
        actions: actionType === "task"
          ? [{ type: "task", title, dueMinutes: Number(data.get("dueMinutes")) || 60, priority: data.get("priority") || "normal" }]
          : [{ type: "notification", subject: data.get("subject") || "TarifWerk", body: title }],
      });
      event.currentTarget.reset();
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Automatisierung konnte nicht gespeichert werden.");
    } finally { saving.current = false; setBusy(null); }
  }

  return <div className="space-y-6">
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p>}
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={(e) => submitCatalog(e, "provider")} className="rounded-[22px] border border-line bg-white p-5 sm:p-6">
        <h2 className="text-[16px] font-extrabold">Provider anlegen</h2>
        <div className="mt-4 grid gap-3">
          <label className="label">Name<input name="name" required maxLength={160} className="field" /></label>
          <label className="label">Kategorie<input name="category" required maxLength={80} placeholder="z. B. Mobilfunk, Energie" className="field" /></label>
          <label className="label">Partner-ID<input name="externalPartnerId" maxLength={160} className="field" /></label>
        </div>
        <button disabled={busy !== null} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white hover:bg-electric disabled:opacity-50">{busy === "provider" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Provider speichern</button>
      </form>

      <form onSubmit={(e) => submitCatalog(e, "product")} className="rounded-[22px] border border-line bg-white p-5 sm:p-6">
        <h2 className="text-[16px] font-extrabold">Produkt anlegen</h2>
        <div className="mt-4 grid gap-3">
          <label className="label">Provider<select name="providerId" required className="field"><option value="">Auswählen</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className="label">Produktname<input name="name" required maxLength={180} className="field" /></label>
          <label className="label">Kategorie<input name="category" required maxLength={80} className="field" /></label>
          <label className="label">SKU / Tarif-ID<input name="sku" maxLength={120} className="field" /></label>
          {canManageCommission && <label className="label">Standardprovision (€)<input name="expectedCommission" inputMode="decimal" className="field" /></label>}
        </div>
        <button disabled={busy !== null || providers.length === 0} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white hover:bg-electric disabled:opacity-50">{busy === "product" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Produkt speichern</button>
      </form>
    </div>

    <form onSubmit={submitAutomation} className="rounded-[22px] border border-line bg-white p-5 sm:p-6">
      <h2 className="text-[16px] font-extrabold">Automation anlegen</h2>
      <p className="mt-1 text-[12.5px] text-steel">Regeln reagieren auf Geschäftsereignisse und erzeugen automatisch Aufgaben oder Benachrichtigungen.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="label">Name<input name="name" required maxLength={180} className="field" /></label>
        <label className="label">Event
          <select className="field" value={eventType} onChange={(e) => setEventType(e.target.value)}>
            <option value="lead.created">Lead erstellt</option>
            <option value="lead.status.termin_bestaetigt">Termin bestätigt</option>
            <option value="order.created">Auftrag erstellt</option>
            <option value="order.status.submitted">Auftrag eingereicht</option>
            <option value="order.status.documents_missing">Unterlagen fehlen</option>
            <option value="order.status.accepted">Auftrag angenommen</option>
            <option value="order.status.active">Auftrag aktiv</option>
            <option value="order.status.storno">Storno</option>
          </select>
        </label>
        <label className="label">Aktion
          <select className="field" value={actionType} onChange={(e) => setActionType(e.target.value as "task" | "notification")}>
            <option value="task">Aufgabe erstellen</option>
            <option value="notification">Benachrichtigung</option>
          </select>
        </label>
        <label className="label">{actionType === "task" ? "Aufgabentitel" : "Nachricht"}<input name="title" required maxLength={240} className="field" /></label>
        {actionType === "task" && <>
          <label className="label">Fällig nach Minuten<input name="dueMinutes" type="number" min={0} max={525600} defaultValue={60} className="field" /></label>
          <label className="label">Priorität<select name="priority" className="field"><option value="normal">Normal</option><option value="high">Hoch</option><option value="critical">Kritisch</option></select></label>
        </>}
        {actionType === "notification" && <label className="label">Betreff<input name="subject" maxLength={180} className="field" /></label>}
      </div>
      <button disabled={busy !== null} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white hover:bg-electric disabled:opacity-50">{busy === "automation" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Automation speichern</button>
    </form>

    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-[22px] border border-line bg-white p-5 sm:p-6"><h2 className="text-[16px] font-extrabold">Katalog</h2><p className="mt-2 text-[13px] text-steel">{providers.length} Provider · {products.length} Produkte</p>
        <ul className="mt-4 space-y-2">{providers.slice(0,12).map((provider) => <li key={provider.id} className="text-[13.5px]"><span className="font-semibold">{provider.name}</span><span className="text-steel"> · {provider.category} · {products.filter((product) => product.providerId === provider.id).length} Produkte</span></li>)}</ul>
      </div>
      <div className="rounded-[22px] border border-line bg-white p-5 sm:p-6"><h2 className="text-[16px] font-extrabold">Aktive Automationen</h2>
        <ul className="mt-4 space-y-2">{automations.map((rule) => <li key={rule.id} className="flex items-center justify-between gap-3 text-[13.5px]"><span className="font-semibold">{rule.name}</span><span className="chip border-line bg-white">{rule.eventType}</span></li>)}</ul>
      </div>
    </div>
  </div>;
}
