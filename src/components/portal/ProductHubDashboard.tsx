"use client";

import {
  BadgeEuro, BookOpenCheck, BriefcaseBusiness, Building2, ChevronDown, CircleDollarSign, Columns3,
  FileSpreadsheet, GraduationCap, Loader2, Megaphone, PackageSearch, PiggyBank, Plus, Search,
  ShieldCheck, Sparkles, Upload, UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type MarketingChannel = { channel: string; status: "allowed" | "conditional" | "blocked"; note?: string };
type Product = {
  id: number;
  providerId: number;
  providerName: string;
  name: string;
  category: string;
  sku: string | null;
  active: boolean;
  audience: string;
  lifecycleStatus: string;
  description: string;
  region: string;
  submissionUrl: string | null;
  supportContact: string | null;
  completionProcess: string;
  marketingChannels: MarketingChannel[];
  marketingConditions: string;
  salesArguments: string[];
  objections: Array<{ objection: string; answer: string }>;
  shortPitch: string;
  phonePitch: string;
  d2dPitch: string;
  b2bPitch: string;
  whatsappTemplate: string;
  emailTemplate: string;
  socialIdeas: string[];
  checklist: string[];
  requiredDocuments: string[];
  trainingRequired: boolean;
  highlight: string | null;
  updatedAt: string | null;
  ownerGrossCommission: number | null;
  ownerPoolAmount: number | null;
  employeeCommissionEstimate: number | null;
  currentRateVersionId: number | null;
};
type Provider = {
  id: number;
  name: string;
  category: string;
  externalPartnerId: string | null;
  active: boolean;
  partnerType: string;
  websiteUrl: string | null;
  portalUrl: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  supportContact: string | null;
  billingPath: string | null;
  regions: string[];
  notes: string;
  updatedAt: string | null;
};
type Update = {
  id: number;
  productId: number | null;
  providerId: number | null;
  updateType: string;
  title: string;
  body: string;
  important: boolean;
  createdAt: string;
  readAt: string | null;
};
type OwnerData = {
  potentialPool: number;
  poolBalance: number;
  poolCredits: number;
  poolSpent: number;
  poolReserved: number;
  poolByCategory: Array<{ category: string; amount: number }>;
  commissionLists: Array<{
    id: number;
    providerId: number;
    providerName: string;
    version: number;
    sourceName: string;
    sourceType: string;
    validFrom: string | null;
    validTo: string | null;
    createdAt: string;
  }>;
};
type HubData = {
  owner: boolean;
  payoutPercent: number;
  advisoryAreas: string[];
  products: Product[];
  providers: Provider[];
  updates: Update[];
  ownerData: OwnerData | null;
};

const money = (value: number) => value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const date = (value: string) => new Date(value).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
const statusLabel: Record<string,string> = {
  active: "Aktiv", new: "Neu", test: "Testphase", paused: "Pausiert",
  do_not_market: "Nicht vermarkten", phasing_out: "Auslaufend", ended: "Beendet",
};
const channelLabel: Record<MarketingChannel["status"], string> = {
  allowed: "Erlaubt", conditional: "Mit Bedingungen", blocked: "Nicht erlaubt",
};

async function post(url: string, body: unknown, method: "POST" | "PATCH" = "POST") {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const json = await response.json().catch(() => null) as { ok?: boolean; error?: string; [key: string]: unknown } | null;
  if (response.status === 401) {
    window.location.replace("/portal/login?next=%2Fportal%2Fprodukte");
    throw new Error("Bitte erneut anmelden.");
  }
  if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Speichern fehlgeschlagen.");
  return json;
}

function lines(value: FormDataEntryValue | null) {
  return String(value ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function objectionPairs(value: FormDataEntryValue | null) {
  return lines(value).map((line) => {
    const [objection, ...answerParts] = line.split("|").map((part) => part.trim());
    return { objection, answer: answerParts.join(" | ") };
  }).filter((item) => item.objection && item.answer);
}

function channels(value: FormDataEntryValue | null): MarketingChannel[] {
  return lines(value).map((line) => {
    const [channel, rawStatus, ...note] = line.split("|").map((part) => part.trim());
    const status: MarketingChannel["status"] = rawStatus === "blocked" || rawStatus === "conditional" ? rawStatus : "allowed";
    return { channel, status, note: note.join(" | ") || undefined };
  }).filter((entry) => entry.channel.length >= 2);
}

function parseCsv(text: string) {
  const clean = text.replace(/^\uFEFF/, "");
  const first = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (first.match(/;/g)?.length ?? 0) >= (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === '"') {
      if (quoted && clean[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell.trim()); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell.trim()); cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];

  const normalize = (header: string) => header.toLowerCase().replace(/[^a-z0-9äöüß]/g, "");
  const headers = rows[0].map(normalize);
  const index = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const productName = index("produkt", "produktname", "product", "productname", "tarif");
  const category = index("kategorie", "category", "bereich");
  const gross = index("provision", "bruttoprovision", "grossamount", "gross", "betrag");
  const external = index("sku", "tarifid", "produktidextern", "externalproductid");
  const productId = index("produktid", "productid");

  if (productName < 0 || category < 0 || gross < 0) return [];
  return rows.slice(1).map((cells) => ({
    productId: productId >= 0 && /^\d+$/.test(cells[productId] ?? "") ? Number(cells[productId]) : undefined,
    externalProductId: external >= 0 ? cells[external] || undefined : undefined,
    productName: cells[productName] ?? "",
    category: cells[category] ?? "",
    grossAmount: Number((cells[gross] ?? "0").replace(/\./g, "").replace(",", ".")),
  })).filter((row) => row.productName && row.category && Number.isFinite(row.grossAmount) && row.grossAmount >= 0);
}

export function ProductHubDashboard({ data, isAdmin }: { data: HubData; isAdmin: boolean }) {
  const router = useRouter();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [provider, setProvider] = useState("all");
  const [csvRows, setCsvRows] = useState<Array<{ productId?: number; externalProductId?: string; productName: string; category: string; grossAmount: number }>>([]);
  const [csvName, setCsvName] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(data.products[0]?.id ?? 0);
  const [selectedProviderId, setSelectedProviderId] = useState(data.providers[0]?.id ?? 0);
  const [compareIds, setCompareIds] = useState<number[]>(data.products.slice(0, 2).map((product) => product.id));
  const [readBusy, setReadBusy] = useState<number | null>(null);

  const categories = useMemo(() => Array.from(new Set(data.products.map((product) => product.category))).sort(), [data.products]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.products.filter((product) =>
      (category === "all" || product.category === category) &&
      (provider === "all" || String(product.providerId) === provider) &&
      (!needle || [product.name, product.providerName, product.category, product.sku ?? "", product.description].some((value) => value.toLowerCase().includes(needle)))
    );
  }, [data.products, query, category, provider]);

  async function submit(event: FormEvent<HTMLFormElement>, kind: string, build: (data: FormData) => unknown, url = "/api/portal/admin/catalog", method: "POST" | "PATCH" = "POST") {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true; setBusy(kind); setError(null); setSuccess(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      await post(url, build(formData), method);
      setSuccess("Gespeichert. Die Änderung ist jetzt im Backoffice verfügbar.");
      form.reset();
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Speichern fehlgeschlagen.");
    } finally {
      busyRef.current = false; setBusy(null);
    }
  }

  async function loadCsv(file: File | null) {
    setError(null); setSuccess(null); setCsvRows([]); setCsvName(file?.name ?? "");
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("CSV-Datei ist zu groß. Maximal 5 MB."); return; }
    const parsed = parseCsv(await file.text());
    if (!parsed.length) {
      setError("CSV konnte nicht erkannt werden. Pflichtspalten: Produkt, Kategorie und Provision.");
      return;
    }
    setCsvRows(parsed);
  }

  const activeProducts = data.products.filter((product) => ["active", "new", "test"].includes(product.lifecycleStatus)).length;
  const selectedProduct = data.products.find((product) => product.id === selectedProductId) ?? data.products[0];
  const selectedProvider = data.providers.find((item) => item.id === selectedProviderId) ?? data.providers[0];
  const compareProducts = compareIds.map((id) => data.products.find((product) => product.id === id)).filter((product): product is Product => Boolean(product));

  async function markUpdateRead(id: number) {
    setReadBusy(id); setError(null);
    try {
      await post(`/api/portal/catalog/updates/${id}/read`, {});
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Lesestatus konnte nicht gespeichert werden.");
    } finally {
      setReadBusy(null);
    }
  }

  return <div className="space-y-6">
    {(error || success) && <div role={error ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-[13.5px] ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error ?? success}</div>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: "Aktive Produkte", value: String(activeProducts), Icon: PackageSearch },
        { label: "Partner", value: String(data.providers.filter((item) => item.active).length), Icon: Building2 },
        { label: "Geschäftsbereiche", value: String(categories.length), Icon: BriefcaseBusiness },
        { label: data.owner ? "Owner Benefit-Pool" : "Ihre aktuelle Stufe", value: data.owner ? money(data.ownerData?.poolBalance ?? 0) : `${data.payoutPercent} %`, Icon: data.owner ? PiggyBank : BadgeEuro },
      ].map(({ label, value, Icon }) => <div key={label} className="rounded-[22px] border border-line bg-white p-5">
        <div className="flex items-center justify-between"><p className="text-[12.5px] font-semibold text-steel">{label}</p><Icon className="h-4.5 w-4.5 text-electric-deep" /></div>
        <p className="mt-3 text-[27px] font-extrabold tracking-tight">{value}</p>
      </div>)}
    </section>

    <section className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow text-electric-deep">Produktfinder</p><h2 className="mt-2 text-[19px] font-extrabold">In Sekunden zum richtigen internen Produktwissen</h2></div>
        <span className="text-[12px] text-steel">{filtered.length} von {data.products.length} Produkten</span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1.4fr_.8fr_.8fr]">
        <label className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-steel" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="field pl-9" placeholder="Produkt, Partner, SKU oder Beschreibung suchen" /></label>
        <select className="field" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Alle Bereiche</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="field" value={provider} onChange={(event) => setProvider(event.target.value)}><option value="all">Alle Partner</option>{data.providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      </div>
    </section>

    {data.products.length > 1 && <section className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
      <div className="flex items-center gap-3"><Columns3 className="h-5 w-5 text-electric-deep" /><div><h2 className="text-[17px] font-extrabold">Produkte direkt vergleichen</h2><p className="text-[12.5px] text-steel">Bis zu drei Produkte nebeneinander – Bedarf und Eignung bleiben wichtiger als Provision.</p></div></div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[0,1,2].map((slot) => <select key={slot} className="field" value={compareIds[slot] ?? ""} onChange={(event) => {
          const value = Number(event.target.value);
          setCompareIds((current) => {
            const next = [...current];
            if (value) next[slot] = value; else next.splice(slot, 1);
            return Array.from(new Set(next)).slice(0,3);
          });
        }}><option value="">Produkt {slot + 1}</option>{data.products.map((product) => <option key={product.id} value={product.id}>{product.providerName} · {product.name}</option>)}</select>)}
      </div>
      {compareProducts.length > 1 && <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-[12.5px]"><thead><tr><th className="w-40 border-b border-line p-3 text-left text-steel">Kriterium</th>{compareProducts.map((product) => <th key={product.id} className="border-b border-line p-3 text-left"><p className="font-extrabold">{product.name}</p><p className="text-[11px] font-normal text-steel">{product.providerName}</p></th>)}</tr></thead><tbody>{[
        ["Bereich", (p: Product) => p.category],
        ["Zielgruppe", (p: Product) => p.audience === "both" ? "Privat & Business" : p.audience === "business" ? "Business" : "Privat"],
        ["Region", (p: Product) => p.region],
        ["Status", (p: Product) => statusLabel[p.lifecycleStatus] ?? p.lifecycleStatus],
        ["Schulung", (p: Product) => p.trainingRequired ? "Erforderlich" : "Keine Pflicht"],
        ["Vermarktung", (p: Product) => p.marketingChannels.filter((channel) => channel.status !== "blocked").map((channel) => channel.channel).join(", ") || "–"],
        ["Provision", (p: Product) => data.owner ? money(p.ownerGrossCommission ?? 0) : p.employeeCommissionEstimate !== null ? money(p.employeeCommissionEstimate) : "–"],
      ].map(([label, getter]) => <tr key={String(label)}><td className="border-b border-line p-3 font-semibold text-steel">{String(label)}</td>{compareProducts.map((product) => <td key={product.id} className="border-b border-line p-3">{(getter as (p: Product) => string)(product)}</td>)}</tr>)}</tbody></table></div>}
    </section>}

    <section className="grid gap-4 xl:grid-cols-2">
      {filtered.map((product) => <article key={product.id} className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="flex flex-wrap gap-2"><span className="chip border-line bg-paper">{product.category}</span><span className="chip border-line bg-white">{statusLabel[product.lifecycleStatus] ?? product.lifecycleStatus}</span>{product.trainingRequired && <span className="chip border-amber-200 bg-amber-50 text-amber-800"><GraduationCap className="h-3 w-3" /> Schulung erforderlich</span>}</div><h3 className="mt-3 text-[19px] font-extrabold">{product.name}</h3><p className="mt-1 text-[13px] text-steel">{product.providerName}{product.sku ? ` · ${product.sku}` : ""} · {product.audience === "both" ? "Privat & Business" : product.audience === "business" ? "Business" : "Privat"}</p></div>
          {product.highlight && <span className="rounded-full bg-electric/10 px-3 py-1 text-[11.5px] font-bold text-electric-deep">{product.highlight}</span>}
        </div>
        {product.description && <p className="mt-4 text-[13.5px] leading-relaxed text-steel">{product.description}</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-paper p-4"><p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-steel">Region</p><p className="mt-1 text-[13.5px] font-bold">{product.region}</p></div>
          <div className="rounded-2xl bg-paper p-4"><p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-steel">{data.owner ? "Provider-Provision" : "Ihr Provisionswert"}</p><p className="mt-1 text-[16px] font-extrabold">{data.owner ? money(product.ownerGrossCommission ?? 0) : product.employeeCommissionEstimate !== null ? money(product.employeeCommissionEstimate) : "–"}</p>{data.owner && <p className="mt-1 text-[11px] text-steel">davon 15 % interner Benefit-/Growth-Pool: {money(product.ownerPoolAmount ?? 0)}</p>}</div>
        </div>
        {product.marketingChannels.length > 0 && <div className="mt-4"><p className="text-[12px] font-bold uppercase tracking-[0.1em] text-steel">Vermarktung</p><div className="mt-2 flex flex-wrap gap-2">{product.marketingChannels.map((channel, index) => <span key={channel.channel + index} title={channel.note} className={`chip ${channel.status === "allowed" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : channel.status === "conditional" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700"}`}>{channel.channel} · {channelLabel[channel.status]}</span>)}</div></div>}
        {["active", "new", "test", "phasing_out"].includes(product.lifecycleStatus) && <div className="mt-4"><Link href={`/portal/auftraege/neu?product=${product.id}`} className="inline-flex h-10 items-center justify-center rounded-full bg-ink px-4 text-[12.5px] font-semibold text-white hover:bg-electric">Auftrag mit diesem Produkt starten</Link></div>}
        <details className="mt-5 border-t border-line pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[13.5px] font-bold">Produktwissen öffnen <ChevronDown className="h-4 w-4" /></summary>
          <div className="mt-4 grid gap-5 text-[13px] lg:grid-cols-2">
            <div><p className="font-bold">Verkaufsargumente</p>{product.salesArguments.length ? <ul className="mt-2 space-y-1.5 text-steel">{product.salesArguments.map((item) => <li key={item}>• {item}</li>)}</ul> : <p className="mt-2 text-steel">Noch nicht hinterlegt.</p>}</div>
            <div><p className="font-bold">Benötigte Unterlagen</p>{product.requiredDocuments.length ? <ul className="mt-2 space-y-1.5 text-steel">{product.requiredDocuments.map((item) => <li key={item}>• {item}</li>)}</ul> : <p className="mt-2 text-steel">Noch nicht hinterlegt.</p>}</div>
            <div><p className="font-bold">Typische Einwände</p>{product.objections.length ? <div className="mt-2 space-y-2">{product.objections.map((item) => <div key={item.objection} className="rounded-xl bg-paper p-3"><p className="font-semibold">{item.objection}</p><p className="mt-1 text-steel">{item.answer}</p></div>)}</div> : <p className="mt-2 text-steel">Noch nicht hinterlegt.</p>}</div>
            <div><p className="font-bold">Abschluss-Checkliste</p>{product.checklist.length ? <ol className="mt-2 space-y-1.5 text-steel">{product.checklist.map((item, index) => <li key={item}>{index + 1}. {item}</li>)}</ol> : <p className="mt-2 text-steel">Noch nicht hinterlegt.</p>}</div>
            <div><p className="font-bold">Abschlussweg</p><p className="mt-2 whitespace-pre-line leading-relaxed text-steel">{product.completionProcess || "Noch nicht hinterlegt."}</p>{product.submissionUrl && <a href={product.submissionUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex font-semibold text-electric-deep hover:underline">Partnerportal öffnen</a>}</div>
          </div>
          {(product.shortPitch || product.phonePitch || product.d2dPitch || product.b2bPitch || product.whatsappTemplate || product.emailTemplate || product.socialIdeas.length > 0) && <div className="mt-5 rounded-2xl border border-electric/15 bg-electric/[0.035] p-4">
            <p className="font-bold">Marketing- & Gesprächs-Kit</p>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              {[
                { label: "Kurzpitch", content: product.shortPitch },
                { label: "Telefonpitch", content: product.phonePitch },
                { label: "D2D-Pitch", content: product.d2dPitch },
                { label: "B2B-Pitch", content: product.b2bPitch },
                { label: "WhatsApp-Vorlage", content: product.whatsappTemplate },
                { label: "E-Mail-Vorlage", content: product.emailTemplate },
              ].filter((item) => item.content).map((item) => <div key={item.label}><p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-electric-deep">{item.label}</p><p className="mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-steel">{item.content}</p></div>)}
              {product.socialIdeas.length > 0 && <div><p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-electric-deep">Social-Ideen</p><ul className="mt-1 space-y-1 text-[12.5px] text-steel">{product.socialIdeas.map((idea) => <li key={idea}>• {idea}</li>)}</ul></div>}
            </div>
          </div>}
          {product.marketingConditions && <div className="mt-4 rounded-2xl border border-line bg-paper p-4"><p className="font-bold">Vermarktungsbedingungen</p><p className="mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-steel">{product.marketingConditions}</p></div>}
        </details>
      </article>)}
      {filtered.length === 0 && <div className="xl:col-span-2 rounded-[22px] border border-dashed border-line bg-white p-8 text-center text-[14px] text-steel">Keine passenden Produkte gefunden.</div>}
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-[24px] border border-line bg-white p-5 sm:p-6"><div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-electric-deep" /><div><h2 className="text-[17px] font-extrabold">Partnerübersicht</h2><p className="text-[12.5px] text-steel">Wer liefert was und wo läuft der Abschluss?</p></div></div>
        <div className="mt-5 divide-y divide-line">{data.providers.map((item) => <div key={item.id} className="py-3 first:pt-0"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold">{item.name}</p><span className="text-[11.5px] text-steel">{item.partnerType} · {item.category}</span></div><p className="mt-1 text-[12.5px] text-steel">{item.supportContact || item.contactEmail || item.contactPhone || "Kontakt noch nicht hinterlegt."}</p>{item.portalUrl && <a className="mt-1 inline-flex text-[12.5px] font-semibold text-electric-deep hover:underline" href={item.portalUrl} target="_blank" rel="noreferrer">Partnerportal öffnen</a>}</div>)}</div>
      </div>
      <div className="rounded-[24px] border border-line bg-white p-5 sm:p-6"><div className="flex items-center gap-3"><Megaphone className="h-5 w-5 text-electric-deep" /><div><h2 className="text-[17px] font-extrabold">Produkt-News</h2><p className="text-[12.5px] text-steel">Provisionen, Prozesse, Aktionen und Produktänderungen.</p></div></div>
        <div className="mt-5 space-y-3">{data.updates.length ? data.updates.slice(0,12).map((item) => <div key={item.id} className={`rounded-2xl border p-4 ${item.important ? "border-electric/30 bg-electric/5" : "border-line bg-paper"}`}><div className="flex items-center justify-between gap-3"><p className="text-[13.5px] font-bold">{item.title}</p>{item.important && <Sparkles className="h-4 w-4 text-electric-deep" />}</div>{item.body && <p className="mt-1 text-[12.5px] leading-relaxed text-steel">{item.body}</p>}<div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] text-steel">{date(item.createdAt)}{item.readAt ? ` · gelesen ${date(item.readAt)}` : item.important ? " · Lesebestätigung offen" : ""}</p>{item.important && !item.readAt && <button type="button" disabled={readBusy === item.id} onClick={() => void markUpdateRead(item.id)} className="inline-flex h-8 items-center rounded-full border border-electric/20 bg-white px-3 text-[11.5px] font-bold text-electric-deep hover:bg-electric/5 disabled:opacity-50">{readBusy === item.id ? "Speichert…" : "Als gelesen bestätigen"}</button>}</div></div>) : <p className="text-[13px] text-steel">Noch keine Produkt-News vorhanden.</p>}</div>
      </div>
    </section>

    {data.owner && data.ownerData && <section className="rounded-[26px] border border-line bg-ink p-6 text-white sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow text-electric-soft">Nur Owner</p><h2 className="mt-2 text-[22px] font-extrabold">15-%-Benefit & Growth Pool</h2><p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-silver">Interne Unternehmensplanung für Incentives, Reisen, Fahrzeuge, Gesundheit, Schulungen und weitere Team-Investitionen. Nicht Teil der Mitarbeiteransicht.</p></div><ShieldCheck className="h-7 w-7 text-electric-soft" /></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        ["Verfügbarer Ledger-Saldo", data.ownerData.poolBalance],
        ["Gebucht / freigegeben", data.ownerData.poolCredits],
        ["Ausgegeben", data.ownerData.poolSpent],
        ["Reserviert", data.ownerData.poolReserved],
      ].map(([label,value]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[11.5px] text-silver">{label}</p><p className="mt-1 text-[23px] font-extrabold">{money(Number(value))}</p></div>)}</div>
      <p className="mt-4 text-[12px] text-silver">Katalog-Potenzial auf Basis der jeweils hinterlegten Produktprovisionen: <strong className="text-white">{money(data.ownerData.potentialPool)}</strong>. Das ist eine Planungsgröße, kein automatisch verdienter Geldbestand.</p>
    </section>}

    {isAdmin && <section className="space-y-5">
      <div><p className="eyebrow text-electric-deep">Administration</p><h2 className="mt-2 text-[21px] font-extrabold">Produkt- und Partnerdaten pflegen</h2></div>
      <div className="grid gap-5 xl:grid-cols-2">
        {selectedProduct && <form key={`edit-product-${selectedProduct.id}`} onSubmit={(event) => submit(event, "product-edit", (form) => ({
          kind: "product",
          id: selectedProduct.id,
          providerId: Number(form.get("providerId")),
          name: form.get("name"),
          category: form.get("category"),
          sku: form.get("sku"),
          audience: form.get("audience"),
          lifecycleStatus: form.get("lifecycleStatus"),
          description: form.get("description"),
          region: form.get("region"),
          submissionUrl: form.get("submissionUrl"),
          supportContact: form.get("supportContact"),
          completionProcess: form.get("completionProcess"),
          marketingChannels: channels(form.get("marketingChannels")),
          marketingConditions: form.get("marketingConditions"),
          salesArguments: lines(form.get("salesArguments")),
          shortPitch: form.get("shortPitch"),
          phonePitch: form.get("phonePitch"),
          d2dPitch: form.get("d2dPitch"),
          b2bPitch: form.get("b2bPitch"),
          whatsappTemplate: form.get("whatsappTemplate"),
          emailTemplate: form.get("emailTemplate"),
          socialIdeas: lines(form.get("socialIdeas")),
          checklist: lines(form.get("checklist")),
          requiredDocuments: lines(form.get("requiredDocuments")),
          objections: objectionPairs(form.get("objections")),
          trainingRequired: form.get("trainingRequired") === "on",
          highlight: form.get("highlight"),
        }), "/api/portal/admin/catalog", "PATCH")} className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3"><PackageSearch className="h-5 w-5 text-electric-deep" /><div><h3 className="text-[17px] font-extrabold">Bestehende Produkte bearbeiten</h3><p className="text-[12px] text-steel">Status, Vermarktung, Schulung und Abschlussweg zentral pflegen.</p></div></div>
          <label className="label mt-4">Produkt auswählen<select className="field" value={selectedProduct.id} onChange={(event) => setSelectedProductId(Number(event.target.value))}>{data.products.map((item) => <option key={item.id} value={item.id}>{item.providerName} · {item.name}</option>)}</select></label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="label">Partner<select name="providerId" defaultValue={selectedProduct.providerId} className="field">{data.providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="label">Produktname<input name="name" defaultValue={selectedProduct.name} required className="field" /></label>
            <label className="label">Bereich<input name="category" defaultValue={selectedProduct.category} required className="field" /></label>
            <label className="label">SKU / Tarif-ID<input name="sku" defaultValue={selectedProduct.sku ?? ""} className="field" /></label>
            <label className="label">Zielgruppe<select name="audience" defaultValue={selectedProduct.audience} className="field"><option value="both">Privat & Business</option><option value="private">Privat</option><option value="business">Business</option></select></label>
            <label className="label">Status<select name="lifecycleStatus" defaultValue={selectedProduct.lifecycleStatus} className="field"><option value="active">Aktiv</option><option value="new">Neu</option><option value="test">Testphase</option><option value="paused">Pausiert</option><option value="do_not_market">Nicht vermarkten</option><option value="phasing_out">Auslaufend</option><option value="ended">Beendet</option></select></label>
            <label className="label sm:col-span-2">Beschreibung<textarea name="description" rows={3} defaultValue={selectedProduct.description} className="field" /></label>
            <label className="label">Region<input name="region" defaultValue={selectedProduct.region} className="field" /></label>
            <label className="label">Einreichungsportal<input name="submissionUrl" type="url" defaultValue={selectedProduct.submissionUrl ?? ""} className="field" /></label>
            <label className="label sm:col-span-2">Supportkontakt<input name="supportContact" defaultValue={selectedProduct.supportContact ?? ""} className="field" /></label>
            <label className="label sm:col-span-2">Vertriebskanäle · Kanal|allowed/conditional/blocked|Hinweis<textarea name="marketingChannels" rows={4} defaultValue={selectedProduct.marketingChannels.map((entry) => [entry.channel, entry.status, entry.note].filter(Boolean).join("|")).join("\n")} className="field" /></label>
            <label className="label sm:col-span-2">Vermarktungsbedingungen<textarea name="marketingConditions" rows={3} defaultValue={selectedProduct.marketingConditions} className="field" /></label>
            <label className="label sm:col-span-2">Verkaufsargumente<textarea name="salesArguments" rows={3} defaultValue={selectedProduct.salesArguments.join("\n")} className="field" /></label>
            <label className="label sm:col-span-2">Kurzpitch<textarea name="shortPitch" rows={2} maxLength={1200} defaultValue={selectedProduct.shortPitch} className="field" /></label>
            <label className="label">Telefonpitch<textarea name="phonePitch" rows={4} maxLength={3000} defaultValue={selectedProduct.phonePitch} className="field" /></label>
            <label className="label">D2D-Pitch<textarea name="d2dPitch" rows={4} maxLength={3000} defaultValue={selectedProduct.d2dPitch} className="field" /></label>
            <label className="label">B2B-Pitch<textarea name="b2bPitch" rows={4} maxLength={3000} defaultValue={selectedProduct.b2bPitch} className="field" /></label>
            <label className="label">WhatsApp-Vorlage<textarea name="whatsappTemplate" rows={4} maxLength={2500} defaultValue={selectedProduct.whatsappTemplate} className="field" /></label>
            <label className="label sm:col-span-2">E-Mail-Vorlage<textarea name="emailTemplate" rows={4} maxLength={4000} defaultValue={selectedProduct.emailTemplate} className="field" /></label>
            <label className="label sm:col-span-2">Social-Ideen · eine Zeile pro Idee<textarea name="socialIdeas" rows={3} defaultValue={selectedProduct.socialIdeas.join("\n")} className="field" /></label>
            <label className="label sm:col-span-2">Einwände · Einwand|Antwort<textarea name="objections" rows={4} defaultValue={selectedProduct.objections.map((item) => `${item.objection}|${item.answer}`).join("\n")} className="field" /></label>
            <label className="label sm:col-span-2">Abschlussprozess<textarea name="completionProcess" rows={4} defaultValue={selectedProduct.completionProcess} className="field" /></label>
            <label className="label">Checkliste<textarea name="checklist" rows={4} defaultValue={selectedProduct.checklist.join("\n")} className="field" /></label>
            <label className="label">Unterlagen<textarea name="requiredDocuments" rows={4} defaultValue={selectedProduct.requiredDocuments.join("\n")} className="field" /></label>
            <label className="label">Badge / Hinweis<input name="highlight" defaultValue={selectedProduct.highlight ?? ""} className="field" /></label>
            <label className="flex items-center gap-2 self-end rounded-xl border border-line px-3 py-3 text-[13px] font-semibold"><input name="trainingRequired" type="checkbox" defaultChecked={selectedProduct.trainingRequired} /> Schulung erforderlich</label>
          </div>
          <button disabled={busy !== null} className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white hover:bg-electric disabled:opacity-50">{busy === "product-edit" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Produkt aktualisieren</button>
        </form>}

        {selectedProvider && <form key={`edit-provider-${selectedProvider.id}`} onSubmit={(event) => submit(event, "provider-edit", (form) => ({
          kind: "provider",
          id: selectedProvider.id,
          name: form.get("name"),
          category: form.get("category"),
          externalPartnerId: form.get("externalPartnerId"),
          partnerType: form.get("partnerType"),
          websiteUrl: form.get("websiteUrl"),
          portalUrl: form.get("portalUrl"),
          contactName: form.get("contactName"),
          contactPhone: form.get("contactPhone"),
          contactEmail: form.get("contactEmail"),
          supportContact: form.get("supportContact"),
          billingPath: form.get("billingPath"),
          regions: lines(form.get("regions")),
          notes: form.get("notes"),
          active: form.get("active") === "on",
        }), "/api/portal/admin/catalog", "PATCH")} className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3"><Building2 className="h-5 w-5 text-electric-deep" /><div><h3 className="text-[17px] font-extrabold">Partner bearbeiten</h3><p className="text-[12px] text-steel">Kontakt, Portal, Regionen und Aktivstatus verwalten.</p></div></div>
          <label className="label mt-4">Partner auswählen<select className="field" value={selectedProvider.id} onChange={(event) => setSelectedProviderId(Number(event.target.value))}>{data.providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="label">Name<input name="name" defaultValue={selectedProvider.name} required className="field" /></label>
            <label className="label">Bereich<input name="category" defaultValue={selectedProvider.category} required className="field" /></label>
            <label className="label">Partnerart<input name="partnerType" defaultValue={selectedProvider.partnerType} className="field" /></label>
            <label className="label">Interne Partner-ID<input name="externalPartnerId" defaultValue={selectedProvider.externalPartnerId ?? ""} className="field" /></label>
            <label className="label">Website<input name="websiteUrl" type="url" defaultValue={selectedProvider.websiteUrl ?? ""} className="field" /></label>
            <label className="label">Partnerportal<input name="portalUrl" type="url" defaultValue={selectedProvider.portalUrl ?? ""} className="field" /></label>
            <label className="label">Ansprechpartner<input name="contactName" defaultValue={selectedProvider.contactName ?? ""} className="field" /></label>
            <label className="label">E-Mail<input name="contactEmail" type="email" defaultValue={selectedProvider.contactEmail ?? ""} className="field" /></label>
            <label className="label">Telefon<input name="contactPhone" defaultValue={selectedProvider.contactPhone ?? ""} className="field" /></label>
            <label className="label">Support<input name="supportContact" defaultValue={selectedProvider.supportContact ?? ""} className="field" /></label>
            <label className="label sm:col-span-2">Regionen<textarea name="regions" rows={2} defaultValue={selectedProvider.regions.join("\n")} className="field" /></label>
            <label className="label sm:col-span-2">Abrechnungs-/Einreichungsweg<textarea name="billingPath" rows={2} defaultValue={selectedProvider.billingPath ?? ""} className="field" /></label>
            {data.owner && <label className="label sm:col-span-2">Owner-Notiz<textarea name="notes" rows={2} defaultValue={selectedProvider.notes} className="field" /></label>}
            <label className="flex items-center gap-2 rounded-xl border border-line px-3 py-3 text-[13px] font-semibold"><input name="active" type="checkbox" defaultChecked={selectedProvider.active} /> Partner aktiv</label>
          </div>
          <button disabled={busy !== null} className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white hover:bg-electric disabled:opacity-50">{busy === "provider-edit" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Partner aktualisieren</button>
        </form>}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <form onSubmit={(event) => submit(event, "provider", (form) => ({
          kind: "provider", name: form.get("name"), category: form.get("category"), externalPartnerId: form.get("externalPartnerId"),
          partnerType: form.get("partnerType"), websiteUrl: form.get("websiteUrl"), portalUrl: form.get("portalUrl"),
          contactName: form.get("contactName"), contactPhone: form.get("contactPhone"), contactEmail: form.get("contactEmail"),
          supportContact: form.get("supportContact"), billingPath: form.get("billingPath"), regions: lines(form.get("regions")), notes: form.get("notes"),
        }))} className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3"><UsersRound className="h-5 w-5 text-electric-deep" /><h3 className="text-[17px] font-extrabold">Partner anlegen</h3></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="label">Name<input name="name" required maxLength={160} className="field" /></label>
            <label className="label">Bereich<input name="category" required maxLength={80} placeholder="z. B. Mobilfunk" className="field" /></label>
            <label className="label">Partnerart<select name="partnerType" className="field"><option value="provider">Anbieter</option><option value="distributor">Distributor</option><option value="maklerpool">Maklerpool</option><option value="energy">Energieversorger</option><option value="solar">Solar-/Montagepartner</option><option value="insurance">Versicherung</option><option value="real_estate">Immobilienpartner</option><option value="cooperation">Kooperationspartner</option></select></label>
            <label className="label">Interne Partner-ID<input name="externalPartnerId" maxLength={160} className="field" /></label>
            <label className="label">Website<input name="websiteUrl" type="url" maxLength={500} className="field" /></label>
            <label className="label">Partnerportal<input name="portalUrl" type="url" maxLength={500} className="field" /></label>
            <label className="label">Ansprechpartner<input name="contactName" maxLength={160} className="field" /></label>
            <label className="label">E-Mail<input name="contactEmail" type="email" maxLength={200} className="field" /></label>
            <label className="label">Telefon<input name="contactPhone" maxLength={80} className="field" /></label>
            <label className="label">Support<input name="supportContact" maxLength={300} className="field" /></label>
            <label className="label sm:col-span-2">Regionen · eine pro Zeile<textarea name="regions" rows={2} className="field" placeholder={"Deutschland\nHessen\nRheinland-Pfalz"} /></label>
            <label className="label sm:col-span-2">Abrechnungs-/Einreichungsweg<textarea name="billingPath" rows={2} maxLength={500} className="field" /></label>
            {data.owner && <label className="label sm:col-span-2">Owner-Notiz<textarea name="notes" rows={2} maxLength={3000} className="field" /></label>}
          </div>
          <button disabled={busy !== null} className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white hover:bg-electric disabled:opacity-50">{busy === "provider" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Partner speichern</button>
        </form>

        <form onSubmit={(event) => submit(event, "product", (form) => ({
          kind: "product", providerId: Number(form.get("providerId")), name: form.get("name"), category: form.get("category"), sku: form.get("sku"),
          audience: form.get("audience"), lifecycleStatus: form.get("lifecycleStatus"), description: form.get("description"), region: form.get("region"),
          submissionUrl: form.get("submissionUrl"), supportContact: form.get("supportContact"), completionProcess: form.get("completionProcess"),
          marketingChannels: channels(form.get("marketingChannels")), marketingConditions: form.get("marketingConditions"),
          salesArguments: lines(form.get("salesArguments")), shortPitch: form.get("shortPitch"), phonePitch: form.get("phonePitch"), d2dPitch: form.get("d2dPitch"), b2bPitch: form.get("b2bPitch"),
          whatsappTemplate: form.get("whatsappTemplate"), emailTemplate: form.get("emailTemplate"), socialIdeas: lines(form.get("socialIdeas")),
          checklist: lines(form.get("checklist")), requiredDocuments: lines(form.get("requiredDocuments")),
          objections: objectionPairs(form.get("objections")), trainingRequired: form.get("trainingRequired") === "on", highlight: form.get("highlight"),
        }))} className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3"><PackageSearch className="h-5 w-5 text-electric-deep" /><h3 className="text-[17px] font-extrabold">Produkt anlegen</h3></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="label">Partner<select name="providerId" required className="field"><option value="">Auswählen</option>{data.providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="label">Produktname<input name="name" required maxLength={180} className="field" /></label>
            <label className="label">Bereich<input name="category" required maxLength={80} className="field" /></label>
            <label className="label">SKU / Tarif-ID<input name="sku" maxLength={120} className="field" /></label>
            <label className="label">Zielgruppe<select name="audience" className="field"><option value="both">Privat & Business</option><option value="private">Privat</option><option value="business">Business</option></select></label>
            <label className="label">Status<select name="lifecycleStatus" className="field"><option value="active">Aktiv</option><option value="new">Neu</option><option value="test">Testphase</option><option value="paused">Pausiert</option><option value="do_not_market">Nicht vermarkten</option><option value="phasing_out">Auslaufend</option><option value="ended">Beendet</option></select></label>
            <label className="label sm:col-span-2">Beschreibung<textarea name="description" rows={3} maxLength={5000} className="field" /></label>
            <label className="label">Region<input name="region" defaultValue="Deutschland" maxLength={300} className="field" /></label>
            <label className="label">Einreichungsportal<input name="submissionUrl" type="url" maxLength={500} className="field" /></label>
            <label className="label sm:col-span-2">Supportkontakt<input name="supportContact" maxLength={500} className="field" /></label>
            <label className="label sm:col-span-2">Vertriebskanäle · Kanal|allowed/conditional/blocked|Hinweis<textarea name="marketingChannels" rows={4} className="field" placeholder={"Door-to-Door|allowed\nTelefonvertrieb|conditional|Nur nach Freigabe\nMeta Ads|blocked"} /></label>
            <label className="label sm:col-span-2">Vermarktungsbedingungen<textarea name="marketingConditions" rows={3} maxLength={5000} className="field" /></label>
            <label className="label sm:col-span-2">Verkaufsargumente · eine Zeile pro Punkt<textarea name="salesArguments" rows={3} className="field" /></label>
            <label className="label sm:col-span-2">Kurzpitch<textarea name="shortPitch" rows={2} maxLength={1200} className="field" /></label>
            <label className="label">Telefonpitch<textarea name="phonePitch" rows={4} maxLength={3000} className="field" /></label>
            <label className="label">D2D-Pitch<textarea name="d2dPitch" rows={4} maxLength={3000} className="field" /></label>
            <label className="label">B2B-Pitch<textarea name="b2bPitch" rows={4} maxLength={3000} className="field" /></label>
            <label className="label">WhatsApp-Vorlage<textarea name="whatsappTemplate" rows={4} maxLength={2500} className="field" /></label>
            <label className="label sm:col-span-2">E-Mail-Vorlage<textarea name="emailTemplate" rows={4} maxLength={4000} className="field" /></label>
            <label className="label sm:col-span-2">Social-Ideen · eine Zeile pro Idee<textarea name="socialIdeas" rows={3} className="field" /></label>
            <label className="label sm:col-span-2">Einwände · Einwand|Antwort<textarea name="objections" rows={4} className="field" placeholder={"Zu teuer|Wir prüfen zuerst, ob der Mehrwert zum Bedarf passt.\nIch möchte warten|Kein Problem – wir klären nur die Fakten, die Entscheidung bleibt beim Kunden."} /></label>
            <label className="label sm:col-span-2">Abschlussprozess<textarea name="completionProcess" rows={4} maxLength={8000} className="field" placeholder="1. Bedarf prüfen&#10;2. Daten aufnehmen&#10;3. Antrag einreichen" /></label>
            <label className="label">Checkliste · eine Zeile pro Punkt<textarea name="checklist" rows={4} className="field" /></label>
            <label className="label">Unterlagen · eine Zeile pro Punkt<textarea name="requiredDocuments" rows={4} className="field" /></label>
            <label className="label">Interner Hinweis / Badge<input name="highlight" maxLength={120} placeholder="z. B. Neue Aktion" className="field" /></label>
            <label className="flex items-center gap-2 self-end rounded-xl border border-line px-3 py-3 text-[13px] font-semibold"><input name="trainingRequired" type="checkbox" /> Schulung erforderlich</label>
          </div>
          <button disabled={busy !== null || data.providers.length === 0} className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white hover:bg-electric disabled:opacity-50">{busy === "product" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Produkt speichern</button>
        </form>
      </div>

      {data.owner && <div className="grid gap-5 xl:grid-cols-2">
        <form onSubmit={(event) => submit(event, "commission", (form) => ({
          providerId: Number(form.get("providerId")), sourceName: csvName || form.get("sourceName"), sourceType: csvRows.length ? "csv" : "structured",
          validFrom: form.get("validFrom") ? new Date(String(form.get("validFrom")) + "T00:00:00.000Z").toISOString() : null,
          validTo: form.get("validTo") ? new Date(String(form.get("validTo")) + "T23:59:59.999Z").toISOString() : null,
          rows: csvRows.length ? csvRows : lines(form.get("manualRows")).map((line) => {
            const [productName, category, gross, externalProductId] = line.split("|").map((part) => part.trim());
            return { productName, category, grossAmount: Number((gross || "0").replace(",", ".")), externalProductId: externalProductId || undefined };
          }),
        }), "/api/portal/admin/catalog/commission")} className="rounded-[24px] border border-electric/20 bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3"><FileSpreadsheet className="h-5 w-5 text-electric-deep" /><div><h3 className="text-[17px] font-extrabold">Provisionsliste importieren</h3><p className="text-[12px] text-steel">Owner-only · 15 % werden serverseitig als interner Planungsanteil geführt.</p></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="label">Partner<select name="providerId" required className="field"><option value="">Auswählen</option>{data.providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="label">Bezeichnung<input name="sourceName" maxLength={240} placeholder="Provision Oktober 2026" className="field" /></label>
            <label className="label">Gültig ab<input name="validFrom" type="date" className="field" /></label>
            <label className="label">Gültig bis<input name="validTo" type="date" className="field" /></label>
            <label className="label sm:col-span-2">CSV-Datei<input type="file" accept=".csv,text/csv" className="field" onChange={(event) => void loadCsv(event.target.files?.[0] ?? null)} /></label>
            {csvRows.length > 0 && <div className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px] text-emerald-800"><Upload className="mr-2 inline h-4 w-4" />{csvRows.length} Positionen erkannt. Erwartete Spalten: Produkt, Kategorie, Provision; optional SKU/Tarif-ID.</div>}
            <label className="label sm:col-span-2">Alternativ manuell · Produkt|Kategorie|Provision|SKU<textarea name="manualRows" rows={4} className="field" placeholder={"GigaMobil M|Mobilfunk|300|GM-M\nGlasfaser 1000|Internet|450|GF1000"} /></label>
          </div>
          <button disabled={busy !== null || (!csvRows.length && !data.providers.length)} className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white hover:bg-electric disabled:opacity-50">{busy === "commission" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Liste versioniert importieren</button>
        </form>

        <form onSubmit={(event) => submit(event, "pool", (form) => ({
          entryType: form.get("entryType"), category: form.get("category"), amount: Number(form.get("amount")), note: form.get("note"), reference: form.get("reference"),
        }), "/api/portal/admin/catalog/pool")} className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
          <div className="flex items-center gap-3"><CircleDollarSign className="h-5 w-5 text-electric-deep" /><div><h3 className="text-[17px] font-extrabold">Benefit-Pool buchen</h3><p className="text-[12px] text-steel">Incentives, Reisen, Firmenwagen, Wellpass, Schulungen und weitere interne Budgets.</p></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="label">Buchung<select name="entryType" className="field"><option value="credit">Gutschrift</option><option value="spend">Ausgabe</option><option value="reserve">Reservieren</option><option value="release">Reservierung freigeben</option><option value="correction">Korrektur +</option></select></label>
            <label className="label">Kategorie<select name="category" className="field"><option value="incentives">Incentives</option><option value="teamreisen">Teamreisen</option><option value="firmenwagen">Firmenwagen</option><option value="wellpass">Wellpass / Gesundheit</option><option value="schulungen">Schulungen</option><option value="events">Events</option><option value="mitarbeiterpraemien">Mitarbeiterprämien</option><option value="marketing">Marketing</option><option value="recruiting">Recruiting</option><option value="technik">Technik</option><option value="treueprogramme">Treueprogramme</option><option value="vorsorge">Vorsorge</option><option value="reserve">Reserve</option><option value="sonstiges">Sonstiges</option></select></label>
            <label className="label">Betrag (€)<input name="amount" type="number" min="0.01" step="0.01" required className="field" /></label>
            <label className="label">Referenz<input name="reference" maxLength={240} placeholder="z. B. Teamreise Q4" className="field" /></label>
            <label className="label sm:col-span-2">Notiz<input name="note" minLength={3} maxLength={1000} required className="field" /></label>
          </div>
          <button disabled={busy !== null} className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white hover:bg-electric disabled:opacity-50">{busy === "pool" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PiggyBank className="h-4 w-4" />} Pool-Buchung speichern</button>
        </form>
      </div>}

      <form onSubmit={(event) => submit(event, "update", (form) => ({
        productId: form.get("productId") ? Number(form.get("productId")) : null,
        providerId: form.get("providerId") ? Number(form.get("providerId")) : null,
        updateType: form.get("updateType"), title: form.get("title"), body: form.get("body"), important: form.get("important") === "on",
      }), "/api/portal/admin/catalog/updates")} className="rounded-[24px] border border-line bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3"><BookOpenCheck className="h-5 w-5 text-electric-deep" /><h3 className="text-[17px] font-extrabold">Produkt-News veröffentlichen</h3></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="label">Produkt<select name="productId" className="field"><option value="">Kein einzelnes Produkt</option>{data.products.map((item) => <option key={item.id} value={item.id}>{item.providerName} · {item.name}</option>)}</select></label>
          <label className="label">Partner<select name="providerId" className="field"><option value="">Kein einzelner Partner</option>{data.providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="label">Typ<select name="updateType" className="field"><option value="info">Info</option><option value="price">Preisänderung</option><option value="commission">Provision</option><option value="campaign">Aktion</option><option value="process">Prozess</option><option value="training">Schulung</option><option value="stop">Vermarktungsstopp</option></select></label>
          <label className="label">Titel<input name="title" required minLength={3} maxLength={220} className="field" /></label>
          <label className="label sm:col-span-2">Beschreibung<textarea name="body" rows={3} maxLength={4000} className="field" /></label>
          <label className="flex items-center gap-2 rounded-xl border border-line px-3 py-3 text-[13px] font-semibold"><input name="important" type="checkbox" /> Als wichtig markieren</label>
        </div>
        <button disabled={busy !== null} className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[13.5px] font-semibold text-white hover:bg-electric disabled:opacity-50">{busy === "update" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} Update veröffentlichen</button>
      </form>
    </section>}

    {data.owner && data.ownerData?.commissionLists.length ? <section className="rounded-[24px] border border-line bg-white p-5 sm:p-6"><div className="flex items-center gap-3"><FileSpreadsheet className="h-5 w-5 text-electric-deep" /><h2 className="text-[17px] font-extrabold">Letzte Provisionslisten</h2></div><div className="mt-4 divide-y divide-line">{data.ownerData.commissionLists.map((list) => <div key={list.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"><div><p className="text-[13.5px] font-bold">{list.providerName} · Version {list.version}</p><p className="text-[11.5px] text-steel">{list.sourceName} · {list.sourceType}</p></div><p className="text-[12px] text-steel">{date(list.createdAt)}</p></div>)}</div></section> : null}
  </div>;
}
