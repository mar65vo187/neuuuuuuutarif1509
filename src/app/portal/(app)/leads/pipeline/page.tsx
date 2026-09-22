import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, LayoutDashboard, Plus, Search, SlidersHorizontal } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listLeadsPage } from "@/lib/queries";
import { getLeadIntelligence } from "@/lib/lead-intelligence";
import { LEAD_PRIORITY_LABELS, LEAD_STATUS_LABELS, LEAD_TYPE_LABELS } from "@/lib/content";
import { permissionSnapshot, PORTAL_PERMISSION } from "@/lib/enterprise-access";
import { LeadPipelineBoard } from "@/components/portal/LeadPipelineBoard";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2";
const FIELD = `mt-1.5 min-h-11 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 ${FOCUS}`;
const ACTION = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${FOCUS}`;

function validChoice(value: string | undefined, choices: readonly string[]) {
  return value && choices.includes(value) ? value : undefined;
}

export default async function LeadPipelinePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fleads%2Fpipeline");
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : undefined;
  const status = validChoice(value("status"), Object.keys(LEAD_STATUS_LABELS));
  const type = validChoice(value("type"), Object.keys(LEAD_TYPE_LABELS));
  const priority = validChoice(value("priority"), [...Object.keys(LEAD_PRIORITY_LABELS), "attention"]);
  const next = validChoice(value("next"), ["overdue", "today", "missing"]);
  const relation = validChoice(value("relation"), ["existing", "interest", "sold", "none"]);
  const requestedProductId = Number(value("product"));
  const productId = relation !== "none" && Number.isSafeInteger(requestedProductId) && requestedProductId > 0 ? requestedProductId : undefined;
  const q = value("q")?.trim().slice(0, 120) || undefined;
  const sort = validChoice(value("sort"), ["next", "newest", "oldest"]) ?? "next";
  const requestedPage = Number(value("page"));
  const requestedPageSize = Number(value("pageSize"));
  const pageSize = [25, 50, 100].includes(requestedPageSize) ? requestedPageSize : 50;

  const capabilities = await permissionSnapshot(user, [PORTAL_PERMISSION.LEAD_EDIT] as const);
  const canEdit = capabilities[PORTAL_PERMISSION.LEAD_EDIT];
  if (!canEdit) redirect("/portal");
  const result = await listLeadsPage({ status, type, priority, next, productId, productRelation: relation, q, sort, page: requestedPage, pageSize }, user);
  const current: Record<string, string | undefined> = {
    status,
    type,
    priority,
    next,
    product: productId ? String(productId) : undefined,
    relation,
    q,
    sort,
    pageSize: String(result.pageSize),
  };
  const href = (changes: Record<string, string | undefined> = {}, path = "/portal/leads/pipeline") => {
    const query = new URLSearchParams();
    for (const [key, item] of Object.entries({ ...current, ...changes })) if (item) query.set(key, item);
    return `${path}?${query.toString()}`;
  };
  const stageLinks = [
    { key: "", label: "Alle Stufen", href: href({ status: undefined }) },
    ...Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => ({ key, label, href: href({ status: key }) })),
  ];
  const serialized = result.rows.map((lead) => {
    const meta = (lead.meta ?? {}) as Record<string, unknown>;
    const intelligence = getLeadIntelligence(lead);
    return {
      id: lead.id,
      name: lead.name || `Lead #${lead.id}`,
      topic: lead.topic,
      status: lead.status,
      priority: lead.priority,
      contactOutcome: lead.contactOutcome,
      nextActionAt: lead.nextActionAt?.toISOString() ?? null,
      nextActionOverdue: lead.nextActionOverdue,
      confirmedSlot: lead.confirmedSlot,
      phone: lead.phone,
      email: lead.email,
      companyName: typeof meta.companyName === "string" ? meta.companyName : null,
      audience: (meta.audience === "b2b" ? "b2b" : "b2c") as "b2b" | "b2c",
      createdByName: lead.createdByName,
      assignedName: lead.assignedName,
      existingProductNames: lead.existingProductNames,
      interestProductNames: lead.interestProductNames,
      soldProductNames: lead.soldProductNames,
      intelligence: { label: intelligence.label, detail: intelligence.detail, tone: intelligence.tone },
    };
  });
  const first = result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const last = Math.min(result.page * result.pageSize, result.total);
  const pageStart = Math.max(1, Math.min(result.page - 2, result.totalPages - 4));
  const pages = Array.from({ length: Math.min(5, result.totalPages) }, (_, index) => pageStart + index);
  const filtered = Boolean(status || type || priority || next || productId || relation || q);
  const number = (count: number) => count.toLocaleString("de-DE");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={href({}, "/portal/leads")} className={`inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-slate-200 hover:text-electric-deep ${FOCUS}`}><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Zur Lead-Liste</Link>
          <p className="mt-3 text-sm font-semibold text-electric-deep">TarifWerk · Vertrieb</p>
          <h1 className="mt-2 text-[clamp(1.7rem,3vw,2.5rem)] font-extrabold tracking-tight">Deine Vertriebs-Pipeline</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">Vom ersten Kontakt bis zum Abschluss: Zuständigkeit, Produkte und nächste Schritte direkt im Blick.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={href({}, "/portal/leads")} className={`${ACTION} border-slate-700 bg-slate-900 text-slate-100 hover:border-electric`}><LayoutDashboard aria-hidden="true" className="h-4 w-4" /> Listenansicht</Link>
          {canEdit && <Link href="/portal/leads/neu" className={`${ACTION} border-ink bg-ink text-white hover:bg-electric-deep`}><Plus aria-hidden="true" className="h-4 w-4" /> Lead anlegen</Link>}
        </div>
      </header>

      <section aria-labelledby="pipeline-filter-title" className="rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="pipeline-filter-title" className="flex items-center gap-2 text-base font-bold text-slate-100"><SlidersHorizontal aria-hidden="true" className="h-4 w-4" /> Leads finden</h2>
          <p className="text-sm text-slate-300">{user.role === "admin" ? "Sichtbarkeit: alle Leads" : "Sichtbarkeit: deine selbst angelegten Leads"}</p>
        </div>
        <form key={new URLSearchParams(Object.entries(current).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString()} action="/portal/leads/pipeline" method="get" className="mt-4 grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries({ status, type, product: productId ? String(productId) : undefined, relation }).map(([key, item]) => item ? <input key={key} type="hidden" name={key} value={item} /> : null)}
          <label className="block text-sm font-semibold text-slate-200 sm:col-span-2">Suche
            <input name="q" type="search" defaultValue={q ?? ""} maxLength={120} placeholder="Name, Telefon, E-Mail, Thema oder Region" className={FIELD} />
          </label>
          <label className="block text-sm font-semibold text-slate-200">Wiedervorlage
            <select name="next" defaultValue={next ?? ""} className={FIELD}>
              <option value="">Alle Wiedervorlagen</option>
              <option value="overdue">Überfällig</option>
              <option value="today">Heute fällig · Berlin</option>
              <option value="missing">Ohne nächsten Schritt</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-200">Priorität
            <select name="priority" defaultValue={priority ?? ""} className={FIELD}>
              <option value="">Alle Prioritäten</option>
              <option value="attention">Hoch & heiß · offene Leads</option>
              {Object.entries(LEAD_PRIORITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-200">Sortierung
            <select name="sort" defaultValue={sort} className={FIELD}>
              <option value="next">Nächste Aktion zuerst</option>
              <option value="newest">Neueste Leads zuerst</option>
              <option value="oldest">Älteste Leads zuerst</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-200">Leads pro Seite
            <select name="pageSize" defaultValue={result.pageSize} className={FIELD}>
              {[25, 50, 100].map((size) => <option key={size} value={size}>{size} Leads</option>)}
            </select>
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" className={`${ACTION} border-ink bg-ink text-white hover:bg-electric-deep`}><Search aria-hidden="true" className="h-4 w-4" /> Filter anwenden</button>
            {filtered && <Link href="/portal/leads/pipeline" className={`${ACTION} border-slate-700 bg-slate-900 text-slate-200 hover:border-electric`}>Alle Filter zurücksetzen</Link>}
          </div>
        </form>
        {(type || productId || relation) && <p className="mt-4 rounded-xl bg-slate-950/50 px-3 py-2 text-sm leading-relaxed text-slate-200">Aus der Listenansicht übernommen: {[type ? `Typ: ${LEAD_TYPE_LABELS[type] ?? type}` : null, productId ? `Produkt #${productId}` : null, relation ? `Produktbezug: ${{ existing: "vorhanden", interest: "Interesse", sold: "abgeschlossen", none: "kein Produktprofil · offene Leads" }[relation]}` : null].filter(Boolean).join(" · ")}. Die Filter bleiben beim Wechseln der Stufe erhalten.</p>}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3">
        <p className="text-sm text-slate-200"><strong className="text-slate-100">{number(first)}–{number(last)}</strong> von <strong className="text-slate-100">{number(result.total)}</strong> {filtered ? "passenden" : "sichtbaren"} Leads</p>
        <p className="text-sm text-slate-300">Seite {number(result.page)} von {number(result.totalPages)}</p>
      </div>

      <LeadPipelineBoard rows={serialized} canEdit={canEdit} activeStatus={status ?? ""} stageLinks={stageLinks} />

      {result.totalPages > 1 && (
        <nav aria-label="Pipeline-Seiten" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
          {result.page > 1 ? <Link href={href({ page: String(result.page - 1) })} className={`${ACTION} border-slate-700 text-slate-100 hover:border-electric`}><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Zurück</Link> : <span aria-disabled="true" className={`${ACTION} border-slate-800 text-slate-400`}><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Zurück</span>}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {pageStart > 1 && <><Link href={href({ page: "1" })} aria-label="Zur ersten Seite" className={`${ACTION} min-w-11 border-slate-700 text-slate-200`}>1</Link>{pageStart > 2 && <span aria-hidden="true" className="text-slate-400">…</span>}</>}
            {pages.map((page) => <Link key={page} href={href({ page: String(page) })} aria-label={`Seite ${page}`} aria-current={page === result.page ? "page" : undefined} className={`${ACTION} min-w-11 ${page === result.page ? "border-ink bg-ink text-white" : "border-slate-700 text-slate-200 hover:border-electric"}`}>{page}</Link>)}
            {pages[pages.length - 1] < result.totalPages && <>{pages[pages.length - 1] < result.totalPages - 1 && <span aria-hidden="true" className="text-slate-400">…</span>}<Link href={href({ page: String(result.totalPages) })} aria-label="Zur letzten Seite" className={`${ACTION} min-w-11 border-slate-700 text-slate-200`}>{result.totalPages}</Link></>}
          </div>
          {result.page < result.totalPages ? <Link href={href({ page: String(result.page + 1) })} className={`${ACTION} border-slate-700 text-slate-100 hover:border-electric`}>Weiter <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link> : <span aria-disabled="true" className={`${ACTION} border-slate-800 text-slate-400`}>Weiter <ArrowRight aria-hidden="true" className="h-4 w-4" /></span>}
        </nav>
      )}
    </div>
  );
}
