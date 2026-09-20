"use client";

import { Check, Copy, Loader2, PlugZap, Power, PowerOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

type Endpoint = {
  id: number;
  name: string;
  url: string;
  eventTypes: string[];
  active: boolean;
};

const EVENTS = [
  ["*", "Alle Events"],
  ["lead.created", "Lead erstellt"],
  ["customer.created", "Kunde erstellt"],
  ["order.created", "Auftrag erstellt"],
  ["order.status.submitted", "Auftrag eingereicht"],
  ["order.status.documents_missing", "Unterlagen fehlen"],
  ["order.status.accepted", "Auftrag angenommen"],
  ["order.status.active", "Auftrag aktiv"],
  ["order.status.storno", "Storno"],
] as const;

export function WebhookManager({ endpoints }: { endpoints: Endpoint[] }) {
  const router = useRouter();
  const saving = useRef(false);
  const [busy, setBusy] = useState<number | "create" | null>(null);
  const [error, setError] = useState("");
  const [secret, setSecret] = useState("");
  const [copied, setCopied] = useState(false);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true;
    setBusy("create");
    setError("");
    setSecret("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const eventTypes = data.getAll("eventTypes").map(String);

    try {
      const response = await fetch("/api/portal/admin/enterprise/webhooks", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          url: data.get("url"),
          eventTypes,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string; secret?: string } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Webhook konnte nicht erstellt werden.");
      setSecret(json.secret ?? "");
      form.reset();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Webhook konnte nicht erstellt werden.");
    } finally {
      saving.current = false;
      setBusy(null);
    }
  }

  async function toggle(id: number, active: boolean) {
    if (busy !== null) return;
    setBusy(id);
    setError("");
    try {
      const response = await fetch("/api/portal/admin/enterprise/webhooks", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Webhook konnte nicht aktualisiert werden.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Webhook konnte nicht aktualisiert werden.");
    } finally {
      setBusy(null);
    }
  }

  async function copySecret() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={create} className="rounded-[22px] border border-line bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2"><PlugZap className="h-4.5 w-4.5 text-electric-deep" /><h2 className="text-[16px] font-extrabold">Webhook anbinden</h2></div>
        <p className="mt-1 text-[12px] leading-relaxed text-steel">Events sicher per HTTPS an CRM, Make, n8n, Zapier oder eigene Systeme senden.</p>
        <div className="mt-4 grid gap-3">
          <label className="label">Name<input name="name" required minLength={2} maxLength={160} className="field mt-1" placeholder="z. B. n8n Sales Sync" /></label>
          <label className="label">HTTPS Endpoint<input name="url" type="url" required maxLength={1000} className="field mt-1" placeholder="https://..." /></label>
          <fieldset>
            <legend className="label">Events</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {EVENTS.map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 rounded-xl border border-line bg-paper/50 px-3 py-2 text-[12px] font-semibold">
                  <input name="eventTypes" type="checkbox" value={value} className="h-4 w-4 rounded border-line" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        {secret && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-[11.5px] font-extrabold uppercase tracking-wider text-amber-800">Secret nur jetzt sichtbar</p>
            <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-white px-2.5 py-2 text-[11px]">{secret}</code><button type="button" onClick={copySecret} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink text-white" aria-label="Secret kopieren">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button></div>
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-[12px] font-semibold text-red-700">{error}</p>}
        <button disabled={busy !== null} className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white hover:bg-electric disabled:opacity-50">
          {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />} Webhook erstellen
        </button>
      </form>

      <div className="rounded-[22px] border border-line bg-white p-5 sm:p-6">
        <h2 className="text-[16px] font-extrabold">Webhook Endpoints</h2>
        <p className="mt-1 text-[12px] text-steel">{endpoints.filter((endpoint) => endpoint.active).length} aktiv · {endpoints.length} gesamt</p>
        {endpoints.length ? (
          <ul className="mt-4 divide-y divide-line">
            {endpoints.map((endpoint) => (
              <li key={endpoint.id} className="grid gap-3 py-3.5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{endpoint.name}</p><span className={"chip " + (endpoint.active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-line bg-paper text-steel")}>{endpoint.active ? "Aktiv" : "Pausiert"}</span></div><p className="mt-1 truncate text-[11.5px] text-steel">{endpoint.url}</p><p className="mt-1 text-[10.5px] text-steel">{endpoint.eventTypes.join(", ")}</p></div>
                <button type="button" disabled={busy !== null} onClick={() => toggle(endpoint.id, !endpoint.active)} className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-line px-3 text-[12px] font-semibold hover:border-electric/30 disabled:opacity-50">
                  {busy === endpoint.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : endpoint.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                  {endpoint.active ? "Pausieren" : "Aktivieren"}
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="mt-5 rounded-xl border border-dashed border-line p-6 text-center text-[12.5px] text-steel">Noch keine externen Webhooks eingerichtet.</p>}
      </div>
    </div>
  );
}
