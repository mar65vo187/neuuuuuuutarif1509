"use client";

import { BadgeCheck, Loader2, PackagePlus, ShoppingBag, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { getProductVisual } from "@/lib/product-visuals";

type ProductOption = {
  id: number;
  name: string;
  category: string;
  providerName: string;
};

type ProductLink = {
  productId: number;
  relation: string;
  note: string;
  productName: string;
  category: string;
  providerName: string;
};

const RELATIONS = [
  { value: "interest", label: "Interesse", hint: "Kunde interessiert sich dafür" },
  { value: "existing", label: "Hat bereits", hint: "Produkt ist schon vorhanden" },
  { value: "sold", label: "Abgeschlossen", hint: "Über TarifWerk abgeschlossen" },
] as const;

const RELATION_STYLES: Record<string, string> = {
  interest: "border-electric/20 bg-electric/[0.08] text-electric-deep",
  existing: "border-amber-300/60 bg-amber-50 text-amber-800",
  sold: "border-emerald-300/70 bg-emerald-50 text-emerald-800",
};

export function LeadProductManager({
  leadId,
  products,
  links,
}: {
  leadId: number;
  products: ProductOption[];
  links: ProductLink[];
}) {
  const router = useRouter();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState(products[0]?.id ? String(products[0].id) : "");
  const [relation, setRelation] = useState<(typeof RELATIONS)[number]["value"]>("interest");

  const linkedKey = useMemo(() => new Set(links.map((item) => `${item.productId}:${item.relation}`)), [links]);
  const grouped = RELATIONS.map((entry) => ({
    ...entry,
    items: links.filter((item) => item.relation === entry.value),
  }));

  async function request(method: "POST" | "DELETE", body: Record<string, unknown>, key: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(key);
    setError(null);
    try {
      const response = await fetch(`/api/portal/leads/${leadId}/products`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      if (response.status === 401) {
        window.location.replace(`/portal/login?next=${encodeURIComponent(`/portal/leads/${leadId}`)}`);
        return;
      }
      const data = await response.json() as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Verbindung fehlgeschlagen.");
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }

  const selectedKey = productId ? `${productId}:${relation}` : "";
  const selectedProduct = products.find((product) => String(product.id) === productId) ?? null;
  const selectedVisual = selectedProduct ? getProductVisual(selectedProduct.category, selectedProduct.name, selectedProduct.providerName) : null;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-electric/15 bg-[linear-gradient(135deg,rgba(79,141,255,0.10),rgba(255,255,255,0.88))] p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-electric-soft"><PackagePlus className="h-4 w-4" /></span>
          <div>
            <p className="text-[14px] font-extrabold text-ink">Produktprofil des Leads</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-steel">Halte fest, was der Kunde schon hat, wofür Interesse besteht und was über TarifWerk abgeschlossen wurde.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <label>
            <span className="label">Produkt</span>
            <select className="field" value={productId} onChange={(event) => setProductId(event.target.value)} disabled={!products.length}>
              {!products.length && <option value="">Keine aktiven Produkte vorhanden</option>}
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.category} · {product.providerName} · {product.name}
                </option>
              ))}
            </select>
          </label>

          {selectedProduct && <div className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="grid grid-cols-[92px_1fr]">
              {selectedVisual ? <div className="relative min-h-20 bg-ink">
                <Image src={selectedVisual.src} alt={selectedVisual.alt} fill sizes="92px" className="object-cover" style={{ objectPosition: selectedVisual.position }} />
              </div> : <div className="grid min-h-20 place-items-center bg-paper text-[10px] font-bold text-steel">PRODUKT</div>}
              <div className="min-w-0 p-3">
                <p className="truncate text-[13px] font-extrabold text-ink">{selectedProduct.name}</p>
                <p className="mt-0.5 truncate text-[11px] text-steel">{selectedProduct.providerName} · {selectedProduct.category}</p>
                <p className="mt-2 text-[10.5px] leading-snug text-steel">Die Zuordnung dokumentiert Bedarf oder Bestand am Lead; sie erstellt noch keinen Auftrag.</p>
              </div>
            </div>
          </div>}

          <div>
            <p className="label">Zuordnung</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {RELATIONS.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  onClick={() => setRelation(entry.value)}
                  className={`rounded-xl border p-3 text-left transition ${relation === entry.value ? "border-electric bg-white shadow-sm ring-2 ring-electric/10" : "border-line bg-white/65 hover:border-electric/25"}`}
                >
                  <span className="block text-[12.5px] font-extrabold text-ink">{entry.label}</span>
                  <span className="mt-0.5 block text-[10.5px] leading-snug text-steel">{entry.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={!productId || busy !== null || linkedKey.has(selectedKey)}
            onClick={() => request("POST", { productId: Number(productId), relation }, "add")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-[13px] font-bold text-white transition hover:bg-electric disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : linkedKey.has(selectedKey) ? <BadgeCheck className="h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}
            {linkedKey.has(selectedKey) ? "Bereits zugeordnet" : "Produkt zuordnen"}
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {grouped.map((group) => (
          <section key={group.value} className="rounded-2xl border border-line/80 bg-white/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-[12.5px] font-extrabold text-ink">
                {group.value === "sold" ? <BadgeCheck className="h-4 w-4 text-emerald-600" /> : group.value === "existing" ? <ShoppingBag className="h-4 w-4 text-amber-600" /> : <Sparkles className="h-4 w-4 text-electric-deep" />}
                {group.label}
              </p>
              <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[10.5px] font-bold text-steel">{group.items.length}</span>
            </div>
            {group.items.length === 0 ? (
              <p className="mt-3 text-[12px] text-steel">Noch keine Produkte hinterlegt.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li key={`${item.productId}:${item.relation}`} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${RELATION_STYLES[item.relation] ?? "border-line bg-paper"}`}>
                    {(() => {
                      const visual = getProductVisual(item.category, item.productName, item.providerName);
                      return visual ? <span className="relative h-10 w-12 shrink-0 overflow-hidden rounded-lg bg-ink"><Image src={visual.src} alt="" fill sizes="48px" className="object-cover" style={{ objectPosition: visual.position }} /></span> : null;
                    })()}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-extrabold">{item.productName}</p>
                      <p className="truncate text-[10.5px] opacity-75">{item.providerName} · {item.category}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => request("DELETE", { productId: item.productId, relation: item.relation }, `remove:${item.productId}:${item.relation}`)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition hover:bg-black/5 disabled:opacity-50"
                      aria-label={`${item.productName} entfernen`}
                    >
                      {busy === `remove:${item.productId}:${item.relation}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</p>}
    </div>
  );
}
