import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Clock3, Headphones, Plus, Search, ShieldAlert, UserRoundX } from "lucide-react";
import { Card } from "@/components/portal/ui";
import { SavedViewsBar } from "@/components/portal/SavedViewsBar";
import { getCurrentUser } from "@/lib/auth";
import { listServiceAssignableEmployees, permissionSnapshot, PORTAL_PERMISSION } from "@/lib/enterprise-access";
import { listSavedViews } from "@/lib/portal-productivity";
import {
  getServiceCaseSummary,
  listServiceCases,
  SERVICE_CASE_PRIORITY_LABELS,
  SERVICE_CASE_STATUS_LABELS,
  SERVICE_CASE_TYPE_LABELS,
  type ServiceCasePriority,
  type ServiceCaseStatus,
  type ServiceCaseType,
} from "@/lib/service-cases";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
const ACTIVE = new Set(["active", "all", ...Object.keys(SERVICE_CASE_STATUS_LABELS)]);
const FOCUS = new Set(["overdue", "today", "critical", "waiting_provider", "unassigned"]);

const dateTime = new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" });

export default async function ServiceCasesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Fservice");

  const capabilities = await permissionSnapshot(user, [
    PORTAL_PERMISSION.SERVICE_READ,
    PORTAL_PERMISSION.SERVICE_EDIT,
    PORTAL_PERMISSION.SERVICE_ASSIGN,
  ] as const);
  const canEdit = capabilities[PORTAL_PERMISSION.SERVICE_EDIT] || user.role === "admin";
  const canAssign = capabilities[PORTAL_PERMISSION.SERVICE_ASSIGN] || user.role === "admin";
  if (!capabilities[PORTAL_PERMISSION.SERVICE_READ] && !canEdit && !canAssign) redirect("/portal");

  const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  const status = params.status && ACTIVE.has(params.status)
    ? params.status as ServiceCaseStatus | "active" | "all"
    : "active";
  const priority = params.priority && params.priority in SERVICE_CASE_PRIORITY_LABELS ? params.priority as ServiceCasePriority : undefined;
  const type = params.type && params.type in SERVICE_CASE_TYPE_LABELS ? params.type as ServiceCaseType : undefined;
  const focus = params.focus && FOCUS.has(params.focus) ? params.focus as "overdue" | "today" | "critical" | "waiting_provider" | "unassigned" : undefined;
  const q = params.q?.trim().slice(0, 160) || undefined;
  const rawOwner = Number(params.owner);
  const ownerId = canAssign && Number.isSafeInteger(rawOwner) && rawOwner > 0 ? rawOwner : undefined;
  const rawPage = Number(params.page ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const [result, summary, assignees, savedViews] = await Promise.all([
    listServiceCases(user, { status, priority, type, focus, ownerId, q, page, pageSize: 40 }, canAssign),
    getServiceCaseSummary(user, canAssign),
    canAssign ? listServiceAssignableEmployees() : Promise.resolve([]),
    listSavedViews(user, "service"),
  ]);

  const current: Record<string, string | undefined> = {
    status: status !== "active" ? status : undefined,
    priority,
    type,
    focus,
    owner: ownerId ? String(ownerId) : undefined,
    q,
  };
  function href(changes: Record<string, string | undefined>) {
    const merged = { ...current, ...changes };
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) if (value) query.set(key, value);
    const suffix = query.toString();
    return `/portal/service${suffix ? `?${suffix}` : ""}`;
  }
  const savedFilters = Object.fromEntries(Object.entries(current).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const activeStatuses = new Set(["open", "in_progress", "waiting_customer", "waiting_provider"]);
  const rangeStart = result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const rangeEnd = Math.min(result.page * result.pageSize, result.total);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-electric-deep">Service Operations</p>
          <h1 className="mt-2 text-[clamp(1.7rem,3vw,2.5rem)] font-extrabold tracking-tight">Servicefälle & Reklamationen</h1>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-steel">Kundenprobleme, Providerfälle und Retention sauber als eigenen Prozess steuern – mit SLA, Zuständigkeit, Historie und verknüpfter Aufgabe.</p>
        </div>
        {canEdit && <Link href="/portal/service/neu" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-electric px-4 text-[13px] font-extrabold text-white hover:bg-electric-deep"><Plus className="h-4 w-4" aria-hidden="true" /> Servicefall anlegen</Link>}
      </header>

      <section aria-label="Service Kennzahlen" className={"grid gap-3 sm:grid-cols-2 " + (canAssign ? "xl:grid-cols-5" : "xl:grid-cols-4")}>
        <Link href={href({ status: undefined, focus: undefined, page: undefined })}><Card className="h-full transition hover:border-electric/30"><p className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-steel">Aktiv</p><p className="mt-2 text-3xl font-extrabold">{summary.active}</p><p className="mt-1 text-[11.5px] text-steel">offene Arbeitsfälle</p></Card></Link>
        <Link href={href({ focus: "overdue", status: undefined, page: undefined })}><Card className="h-full transition hover:border-red-300/60"><div className="flex justify-between gap-3"><div><p className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-steel">SLA überfällig</p><p className="mt-2 text-3xl font-extrabold">{summary.overdue}</p></div><AlertTriangle className="h-5 w-5 text-red-700" /></div></Card></Link>
        <Link href={href({ focus: "critical", status: undefined, page: undefined })}><Card className="h-full transition hover:border-red-300/60"><div className="flex justify-between gap-3"><div><p className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-steel">Kritisch</p><p className="mt-2 text-3xl font-extrabold">{summary.critical}</p></div><ShieldAlert className="h-5 w-5 text-red-700" /></div></Card></Link>
        <Link href={href({ focus: "waiting_provider", status: undefined, page: undefined })}><Card className="h-full transition hover:border-electric/30"><div className="flex justify-between gap-3"><div><p className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-steel">Provider offen</p><p className="mt-2 text-3xl font-extrabold">{summary.waitingProvider}</p></div><Clock3 className="h-5 w-5 text-electric-deep" /></div></Card></Link>
        {canAssign && <Link href={href({ focus: "unassigned", status: undefined, page: undefined })}><Card className="h-full transition hover:border-amber-300/60"><div className="flex justify-between gap-3"><div><p className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-steel">Ohne Owner</p><p className="mt-2 text-3xl font-extrabold">{summary.unassigned}</p></div><UserRoundX className="h-5 w-5 text-amber-700" /></div></Card></Link>}
      </section>

      <Card>
        <nav className="flex flex-wrap gap-2" aria-label="Servicefall Status">
          {[
            ["active", "Aktiv"],
            ["open", "Offen"],
            ["in_progress", "In Bearbeitung"],
            ["waiting_customer", "Wartet Kunde"],
            ["waiting_provider", "Wartet Provider"],
            ["resolved", "Gelöst"],
            ["closed", "Geschlossen"],
            ["all", "Alle"],
          ].map(([value, label]) => (
            <Link key={value} href={href({ status: value === "active" ? undefined : value, focus: undefined, page: undefined })} className={"chip h-9 px-3.5 " + (status === value ? "border-ink bg-ink text-white" : "border-line bg-white")}>{label}</Link>
          ))}
        </nav>

        <form className={"mt-4 grid gap-2 " + (canAssign ? "lg:grid-cols-[minmax(220px,1.5fr)_repeat(3,minmax(145px,0.7fr))_auto]" : "lg:grid-cols-[minmax(220px,1.5fr)_repeat(2,minmax(145px,0.7fr))_auto]")} method="get">
          {status !== "active" && <input type="hidden" name="status" value={status} />}
          {focus && <input type="hidden" name="focus" value={focus} />}
          <label className="relative"><span className="sr-only">Servicefälle durchsuchen</span><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" /><input name="q" defaultValue={q ?? ""} maxLength={160} className="field h-11 pl-10" placeholder="Fallnr., Kunde, Betreff, Auftrag …" /></label>
          <label><span className="sr-only">Priorität</span><select name="priority" defaultValue={priority ?? ""} className="field h-11"><option value="">Alle Prioritäten</option>{Object.entries(SERVICE_CASE_PRIORITY_LABELS).reverse().map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span className="sr-only">Fallart</span><select name="type" defaultValue={type ?? ""} className="field h-11"><option value="">Alle Fallarten</option>{Object.entries(SERVICE_CASE_TYPE_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {canAssign && <label><span className="sr-only">Zuständigkeit</span><select name="owner" defaultValue={ownerId ? String(ownerId) : ""} className="field h-11"><option value="">Alle Zuständigen</option>{assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>}
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-[12px] font-extrabold text-white hover:bg-electric-deep"><Search className="h-4 w-4" /> Anwenden</button>
        </form>
      </Card>

      <SavedViewsBar area="service" basePath="/portal/service" views={savedViews} currentFilters={savedFilters} />

      <div className="flex flex-wrap items-center justify-between gap-3 text-[11.5px] font-semibold text-steel">
        <p>{result.total ? `${rangeStart}–${rangeEnd} von ${result.total}` : "Keine Servicefälle"} in dieser Ansicht</p>
        {(priority || type || focus || ownerId || q) && <Link href={href({ priority: undefined, type: undefined, focus: undefined, owner: undefined, q: undefined, page: undefined })} className="font-extrabold text-electric-deep hover:underline">Filter zurücksetzen</Link>}
      </div>

      {result.rows.length === 0 ? (
        <div className="grid min-h-72 place-items-center rounded-3xl border border-line bg-white px-6 text-center"><div><Headphones className="mx-auto h-9 w-9 text-electric-deep" /><p className="mt-3 text-[15px] font-extrabold">Keine Fälle in dieser Ansicht.</p><p className="mt-1 max-w-md text-[12.5px] text-steel">Filter ändern oder einen neuen Servicefall aus der Kundenakte heraus anlegen.</p></div></div>
      ) : (
        <div className="space-y-3">
          {result.rows.map(({ serviceCase: item, customerNumber, customerName, orderExternalId, ownerName }) => {
            const overdue = activeStatuses.has(item.status) && item.dueAt.getTime() < Date.now();
            return <Link key={item.id} href={`/portal/service/${item.id}`} className={"block rounded-[22px] border bg-white p-4 transition hover:-translate-y-0.5 hover:border-electric/30 hover:shadow-soft sm:p-5 " + (overdue ? "border-red-200/80" : item.priority === "critical" ? "border-amber-200/80" : "border-line")}>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_170px_170px] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-extrabold text-white">{item.caseNumber}</span><span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[10px] font-bold text-steel">{SERVICE_CASE_TYPE_LABELS[item.type as ServiceCaseType] ?? item.type}</span><span className={"rounded-full px-2.5 py-1 text-[10px] font-extrabold " + (item.priority === "critical" ? "bg-red-100 text-red-800" : item.priority === "high" ? "bg-amber-100 text-amber-800" : "bg-paper text-steel")}>{SERVICE_CASE_PRIORITY_LABELS[item.priority as ServiceCasePriority] ?? item.priority}</span></div>
                  <h2 className="mt-2 truncate text-[15px] font-extrabold">{item.subject}</h2>
                  <p className="mt-1 truncate text-[12px] text-steel">{customerNumber} · {customerName}{orderExternalId ? ` · Auftrag ${orderExternalId}` : ""}</p>
                </div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-steel">Status</p><p className="mt-1 text-[12.5px] font-extrabold">{SERVICE_CASE_STATUS_LABELS[item.status as ServiceCaseStatus] ?? item.status}</p><p className="mt-1 text-[11px] text-steel">{ownerName || "Nicht zugewiesen"}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-steel">SLA</p><p className={"mt-1 text-[12.5px] font-extrabold " + (overdue ? "text-red-700" : "text-ink")}>{dateTime.format(item.dueAt)}</p><p className="mt-1 text-[11px] text-steel">{overdue ? "Überfällig" : "Fälligkeit"}</p></div>
              </div>
            </Link>;
          })}
        </div>
      )}

      {result.totalPages > 1 && <nav aria-label="Servicefall Seiten" className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3">
        <Link aria-disabled={result.page <= 1} href={result.page > 1 ? href({ page: String(result.page - 1) }) : href({ page: "1" })} className={"text-[12px] font-extrabold " + (result.page <= 1 ? "pointer-events-none opacity-40" : "text-electric-deep")}>← Zurück</Link>
        <span className="text-[12px] font-bold">Seite {result.page} von {result.totalPages}</span>
        <Link aria-disabled={result.page >= result.totalPages} href={result.page < result.totalPages ? href({ page: String(result.page + 1) }) : href({ page: String(result.totalPages) })} className={"text-[12px] font-extrabold " + (result.page >= result.totalPages ? "pointer-events-none opacity-40" : "text-electric-deep")}>Weiter →</Link>
      </nav>}
    </div>
  );
}
