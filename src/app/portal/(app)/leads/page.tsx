import Link from "next/link";
import { redirect } from "next/navigation";
import { AlarmClock, BadgeCheck, CalendarCheck, Flame, LayoutDashboard, PackageSearch, PhoneCall, Plus, Search, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/portal/ui";
import { LeadBulkList } from "@/components/portal/LeadBulkList";
import { SavedViewsBar } from "@/components/portal/SavedViewsBar";
import { LEAD_PRIORITY_LABELS, LEAD_STATUS_LABELS, LEAD_TYPE_LABELS } from "@/lib/content";
import { getLeadCrmOverview, listLeadProductOptions, listLeads } from "@/lib/queries";
import { listSavedViews } from "@/lib/portal-productivity";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { permissionSnapshot, PORTAL_PERMISSION } from "@/lib/enterprise-access";

export const dynamic = "force-dynamic";

const STATUSES = Object.keys(LEAD_STATUS_LABELS);
const TYPES = Object.keys(LEAD_TYPE_LABELS);
const PRIORITIES = [...Object.keys(LEAD_PRIORITY_LABELS), "attention"];
const SORTS = new Set(["newest", "next", "oldest"]);
const NEXT_FILTERS = new Set(["overdue", "today", "missing"]);

type LeadSearchParams = {
  status?: string;
  type?: string;
  priority?: string;
  next?: string;
  product?: string;
  relation?: string;
  q?: string;
  sort?: string;
};

export default async function LeadsPage({ searchParams }: { searchParams: Promise<LeadSearchParams> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fleads");

  const capabilities = await permissionSnapshot(user, [PORTAL_PERMISSION.LEAD_EDIT, PORTAL_PERMISSION.LEAD_ASSIGN] as const);
  const canEdit = capabilities[PORTAL_PERMISSION.LEAD_EDIT];
  const canAssign = capabilities[PORTAL_PERMISSION.LEAD_ASSIGN];

  const params = await searchParams;
  const s = params.status && STATUSES.includes(params.status) ? params.status : undefined;
  const t = params.type && TYPES.includes(params.type) ? params.type : undefined;
  const priority = params.priority && PRIORITIES.includes(params.priority) ? params.priority : undefined;
  const next = params.next && NEXT_FILTERS.has(params.next) ? params.next : undefined;
  const parsedProductId = params.product ? Number(params.product) : undefined;
  const productId = parsedProductId && Number.isSafeInteger(parsedProductId) && parsedProductId > 0 ? parsedProductId : undefined;
  const relation = params.relation && ["interest", "existing", "sold", "none"].includes(params.relation) ? params.relation : undefined;
  const q = params.q?.trim().slice(0, 120) || undefined;
  const sort = params.sort && SORTS.has(params.sort) ? params.sort : "newest";

  const [rows, savedViews, assignees, overview, productOptions] = await Promise.all([
    listLeads({ status: s, type: t, priority, next, productId, productRelation: relation, q, sort }, user),
    listSavedViews(user, "leads"),
    canAssign
      ? db.select({ id: employees.id, name: employees.name }).from(employees).where(eq(employees.active, true)).orderBy(employees.name)
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

  const pipelineCards = [
    { label: "Neu", value: overview.newCount, href: "/portal/leads?status=neu", icon: Sparkles, className: "border-electric/20 bg-electric/[0.08] text-electric-deep" },
    { label: "Angerufen", value: overview.calledCount, href: "/portal/leads?status=kontaktiert", icon: PhoneCall, className: "border-amber-200 bg-amber-50 text-amber-800" },
    { label: "Terminiert", value: overview.appointmentCount, href: "/portal/leads?status=termin_bestaetigt", icon: CalendarCheck, className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
    { label: "In Beratung", value: overview.consultCount, href: "/portal/leads?status=in_beratung", icon: Flame, className: "border-violet-200 bg-violet-50 text-violet-800" },
    { label: "Abgeschlossen", value: overview.wonCount, href: "/portal/leads?status=abgeschlossen", icon: BadgeCheck, className: "border-ink/15 bg-ink text-white" },
    { label: "Wiedervorlage fällig", value: overview.overdueCount, href: "/portal/leads?next=overdue&sort=next", icon: AlarmClock, className: "border-red-200 bg-red-50 text-red-700" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-electric-deep">Lead CRM · Pipeline · Produkte</p>
          <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Lead-Verwaltung</h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-steel">Jeder Lead mit Status, Priorität, Wiedervorlage und Produktpotenzial – damit sofort klar ist, wer als Nächstes dran ist.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/leads/pipeline" className="inline-flex h-10 items-center gap-2 rounded-full border border-electric/20 bg-electric/[0.07] px-4 text-[13px] font-extrabold text-electric-deep hover:bg-electric/10"><LayoutDashboard className="h-4 w-4" /> Pipeline Board</Link>
          {canEdit && <Link href="/portal/leads/neu" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white shadow-[0_12px_28px_-18px_rgba(6,11,22,0.9)] hover:bg-electric"><Plus className="h-4 w-4" /> Lead anlegen</Link>}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Lead Pipeline">
        {pipelineCards.map(({ label, value, href, icon: Icon, className }) => (
          <Link key={label} href={href} className={`rounded-2xl border p-4 shadow-[0_16px_38px_-30px_rgba(6,11,22,0.5)] transition hover:-translate-y-0.5 hover:shadow-soft ${className}`}>
            <div className="flex items-center justify-between gap-2">
              <Icon className="h-4 w-4" />
              <strong className="text-[22px] leading-none">{value}</strong>
            </div>
            <p className="mt-3 text-[11.5px] font-extrabold">{label}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Link href="/portal/leads?priority=attention" className="rounded-2xl border border-champagne/25 bg-champagne/10 px-4 py-3 transition hover:-translate-y-0.5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-steel">Hot Leads</p>
          <p className="mt-1 text-[20px] font-extrabold text-ink">{overview.hotCount}</p>
        </Link>
        <Link href="/portal/leads?next=today&sort=next" className="rounded-2xl border border-electric/15 bg-electric/[0.06] px-4 py-3 transition hover:-translate-y-0.5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-steel">Heute nachfassen</p>
          <p className="mt-1 text-[20px] font-extrabold text-ink">{overview.dueTodayCount}</p>
        </Link>
        <Link href="/portal/leads?next=missing" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 transition hover:-translate-y-0.5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-amber-800">Ohne Wiedervorlage</p>
          <p className="mt-1 text-[20px] font-extrabold text-amber-900">{overview.missingNextCount}</p>
        </Link>
        <Link href="/portal/leads?relation=none" className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 transition hover:-translate-y-0.5">
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-violet-800"><PackageSearch className="h-3.5 w-3.5" /> Ohne Produktprofil</p>
          <p className="mt-1 text-[20px] font-extrabold text-violet-900">{overview.noProductCount}</p>
        </Link>
        <div className="rounded-2xl border border-line bg-white/75 px-4 py-3">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-steel">Sichtbare Leads</p>
          <p className="mt-1 text-[20px] font-extrabold text-ink">{overview.total}</p>
        </div>
      </div>

      <Card>
        <form className="grid gap-3 lg:grid-cols-[1.35fr_repeat(5,minmax(0,1fr))_auto]" method="get">
          {s && <input type="hidden" name="status" value={s} />}
          {t && <input type="hidden" name="type" value={t} />}
          <label className="relative">
            <span className="sr-only">Leads durchsuchen</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
            <input name="q" defaultValue={q ?? ""} className="field h-11 pl-10" placeholder="Name, E-Mail, Telefon, Thema …" />
          </label>
          <select name="priority" defaultValue={priority ?? ""} className="field h-11">
            <option value="">Alle Prioritäten</option>
            <option value="attention">Hot + hohe Priorität</option>
            {Object.entries(LEAD_PRIORITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <select name="next" defaultValue={next ?? ""} className="field h-11">
            <option value="">Alle Wiedervorlagen</option>
            <option value="overdue">Überfällig</option>
            <option value="today">Heute fällig</option>
            <option value="missing">Ohne Wiedervorlage</option>
          </select>
          <select name="product" defaultValue={productId ? String(productId) : ""} className="field h-11">
            <option value="">Alle Produkte</option>
            {productOptions.map((product) => <option key={product.id} value={product.id}>{product.category} · {product.providerName} · {product.name}</option>)}
          </select>
          <select name="relation" defaultValue={relation ?? ""} className="field h-11">
            <option value="">Jede Produktbeziehung</option>
            <option value="existing">Hat bereits</option>
            <option value="interest">Interesse</option>
            <option value="sold">Über TarifWerk abgeschlossen</option>
            <option value="none">Ohne Produktprofil</option>
          </select>
          <select name="sort" defaultValue={sort} className="field h-11">
            <option value="newest">Neueste zuerst</option>
            <option value="next">Nächste Aktion zuerst</option>
            <option value="oldest">Älteste zuerst</option>
          </select>
          <div className="flex gap-2">
            <button type="submit" className="h-11 rounded-xl bg-electric px-4 text-[12.5px] font-extrabold text-white hover:bg-electric-deep">Filtern</button>
            <Link href="/portal/leads" className="grid h-11 place-items-center rounded-xl border border-line bg-white px-3 text-[12px] font-bold text-steel hover:border-ink/20 hover:text-ink">Reset</Link>
          </div>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <Link href={link({ status: undefined })} className={`chip h-9 shrink-0 px-3.5 ${!s ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-700"}`}>Alle Status</Link>
          {STATUSES.map((key) => (
            <Link key={key} href={link({ status: key })} className={`chip h-9 shrink-0 px-3.5 ${s === key ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-700"}`}>{LEAD_STATUS_LABELS[key]}</Link>
          ))}
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <Link href={link({ type: undefined })} className={`chip h-9 shrink-0 px-3.5 ${!t ? "border-electric bg-electric text-white" : "border-line bg-white text-ink-700"}`}>Alle Arten</Link>
          {TYPES.map((key) => (
            <Link key={key} href={link({ type: key })} className={`chip h-9 shrink-0 px-3.5 ${t === key ? "border-electric bg-electric text-white" : "border-line bg-white text-ink-700"}`}>{LEAD_TYPE_LABELS[key]}</Link>
          ))}
        </div>
      </div>

      <SavedViewsBar area="leads" basePath="/portal/leads" views={savedViews} currentFilters={savedFilters} />

      <Card className="p-0 sm:p-0">
        {rows.length === 0 ? (
          <div className="p-10 text-center">
            <Search className="mx-auto h-6 w-6 text-steel" />
            <p className="mt-3 text-[14.5px] font-bold text-ink">Keine Leads für diese Auswahl.</p>
            <p className="mt-1 text-[12.5px] text-steel">Filter anpassen oder einen neuen Lead anlegen.</p>
          </div>
        ) : (
          <LeadBulkList assignees={assignees} canEdit={canEdit} canAssign={canAssign} rows={rows.map((lead) => ({
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
    </div>
  );
}
