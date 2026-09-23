import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Card } from "@/components/portal/ui";
import { TaskBulkList } from "@/components/portal/TaskBulkList";
import { QuickTaskComposer } from "@/components/portal/QuickTaskComposer";
import { SavedViewsBar } from "@/components/portal/SavedViewsBar";
import { getCurrentUser } from "@/lib/auth";
import { listTasks } from "@/lib/enterprise";
import { hasPermission, listTaskAssignableEmployees, PORTAL_PERMISSION } from "@/lib/enterprise-access";
import { listSavedViews } from "@/lib/portal-productivity";

export const dynamic = "force-dynamic";

type TaskPriority = "low" | "normal" | "high" | "critical";
type DueFilter = "overdue" | "today" | "upcoming" | "no_due";
type EntityFilter = "general" | "lead" | "customer" | "order" | "service_case";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string | string[];
    page?: string | string[];
    q?: string | string[];
    priority?: string | string[];
    due?: string | string[];
    assignee?: string | string[];
    entity?: string | string[];
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Faufgaben");
  if (!await hasPermission(user, PORTAL_PERMISSION.TASK_MANAGE)) redirect("/portal");

  const params = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const status = first(params.status);
  const rawPage = first(params.page);
  const rawSearch = first(params.q);
  const rawPriority = first(params.priority);
  const rawDue = first(params.due);
  const rawAssignee = first(params.assignee);
  const rawEntity = first(params.entity);

  const selected = ["active", "open", "in_progress", "completed", "cancelled", "all"].includes(status ?? "") ? status! : "active";
  const priority = ["low", "normal", "high", "critical"].includes(rawPriority ?? "") ? rawPriority as TaskPriority : undefined;
  const due = ["overdue", "today", "upcoming", "no_due"].includes(rawDue ?? "") ? rawDue as DueFilter : undefined;
  const entityType = ["general", "lead", "customer", "order", "service_case"].includes(rawEntity ?? "") ? rawEntity as EntityFilter : undefined;
  const q = rawSearch?.trim().slice(0, 200) || undefined;
  const parsedAssignee = rawAssignee ? Number(rawAssignee) : NaN;
  const assigneeId = user.role === "admin" && Number.isSafeInteger(parsedAssignee) && parsedAssignee > 0 ? parsedAssignee : undefined;
  const parsedPage = rawPage ? Number(rawPage) : 1;
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 100000) : 1;
  const pageSize = 50;

  const [queriedRows, assignees, savedViews] = await Promise.all([
    listTasks(user, selected, {
      page,
      pageSize,
      lookahead: true,
      priority,
      due,
      assigneeId,
      entityType,
      search: q,
    }),
    user.role === "admin"
      ? listTaskAssignableEmployees()
      : Promise.resolve([{ id: user.id, name: user.name }]),
    listSavedViews(user, "tasks"),
  ]);

  const rows = queriedRows.slice(0, pageSize);
  const hasNextPage = queriedRows.length > pageSize;
  const hasPreviousPage = page > 1;
  const rangeStart = rows.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = rows.length ? rangeStart + rows.length - 1 : 0;

  const currentFilters: Record<string, string> = {
    status: selected,
    ...(priority ? { priority } : {}),
    ...(due ? { due } : {}),
    ...(entityType ? { entity: entityType } : {}),
    ...(assigneeId ? { assignee: String(assigneeId) } : {}),
    ...(q ? { q } : {}),
  };

  function href(changes: Record<string, string | undefined>) {
    const merged: Record<string, string | undefined> = { ...currentFilters, ...changes };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (!value) continue;
      if (key === "page" && value === "1") continue;
      params.set(key, value);
    }
    const query = params.toString();
    return `/portal/aufgaben${query ? `?${query}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-electric-deep">Arbeitssteuerung · Workqueue</p>
          <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Aufgaben & Wiedervorlagen</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-steel">
            {rows.length ? `Aufgaben ${rangeStart}–${rangeEnd}` : "Keine Aufgaben in dieser Ansicht"} · Prioritäten, Fälligkeiten, Zuständigkeiten und Vorgangsbezug in einer Arbeitsliste.
          </p>
        </div>
        <details className="group relative">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white hover:bg-electric">
            <Plus className="h-4 w-4" /> Aufgabe anlegen
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-[min(92vw,420px)] rounded-[22px] border border-line bg-white p-5 shadow-soft">
            <QuickTaskComposer assignees={assignees} currentUserId={user.id} />
          </div>
        </details>
      </header>

      <nav className="no-scrollbar flex gap-2 overflow-x-auto" aria-label="Aufgabenstatus">
        {["active", "open", "in_progress", "completed", "cancelled", "all"].map((value) => (
          <Link
            key={value}
            href={href({ status: value, page: undefined })}
            aria-current={selected === value ? "page" : undefined}
            className={`chip min-h-11 shrink-0 px-3.5 ${selected === value ? "border-ink bg-ink text-white" : "border-line bg-white"}`}
          >
            {({ active: "Aktiv", open: "Offen", in_progress: "In Arbeit", completed: "Erledigt", cancelled: "Abgebrochen", all: "Alle" } as Record<string, string>)[value]}
          </Link>
        ))}
      </nav>

      <form key={href({})} className="grid gap-2 rounded-[18px] border border-line bg-white p-3 lg:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(130px,0.7fr))_auto]" method="get">
        <input type="hidden" name="status" value={selected} />
        <label className="relative">
          <span className="sr-only">Aufgaben durchsuchen</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
          <input name="q" defaultValue={q ?? ""} maxLength={200} className="field h-11 pl-10" placeholder="Titel oder Beschreibung suchen …" />
        </label>
        <label>
          <span className="sr-only">Priorität</span>
          <select name="priority" defaultValue={priority ?? ""} className="field h-11">
            <option value="">Alle Prioritäten</option>
            <option value="critical">Kritisch</option>
            <option value="high">Hoch</option>
            <option value="normal">Normal</option>
            <option value="low">Niedrig</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Fälligkeit</span>
          <select name="due" defaultValue={due ?? ""} className="field h-11">
            <option value="">Alle Fälligkeiten</option>
            <option value="overdue">Überfällig</option>
            <option value="today">Heute · Berlin</option>
            <option value="upcoming">Ab morgen</option>
            <option value="no_due">Ohne Termin</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Vorgangsbezug</span>
          <select name="entity" defaultValue={entityType ?? ""} className="field h-11">
            <option value="">Alle Bezüge</option>
            <option value="general">Allgemein</option>
            <option value="lead">Lead</option>
            <option value="customer">Kunde</option>
            <option value="order">Auftrag</option>
            <option value="service_case">Servicefall</option>
          </select>
        </label>
        {user.role === "admin" ? (
          <label>
            <span className="sr-only">Zuständigkeit</span>
            <select name="assignee" defaultValue={assigneeId ? String(assigneeId) : ""} className="field h-11">
              <option value="">Alle Mitarbeiter</option>
              {assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </label>
        ) : <span className="hidden lg:block" aria-hidden="true" />}
        <div className="flex gap-2">
          <button className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-ink px-4 text-[12px] font-bold text-white hover:bg-electric lg:flex-none">Filtern</button>
          <Link href={`/portal/aufgaben?status=${encodeURIComponent(selected)}`} className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-white px-3 text-[12px] font-bold text-steel hover:border-electric/30 hover:text-electric-deep">Reset</Link>
        </div>
      </form>

      <SavedViewsBar area="tasks" basePath="/portal/aufgaben" views={savedViews} currentFilters={currentFilters} />

      <Card className="p-0 sm:p-0">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-[14.5px] text-steel">Keine Aufgaben in dieser Ansicht.</p>
        ) : (
          <TaskBulkList
            key={href({ page: String(page) })}
            assignees={user.role === "admin" ? assignees : []}
            rows={rows.map(({ task, assigneeName, overdue, entityTitle, entitySubtitle, entityHref }) => ({
              id: task.id,
              title: task.title,
              description: task.description,
              priority: task.priority,
              status: task.status,
              dueAt: task.dueAt?.toISOString() ?? null,
              entityType: task.entityType,
              entityId: task.entityId,
              assigneeName,
              overdue,
              entityTitle,
              entitySubtitle,
              entityHref,
            }))}
          />
        )}
      </Card>

      {(hasPreviousPage || hasNextPage || rows.length > 0) && (
        <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-[0_12px_30px_-28px_rgba(6,11,22,0.45)]" aria-label="Aufgaben-Seiten">
          <p className="text-[11.5px] font-semibold text-steel">{rows.length ? `Aufgaben ${rangeStart}–${rangeEnd}` : "Keine Aufgaben auf dieser Seite"}</p>
          <div className="flex items-center gap-2">
            {hasPreviousPage ? <Link href={href({ page: String(page - 1) })} className="inline-flex min-h-11 items-center rounded-xl border border-line bg-white px-3 text-[11.5px] font-bold text-ink hover:border-electric/30">Zurück</Link> : <span className="inline-flex min-h-11 items-center rounded-xl border border-line/60 px-3 text-[11.5px] font-bold text-steel/45">Zurück</span>}
            <span className="min-w-20 text-center text-[11.5px] font-extrabold text-ink">Seite {page}</span>
            {hasNextPage ? <Link href={href({ page: String(page + 1) })} className="inline-flex min-h-11 items-center rounded-xl bg-electric px-3 text-[11.5px] font-extrabold text-white hover:bg-electric-deep">Weiter</Link> : <span className="inline-flex min-h-11 items-center rounded-xl border border-line/60 px-3 text-[11.5px] font-bold text-steel/45">Weiter</span>}
          </div>
        </nav>
      )}
    </div>
  );
}
