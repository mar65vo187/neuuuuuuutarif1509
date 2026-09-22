import Link from "next/link";
import { redirect } from "next/navigation";
import { AlarmClock, ArrowRight, CalendarCheck, ChevronLeft, ChevronRight, LayoutDashboard, ListFilter, Plus, Search, ShieldCheck, X } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/portal/ui";
import { LeadBulkList } from "@/components/portal/LeadBulkList";
import { SavedViewsBar } from "@/components/portal/SavedViewsBar";
import { LEAD_PRIORITY_LABELS, LEAD_STATUS_LABELS, LEAD_TYPE_LABELS } from "@/lib/content";
import { getLeadCrmOverview, listLeadProductOptions, listLeadsPage } from "@/lib/queries";
import { listSavedViews } from "@/lib/portal-productivity";
import { listLeadAssignableEmployees, permissionSnapshot, PORTAL_PERMISSION } from "@/lib/enterprise-access";

export const dynamic = "force-dynamic";

const STATUSES = Object.keys(LEAD_STATUS_LABELS);
const TYPES = Object.keys(LEAD_TYPE_LABELS);
const PRIORITIES = [...Object.keys(LEAD_PRIORITY_LABELS), "attention"];
const SORTS = new Set(["newest", "next", "oldest"]);
const NEXT_FILTERS = new Set(["overdue", "today", "missing"]);

type LeadSearchParams = Record<string, string | string[] | undefined>;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<LeadSearchParams> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fleads");

  const capabilities = await permissionSnapshot(user, [PORTAL_PERMISSION.LEAD_EDIT, PORTAL_PERMISSION.LEAD_ASSIGN] as const);
  const canEdit = capabilities[PORTAL_PERMISSION.LEAD_EDIT];
  const canAssign = capabilities[PORTAL_PERMISSION.LEAD_ASSIGN];
  if (!canEdit) redirect("/portal");

  const rawParams = await searchParams;
  const params = Object.fromEntries(Object.entries(rawParams).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  const s = params.status && STATUSES.includes(params.status) ? params.status : undefined;
  const t = params.type && TYPES.includes(params.type) ? params.type : undefined;
  const priority = params.priority && PRIORITIES.includes(params.priority) ? params.priority : undefined;
  const next = params.next && NEXT_FILTERS.has(params.next) ? params.next : undefined;
  const parsedProductId = params.product ? Number(params.product) : undefined;
  const relation = params.relation && ["interest", "existing", "sold", "none"].includes(params.relation) ? params.relation : undefined;
  const productId = relation !== "none" && parsedProductId && Number.isSafeInteger(parsedProductId) && parsedProductId > 0 ? parsedProductId : undefined;
  const q = params.q?.trim().slice(0, 120) || undefined;
  const sort = params.sort && SORTS.has(params.sort) ? params.sort : "newest";
  const requestedAssignee = params.assignee ? Number(params.assignee) : NaN;
  const assigneeId = canAssign && Number.isSafeInteger(requestedAssignee) && requestedAssignee > 0 ? requestedAssignee : undefined;

  const requestedPage = Number(params.page ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [result, savedViews, assignees, overview, productOptions] = await Promise.all([
    listLeadsPage({ status: s, type: t, priority, next, productId, productRelation: relation, assignedEmployeeId: assigneeId, q, sort, page, pageSize: 25 }, user),
    listSavedViews(user, "leads"),
    canAssign
      ? listLeadAssignableEmployees()
      : Promise.resolve([]),
    getLeadCrmOverview(user),
    listLeadProductOptions(),
  ]);

  const current: Record<string, string | undefined> = {
    status: s,
    type: t,
    priority,
    next,
    product: productId ? String(productId) : undefined,
    relation,
    assignee: assigneeId ? String(assigneeId) : undefined,
    q,
    sort: sort !== "newest" ? sort : undefined,
  };

  const link = (changes: Record<string, string | undefined>) => {
    const merged = { ...current, ...changes };
    const nextParams = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) if (value) nextParams.set(key, value);
    const query = nextParams.toString();
    return `/portal/leads${query ? `?${query}` : ""}`;
  };

  const savedFilters = Object.fromEntries(Object.entries(current).filter((entry): entry is [string, string] => Boolean(entry[1])));

  const number = new Intl.NumberFormat("de-DE");
  const nextLabels: Record<string, string> = { overdue: "Überfällig", today: "Heute fällig", missing: "Ohne Wiedervorlage" };
  const relationLabels: Record<string, string> = { interest: "Interesse", existing: "Hat bereits", sold: "Über TarifWerk abgeschlossen", none: "Ohne Produktprofil" };
  const selectedProduct = productOptions.find((product) => product.id === productId);
  const selectedAssignee = assignees.find((person) => person.id === assigneeId);
  const activeFilters = [
    s ? { key: "status", label: LEAD_STATUS_LABELS[s] } : null,
    t ? { key: "type", label: LEAD_TYPE_LABELS[t] } : null,
    priority ? { key: "priority", label: priority === "attention" ? "Hohe Priorität + Hot" : LEAD_PRIORITY_LABELS[priority] } : null,
    next ? { key: "next", label: nextLabels[next] } : null,
    productId ? { key: "product", label: selectedProduct?.name ?? `Produkt #${productId}` } : null,
    relation ? { key: "relation", label: relationLabels[relation] } : null,
    assigneeId ? { key: "assignee", label: `Zuständig: ${selectedAssignee?.name ?? `Mitarbeiter #${assigneeId}`}` } : null,
    q ? { key: "q", label: `Suche: ${q}` } : null,
  ].filter((filter): filter is { key: string; label: string } => filter !== null);
  const hasAdvancedFilters = Boolean(t || priority || next || productId || relation || assigneeId);
  const rangeStart = result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const rangeEnd = Math.min(result.page * result.pageSize, result.total);
  const pageNumbers = [...new Set([1, result.page - 1, result.page, result.page + 1, result.totalPages])]
    .filter((value) => value >= 1 && value <= result.totalPages).sort((a, b) => a - b);
  const focusCards = [
    { key: "overdue", label: "Überfällig", description: "Offene Rückrufe zuerst bearbeiten", count: overview.overdueCount, icon: AlarmClock, className: "border-red-200/30 bg-red-50 text-red-800" },
    { key: "today", label: "Heute nachfassen", description: "Deine fälligen nächsten Schritte", count: overview.dueTodayCount, icon: CalendarCheck, className: "border-electric/20 bg-electric/[0.07] text-electric-deep" },
    { key: "missing", label: "Nächsten Schritt planen", description: "Offene Leads ohne Wiedervorlage", count: overview.missingNextCount, icon: ListFilter, className: "border-amber-200/30 bg-amber-50 text-amber-800" },
  ];
  const stages = [
    { key: "neu", label: "Neu", value: overview.newCount },
    { key: "kontaktiert", label: "Angerufen", value: overview.calledCount },
    { key: "termin_bestaetigt", label: "Terminiert", value: overview.appointmentCount },
    { key: "in_beratung", label: "In Beratung", value: overview.consultCount },
    { key: "abgeschlossen", label: "Abgeschlossen", value: overview.wonCount },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-electric-deep">Kundenbeziehungen entwickeln</p>
          <h1 className="mt-2 text-[clamp(1.7rem,3vw,2.4rem)] font-extrabold tracking-tight">Dein Lead-Arbeitsplatz</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-steel">Kontakte im Blick. Nächste Schritte klar. Mehr Zeit für gute Beratung.</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-steel"><ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />{user.role === "admin" ? "Administrator · alle Leads" : "Deine selbst angelegten Leads"} · {number.format(overview.total)} gesamt</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/leads/pipeline" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-bold text-ink hover:border-electric/30"><LayoutDashboard aria-hidden="true" className="h-4 w-4" /> Pipeline</Link>
          {canEdit && <Link href="/portal/leads/neu" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-electric px-4 text-sm font-bold text-white shadow-sm hover:bg-electric-deep"><Plus aria-hidden="true" className="h-4 w-4" /> Lead anlegen</Link>}
        </div>
      </header>

      <section aria-label="Arbeitsfokus im gesamten sichtbaren Bestand" className="grid gap-3 md:grid-cols-3">
        {focusCards.map(({ key, label, description, count, icon: Icon, className }) => (
          <Link key={key} href={link({ next: next === key ? undefined : key, sort: "next" })} aria-current={next === key ? "page" : undefined} className={`flex min-h-24 items-center gap-3 rounded-2xl border p-4 transition hover:shadow-soft ${next === key ? "ring-2 ring-electric" : ""} ${className}`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/60"><Icon aria-hidden="true" className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1"><p className="text-sm font-extrabold">{label}</p><p className="mt-1 text-xs leading-relaxed opacity-80">{description}</p></div>
            <strong className="text-3xl font-extrabold tabular-nums">{number.format(count)}</strong>
          </Link>
        ))}
      </section>

      <nav aria-label="Lead-Status" className="flex flex-wrap items-center gap-2">
        <Link href={link({ status: undefined })} aria-current={!s ? "page" : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-bold ${!s ? "border-electric/40 bg-electric/15 text-electric-deep" : "border-line bg-white text-ink"}`}>Alle <span className="tabular-nums opacity-70">{number.format(overview.total)}</span></Link>
        {stages.map((stage) => <Link key={stage.key} href={link({ status: stage.key })} aria-current={s === stage.key ? "page" : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-bold ${s === stage.key ? "border-electric/40 bg-electric/15 text-electric-deep" : "border-line bg-white text-ink hover:border-electric/30"}`}>{stage.label}<span className="tabular-nums opacity-70">{number.format(stage.value)}</span></Link>)}
        <span className="px-1 text-xs text-steel">Zahlen: gesamter sichtbarer Bestand</span>
      </nav>

      <Card>
        <form method="get" action="/portal/leads" className="space-y-4">
          <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,2fr)_1fr_1fr_auto]">
            <label className="space-y-1.5 text-xs font-bold text-ink">Kontakt suchen<span className="relative block"><Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" /><input name="q" defaultValue={q ?? ""} maxLength={120} className="field h-11 pl-10 font-normal" placeholder="Name, E-Mail, Telefon, Thema …" /></span></label>
            <label className="space-y-1.5 text-xs font-bold text-ink">Status<select name="status" defaultValue={s ?? ""} className="field h-11 font-normal"><option value="">Alle Status</option>{STATUSES.map((key) => <option key={key} value={key}>{LEAD_STATUS_LABELS[key]}</option>)}</select></label>
            <label className="space-y-1.5 text-xs font-bold text-ink">Sortierung<select name="sort" defaultValue={sort} className="field h-11 font-normal"><option value="newest">Neueste zuerst</option><option value="next">Nächste Aktion zuerst</option><option value="oldest">Älteste zuerst</option></select></label>
            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-electric px-5 text-sm font-bold text-white hover:bg-electric-deep"><Search aria-hidden="true" className="h-4 w-4" /> Anwenden</button>
          </div>
          <details open={hasAdvancedFilters || undefined} className="group rounded-xl border border-line bg-paper/40">
            <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-ink marker:text-electric">Weitere Filter{hasAdvancedFilters ? " · aktiv" : ""}</summary>
            <div className="grid gap-3 border-t border-line p-4 sm:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-1.5 text-xs font-bold text-ink">Priorität<select name="priority" defaultValue={priority ?? ""} className="field min-h-11 font-normal"><option value="">Alle Prioritäten</option><option value="attention">Hot + hohe Priorität</option>{Object.entries(LEAD_PRIORITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              <label className="space-y-1.5 text-xs font-bold text-ink">Nächster Schritt<select name="next" defaultValue={next ?? ""} className="field min-h-11 font-normal"><option value="">Alle Wiedervorlagen</option>{Object.entries(nextLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              <label className="space-y-1.5 text-xs font-bold text-ink">Lead-Art<select name="type" defaultValue={t ?? ""} className="field min-h-11 font-normal"><option value="">Alle Arten</option>{TYPES.map((key) => <option key={key} value={key}>{LEAD_TYPE_LABELS[key]}</option>)}</select></label>
              <label className="space-y-1.5 text-xs font-bold text-ink">Produkt<select name="product" defaultValue={productId ? String(productId) : ""} className="field min-h-11 font-normal"><option value="">Alle Produkte</option>{productId && !selectedProduct && <option value={productId}>Produkt #{productId}</option>}{productOptions.map((product) => <option key={product.id} value={product.id}>{product.category} · {product.providerName} · {product.name}</option>)}</select></label>
              <label className="space-y-1.5 text-xs font-bold text-ink">Produktbeziehung<select name="relation" defaultValue={relation ?? ""} className="field min-h-11 font-normal"><option value="">Jede Produktbeziehung</option>{Object.entries(relationLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              {canAssign && <label className="space-y-1.5 text-xs font-bold text-ink">Zuständig<select name="assignee" defaultValue={assigneeId ? String(assigneeId) : ""} className="field min-h-11 font-normal"><option value="">Alle Zuständigen</option>{assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>}
            </div>
          </details>
          {activeFilters.length > 0 && <div className="flex flex-wrap items-center gap-2" aria-label="Aktive Filter"><span className="text-xs font-bold text-steel">Aktiv:</span>{activeFilters.map((filter) => <Link key={filter.key} href={link({ [filter.key]: undefined })} aria-label={`Filter entfernen: ${filter.label}`} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-electric/20 bg-electric/[0.06] px-3 text-xs font-bold text-electric-deep"><span className="truncate">{filter.label}</span><X aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /></Link>)}<Link href="/portal/leads" className="inline-flex min-h-11 items-center px-2 text-xs font-bold text-steel underline underline-offset-4">Alle Filter zurücksetzen</Link></div>}
        </form>
      </Card>

      <SavedViewsBar area="leads" basePath="/portal/leads" views={savedViews} currentFilters={savedFilters} />

      <section aria-labelledby="lead-results-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="lead-results-heading" className="text-base font-extrabold text-ink">{activeFilters.length ? "Gefilterte Leads" : "Alle Leads"} <span className="ml-1 text-sm font-semibold text-steel">({number.format(result.total)})</span></h2>
        <p className="text-xs text-steel">{result.total ? `${number.format(rangeStart)}–${number.format(rangeEnd)} von ${number.format(result.total)}` : "Keine Treffer"}</p>
      </div>
      <Card className="p-0 sm:p-0">
        {result.rows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Search aria-hidden="true" className="mx-auto h-7 w-7 text-steel" />
            <h3 className="mt-4 text-base font-bold text-ink">{activeFilters.length ? "Keine Leads für diese Auswahl" : "Dein nächster Kontakt beginnt hier"}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-steel">{activeFilters.length ? "Passe die Filter an oder setze sie zurück, um weitere Kontakte zu sehen." : "Lege einen Lead an und halte Kontakt, Bedarf und nächsten Schritt an einem Ort fest."}</p>
            {activeFilters.length ? <Link href="/portal/leads" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-bold text-ink">Filter zurücksetzen <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link> : canEdit && <Link href="/portal/leads/neu" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-electric px-4 text-sm font-bold text-white"><Plus aria-hidden="true" className="h-4 w-4" /> Ersten Lead anlegen</Link>}
          </div>
        ) : (
          <LeadBulkList key={`${link({})}:page-${result.page}`} assignees={assignees} canEdit={canEdit} canAssign={canAssign} rows={result.rows.map((lead) => ({
            id: lead.id,
            name: lead.name,
            topic: lead.topic,
            region: lead.region,
            preferredChannel: lead.preferredChannel,
            preferredTime: lead.preferredTime,
            phone: lead.phone,
            email: lead.email,
            createdAt: lead.createdAt.toISOString(),
            advisorName: lead.advisorName,
            assignedName: lead.assignedName,
            createdByName: lead.createdByName,
            type: lead.type,
            status: lead.status,
            priority: lead.priority,
            contactOutcome: lead.contactOutcome,
            nextActionAt: lead.nextActionAt?.toISOString() ?? null,
            nextActionOverdue: lead.nextActionOverdue,
            tags: lead.tags,
            existingProductNames: lead.existingProductNames,
            interestProductNames: lead.interestProductNames,
            soldProductNames: lead.soldProductNames,
            referralSourceName: typeof (lead.meta as Record<string, unknown> | null)?.referralSourceName === "string"
              ? String((lead.meta as Record<string, unknown>).referralSourceName)
              : null,
            companyName: typeof (lead.meta as Record<string, unknown> | null)?.companyName === "string"
              ? String((lead.meta as Record<string, unknown>).companyName)
              : null,
            audience: (lead.meta as Record<string, unknown> | null)?.audience === "b2b"
              ? "b2b"
              : (lead.meta as Record<string, unknown> | null)?.audience === "b2c"
                ? "b2c"
                : null,
          }))} />
        )}
      </Card>
      {result.totalPages > 1 && <nav aria-label="Lead-Ergebnisseiten" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-3">
        {result.page > 1 ? <Link rel="prev" href={link({ page: String(result.page - 1) })} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-line px-3 text-sm font-bold text-ink"><ChevronLeft aria-hidden="true" className="h-4 w-4" /> Zurück</Link> : <span aria-disabled="true" className="inline-flex min-h-11 items-center gap-1 px-3 text-sm text-steel"><ChevronLeft aria-hidden="true" className="h-4 w-4" /> Zurück</span>}
        <div className="hidden items-center gap-1 sm:flex">{pageNumbers.map((value, index) => <span key={value} className="inline-flex items-center gap-1">{index > 0 && value - pageNumbers[index - 1] > 1 && <span aria-hidden="true" className="px-2 text-steel">…</span>}<Link href={link({ page: String(value) })} aria-label={`Seite ${value}`} aria-current={result.page === value ? "page" : undefined} className={`grid h-11 min-w-11 place-items-center rounded-xl px-2 text-sm font-bold ${result.page === value ? "bg-electric text-white" : "text-ink hover:bg-paper"}`}>{number.format(value)}</Link></span>)}</div>
        <span className="text-xs text-steel sm:hidden">{number.format(result.page)} / {number.format(result.totalPages)}</span>
        {result.page < result.totalPages ? <Link rel="next" href={link({ page: String(result.page + 1) })} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-line px-3 text-sm font-bold text-ink">Weiter <ChevronRight aria-hidden="true" className="h-4 w-4" /></Link> : <span aria-disabled="true" className="inline-flex min-h-11 items-center gap-1 px-3 text-sm text-steel">Weiter <ChevronRight aria-hidden="true" className="h-4 w-4" /></span>}
      </nav>}
      </section>
    </div>
  );
}
