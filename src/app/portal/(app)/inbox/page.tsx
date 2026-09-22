import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Archive,
  Bell,
  BellRing,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
} from "lucide-react";
import { Card } from "@/components/portal/ui";
import { NotificationInboxList } from "@/components/portal/NotificationInboxList";
import { getCurrentUser } from "@/lib/auth";
import { listInAppNotifications, type NotificationInboxView } from "@/lib/portal-productivity";

export const dynamic = "force-dynamic";

type InboxSearchParams = Record<string, string | string[] | undefined>;

const VIEWS = new Set<NotificationInboxView>(["active", "unread", "read", "snoozed", "archived"]);
const PRIORITIES = new Set(["normal", "high", "critical", "urgent"] as const);

const dateTime = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

function safeActionUrl(row: {
  actionUrl: string | null;
  entityType: string | null;
  entityId: string | null;
}) {
  if (row.actionUrl?.startsWith("/portal/") && !row.actionUrl.startsWith("//")) return row.actionUrl;
  if (!row.entityId) return null;
  const id = encodeURIComponent(row.entityId);
  if (row.entityType === "lead") return `/portal/leads/${id}`;
  if (row.entityType === "customer") return `/portal/kunden/${id}`;
  if (row.entityType === "order") return `/portal/auftraege/${id}`;
  if (row.entityType === "service_case") return `/portal/service/${id}`;
  if (row.entityType === "task") return `/portal/aufgaben?q=${id}`;
  return null;
}

export default async function InboxPage({ searchParams }: { searchParams: Promise<InboxSearchParams> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Finbox");

  const raw = await searchParams;
  const params = Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  const view = params.view && VIEWS.has(params.view as NotificationInboxView) ? params.view as NotificationInboxView : "active";
  const priority = params.priority && PRIORITIES.has(params.priority as "normal" | "high" | "critical" | "urgent")
    ? params.priority as "normal" | "high" | "critical" | "urgent"
    : undefined;
  const q = params.q?.trim().slice(0, 120) || undefined;
  const requestedPage = Number(params.page ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const result = await listInAppNotifications(user, { view, priority, q, page, pageSize: 25 });

  const current: Record<string, string | undefined> = {
    view: view !== "active" ? view : undefined,
    priority,
    q,
  };
  const link = (changes: Record<string, string | undefined>) => {
    const merged = { ...current, ...changes };
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) if (value) query.set(key, value);
    const suffix = query.toString();
    return `/portal/inbox${suffix ? `?${suffix}` : ""}`;
  };

  const rows = result.rows.map((row) => ({
    id: row.id,
    category: row.category,
    priority: row.priority,
    subject: row.subject || "TarifWerk Hinweis",
    body: row.body,
    status: row.status,
    createdLabel: dateTime.format(row.createdAt),
    snoozedLabel: row.snoozedUntil ? dateTime.format(row.snoozedUntil) : null,
    archived: Boolean(row.archivedAt),
    actionUrl: safeActionUrl(row),
  }));

  const viewTabs: Array<{ key: NotificationInboxView; label: string; count: number }> = [
    { key: "active", label: "Arbeitskorb", count: result.stats.active },
    { key: "unread", label: "Ungelesen", count: result.stats.unread },
    { key: "read", label: "Gelesen", count: Math.max(0, result.stats.active - result.stats.unread) },
    { key: "snoozed", label: "Später", count: result.stats.snoozed },
    { key: "archived", label: "Archiv", count: result.stats.archived },
  ];

  const rangeStart = result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const rangeEnd = Math.min(result.page * result.pageSize, result.total);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-electric-deep">Action Inbox</p>
          <h1 className="mt-2 text-[clamp(1.7rem,3vw,2.5rem)] font-extrabold tracking-tight">Arbeitsmeldungen, die zu Aktionen führen</h1>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-steel">Priorisieren, bündeln, später wieder vorlegen und direkt zum betroffenen CRM-Vorgang springen. Keine Meldung muss im Chat oder im Kopf verloren gehen.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-50 px-3 py-2 text-[11px] font-extrabold text-emerald-800">
          <CheckCheck className="h-4 w-4" aria-hidden="true" /> Persönlicher Arbeitskorb
        </span>
      </header>

      <section aria-label="Inbox Kennzahlen" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link href={link({ view: "unread", page: undefined })}><Card className="h-full transition hover:border-electric/30"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-steel">Ungelesen</p><p className="mt-2 text-3xl font-extrabold text-ink">{result.stats.unread}</p><p className="mt-1 text-[11.5px] text-steel">jetzt sichtbar und offen</p></div><Bell className="h-5 w-5 text-electric-deep" aria-hidden="true" /></div></Card></Link>
        <Link href={link({ priority: "urgent", view: "active", page: undefined })}><Card className="h-full transition hover:border-red-300/60"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-steel">Dringend</p><p className="mt-2 text-3xl font-extrabold text-ink">{result.stats.urgent}</p><p className="mt-1 text-[11.5px] text-steel">hoch oder kritisch</p></div><BellRing className="h-5 w-5 text-red-700" aria-hidden="true" /></div></Card></Link>
        <Link href={link({ view: "snoozed", priority: undefined, page: undefined })}><Card className="h-full transition hover:border-electric/30"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-steel">Später</p><p className="mt-2 text-3xl font-extrabold text-ink">{result.stats.snoozed}</p><p className="mt-1 text-[11.5px] text-steel">automatisch wiedervorgelegt</p></div><Clock3 className="h-5 w-5 text-electric-deep" aria-hidden="true" /></div></Card></Link>
        <Link href={link({ view: "archived", priority: undefined, page: undefined })}><Card className="h-full transition hover:border-electric/30"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-steel">Archiv</p><p className="mt-2 text-3xl font-extrabold text-ink">{result.stats.archived}</p><p className="mt-1 text-[11.5px] text-steel">bewusst aus dem Fokus</p></div><Archive className="h-5 w-5 text-electric-deep" aria-hidden="true" /></div></Card></Link>
      </section>

      <Card>
        <div className="flex flex-wrap gap-2" role="navigation" aria-label="Inbox Ansichten">
          {viewTabs.map((tab) => (
            <Link key={tab.key} href={link({ view: tab.key === "active" ? undefined : tab.key, page: undefined })} className={"inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-[12px] font-extrabold transition " + (view === tab.key ? "border-electric bg-electric text-white" : "border-line bg-white text-ink hover:border-electric/30 hover:text-electric-deep")}>
              {tab.label}<span className={"rounded-full px-2 py-0.5 text-[10px] " + (view === tab.key ? "bg-white/15 text-white" : "bg-paper text-steel")}>{tab.count}</span>
            </Link>
          ))}
        </div>

        <form action="/portal/inbox" method="get" className="mt-4 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_auto]">
          {view !== "active" && <input type="hidden" name="view" value={view} />}
          <label className="space-y-1.5 text-xs font-bold text-ink">
            Suche
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" aria-hidden="true" />
              <input name="q" defaultValue={q ?? ""} maxLength={120} placeholder="Betreff, Inhalt oder Kategorie" className="field h-11 pl-9 font-normal" />
            </div>
          </label>
          <label className="space-y-1.5 text-xs font-bold text-ink">
            Priorität
            <select name="priority" defaultValue={priority ?? ""} className="field h-11 font-normal">
              <option value="">Alle Prioritäten</option>
              <option value="urgent">Hoch + kritisch</option>
              <option value="critical">Kritisch</option>
              <option value="high">Hoch</option>
              <option value="normal">Normal</option>
            </select>
          </label>
          <button type="submit" className="inline-flex min-h-11 self-end items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-extrabold text-white hover:bg-electric-deep"><Search className="h-4 w-4" aria-hidden="true" /> Anwenden</button>
        </form>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 text-[11.5px] font-semibold text-steel">
        <p>{result.total ? `${rangeStart}–${rangeEnd} von ${result.total}` : "Keine Meldungen"} in dieser Ansicht</p>
        {(q || priority) && <Link href={link({ q: undefined, priority: undefined, page: undefined })} className="font-extrabold text-electric-deep hover:underline">Filter zurücksetzen</Link>}
      </div>

      <NotificationInboxList rows={rows} unreadCount={result.stats.unread} view={view} />

      {result.totalPages > 1 && (
        <nav aria-label="Inbox Seitennavigation" className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3">
          <Link aria-disabled={result.page <= 1} href={result.page > 1 ? link({ page: String(result.page - 1) }) : link({ page: "1" })} className={"inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-3 text-[12px] font-bold " + (result.page <= 1 ? "pointer-events-none opacity-40" : "hover:border-electric/30 hover:text-electric-deep")}><ChevronLeft className="h-4 w-4" aria-hidden="true" /> Zurück</Link>
          <span className="text-[12px] font-extrabold text-ink">Seite {result.page} von {result.totalPages}</span>
          <Link aria-disabled={result.page >= result.totalPages} href={result.page < result.totalPages ? link({ page: String(result.page + 1) }) : link({ page: String(result.totalPages) })} className={"inline-flex min-h-10 items-center gap-2 rounded-xl border border-line px-3 text-[12px] font-bold " + (result.page >= result.totalPages ? "pointer-events-none opacity-40" : "hover:border-electric/30 hover:text-electric-deep")}>Weiter <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
        </nav>
      )}
    </div>
  );
}
