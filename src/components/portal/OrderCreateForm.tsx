"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { getProductVisual } from "@/lib/product-visuals";

type CustomerOption = { id: number; label: string; customerNumber: string };
type LeadOption = { id: number; label: string };
type ProviderOption = { id: number; name: string; category: string };
type ProductOption = { id: number; providerId: number; name: string; category: string; imageUrl: string | null; expectedCommission: string | null };

export function OrderCreateForm({
  customers,
  leads,
  providers,
  products,
  initialCustomerId,
  initialLeadId,
  initialProductId,
  initialProviderId,
  canUseCustomers = false,
  canUseLeads = false,
  canCreateCustomer = false,
  canEditCommission = false,
}: {
  customers: CustomerOption[];
  leads: LeadOption[];
  providers: ProviderOption[];
  products: ProductOption[];
  initialCustomerId?: number;
  initialLeadId?: number;
  initialProductId?: number;
  initialProviderId?: number;
  canUseCustomers?: boolean;
  canUseLeads?: boolean;
  canCreateCustomer?: boolean;
  canEditCommission?: boolean;
}) {
  const router = useRouter();
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"customer" | "lead">(initialCustomerId && canUseCustomers ? "customer" : canUseLeads && (initialLeadId || !canUseCustomers) ? "lead" : "customer");
  const [customerId, setCustomerId] = useState(initialCustomerId ?? 0);
  const [leadId, setLeadId] = useState(initialLeadId ?? 0);
  const hasSourceAccess = canUseCustomers || canUseLeads;
  const [providerId, setProviderId] = useState<number>(initialProviderId ?? 0);
  const [productId, setProductId] = useState<number>(initialProductId ?? 0);
  const availableProducts = useMemo(() => products.filter((product) => product.providerId === providerId), [products, providerId]);
  const selectedProduct = products.find((product) => product.id === productId) ?? null;
  const selectedVisual = selectedProduct ? getProductVisual(selectedProduct.imageUrl, selectedProduct.category, selectedProduct.name) : null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || !hasSourceAccess || !event.currentTarget.reportValidity()) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      const payload = {
        customerId: source === "customer" ? Number(data.get("customerId")) || undefined : undefined,
        leadId: source === "lead" ? Number(data.get("leadId")) || undefined : undefined,
        providerId: Number(data.get("providerId")),
        productId: Number(data.get("productId")) || undefined,
        externalOrderId: String(data.get("externalOrderId") ?? ""),
        expectedCommission: canEditCommission ? String(data.get("expectedCommission") ?? "") || undefined : undefined,
        note: String(data.get("note") ?? ""),
      };
      const response = await fetch("/api/portal/enterprise/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string; order?: { id: number } } | null;
      if (response.status === 401) throw new Error("Deine Sitzung ist abgelaufen. Melde dich in einem neuen Tab erneut an und speichere anschließend noch einmal.");
      if (!response.ok || !json?.ok || !json.order) throw new Error(json?.error ?? "Auftrag konnte nicht angelegt werden.");
      router.push(`/portal/auftraege/${json.order.id}`);
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Auftrag konnte nicht angelegt werden.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <p className="label">Ausgangsbasis</p>
        <div className="flex flex-wrap gap-2">
          {canUseCustomers && <button type="button" disabled={busy} aria-pressed={source === "customer"} onClick={() => setSource("customer")} className={`chip min-h-11 px-3.5 ${source === "customer" ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>Bestehender Kunde</button>}
          {canUseLeads && <button type="button" disabled={busy} aria-pressed={source === "lead"} onClick={() => setSource("lead")} className={`chip min-h-11 px-3.5 ${source === "lead" ? "border-ink bg-ink text-white" : "border-line bg-white"}`}>Lead übernehmen</button>}
        </div>
        {!hasSourceAccess && <p className="mt-3 text-sm text-amber-800">Für die Auftragsaufnahme benötigst du Zugriff auf Kundenakten. Bitte wende dich an einen Administrator.</p>}
        {source === "lead" && canUseLeads && !canCreateCustomer && <p className="mt-3 text-sm text-steel">Du kannst Leads übernehmen, die bereits mit einer für dich zugänglichen Kundenakte verknüpft sind. Eine neue Kundenakte muss ein berechtigter Mitarbeiter anlegen.</p>}
      </div>

      {hasSourceAccess && (source === "customer" ? (
        <label className="label">Kunde
          <select name="customerId" required disabled={busy} className="field" value={customerId || ""} onChange={(event) => setCustomerId(Number(event.target.value) || 0)}>
            <option value="">Bitte auswählen</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.customerNumber} · {customer.label}</option>)}
          </select>
        </label>
      ) : (
        <label className="label">Lead
          <select name="leadId" required disabled={busy} className="field" value={leadId || ""} onChange={(event) => setLeadId(Number(event.target.value) || 0)}>
            <option value="">Bitte auswählen</option>
            {leads.map((lead) => <option key={lead.id} value={lead.id}>#{lead.id} · {lead.label}</option>)}
          </select>
        </label>
      ))}
      {hasSourceAccess && (source === "customer" ? customers.length === 0 : leads.length === 0) && <p className="text-sm text-steel">Für diese Ausgangsbasis sind noch keine Kontakte verfügbar.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label">Provider
          <select name="providerId" required className="field" value={providerId || ""} onChange={(e) => {
            const nextProviderId = Number(e.target.value);
            setProviderId(nextProviderId);
            if (!products.some((product) => product.id === productId && product.providerId === nextProviderId)) setProductId(0);
          }}>
            <option value="">Bitte auswählen</option>
            {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name} · {provider.category}</option>)}
          </select>
        </label>
        <label className="label">Produkt
          <select name="productId" className="field" value={productId || ""} onChange={(event) => setProductId(Number(event.target.value) || 0)}>
            <option value="">Ohne konkretes Produkt</option>
            {availableProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </label>
        <label className="label">Externe Auftrags-ID<input name="externalOrderId" maxLength={160} className="field" /></label>
        {canEditCommission ? <label className="label">Provider-Provision überschreiben (€)<input name="expectedCommission" inputMode="decimal" placeholder="nur Owner, optional" className="field" /></label> : <div className="rounded-xl border border-line bg-paper px-4 py-3 text-[12.5px] text-steel">Die Provisionsbasis wird automatisch aus dem internen Produktkatalog übernommen.</div>}
      </div>
      {selectedProduct && <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="grid sm:grid-cols-[150px_1fr]">
          {selectedVisual ? <div className="relative min-h-28 bg-ink">
            <Image src={selectedVisual.src} alt={selectedVisual.alt} fill sizes="150px" className="object-cover" style={{ objectPosition: selectedVisual.position }} />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-ink/10" />
          </div> : <div className="grid min-h-28 place-items-center bg-paper text-[11px] font-bold uppercase tracking-[0.1em] text-steel">Produkt</div>}
          <div className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-electric-deep">Ausgewähltes Produkt</p>
            <p className="mt-1 text-[16px] font-extrabold text-ink">{selectedProduct.name}</p>
            <p className="mt-1 text-[12px] text-steel">{selectedProduct.category}</p>
            <p className="mt-3 text-[12px] leading-relaxed text-steel">Der Auftrag wird mit diesem Produkt verknüpft. Provider und Produkt werden vor dem Speichern nochmals serverseitig geprüft.</p>
          </div>
        </div>
      </div>}
      <label className="label">Interne Notiz<textarea name="note" rows={3} maxLength={2000} className="field" /></label>
      {providers.length === 0 && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] text-amber-800">Es ist noch kein Provider hinterlegt. Ein Administrator kann Provider unter System & Integrationen anlegen.</p>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p>}
      <button disabled={busy || providers.length === 0 || !hasSourceAccess || (source === "customer" ? !customerId : !leadId)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-semibold text-white hover:bg-electric disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Auftrag anlegen
      </button>
    </form>
  );
}
