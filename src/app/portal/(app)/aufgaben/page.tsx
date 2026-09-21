import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Card } from "@/components/portal/ui";
import { TaskBulkList } from "@/components/portal/TaskBulkList";
import { QuickTaskComposer } from "@/components/portal/QuickTaskComposer";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { listTasks } from "@/lib/enterprise";
import { hasPermission, PORTAL_PERMISSION } from "@/lib/enterprise-access";

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Faufgaben");
  if (!await hasPermission(user, PORTAL_PERMISSION.TASK_MANAGE)) redirect("/portal");
  const { status, page: rawPage } = await searchParams;
  const selected = ["open","in_progress","completed","cancelled","all"].includes(status ?? "") ? status! : "open";
  const parsedPage = rawPage ? Number(rawPage) : 1;
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 100000) : 1;
  const pageSize = 50;
  const [queriedRows, assignees] = await Promise.all([
    listTasks(user, selected, { page, pageSize, lookahead: true }),
    user.role === "admin"
      ? db.select({ id: employees.id, name: employees.name }).from(employees).where(eq(employees.active, true)).orderBy(employees.name)
      : Promise.resolve([{ id: user.id, name: user.name }]),
  ]);
  const rows = queriedRows.slice(0, pageSize);
  const hasNextPage = queriedRows.length > pageSize;
  const hasPreviousPage = page > 1;
  const rangeStart = rows.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = rows.length ? rangeStart + rows.length - 1 : 0;
  const pageHref = (nextPage: number) => `/portal/aufgaben?status=${encodeURIComponent(selected)}${nextPage > 1 ? `&page=${nextPage}` : ""}`;

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow text-electric-deep">Arbeitssteuerung</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Aufgaben & Wiedervorlagen</h1><p className="text-[14px] text-steel">{rows.length ? `Aufgaben ${rangeStart}–${rangeEnd}` : "Keine Aufgaben in dieser Ansicht"}</p></div><details className="group relative"><summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white hover:bg-electric"><Plus className="h-4 w-4" /> Aufgabe anlegen</summary><div className="absolute right-0 z-20 mt-2 w-[min(92vw,420px)] rounded-[22px] border border-line bg-white p-5 shadow-soft"><QuickTaskComposer assignees={assignees} currentUserId={user.id} /></div></details></header>
    <div className="no-scrollbar flex gap-2 overflow-x-auto">{["open","in_progress","completed","all"].map((value) => <Link key={value} href={`/portal/aufgaben?status=${value}`} className={`chip h-9 shrink-0 px-3.5 ${selected===value?"border-ink bg-ink text-white":"border-line bg-white"}`}>{({open:"Offen",in_progress:"In Arbeit",completed:"Erledigt",all:"Alle"} as Record<string,string>)[value]}</Link>)}</div>
    <Card className="p-0 sm:p-0">{rows.length === 0 ? <p className="p-10 text-center text-[14.5px] text-steel">Keine Aufgaben in dieser Ansicht.</p> :
      <TaskBulkList rows={rows.map(({ task, assigneeName, overdue, entityTitle, entitySubtitle }) => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        status: task.status,
        dueAt: task.dueAt?.toISOString() ?? null,
        entityType: task.entityType,
        entityId: task.entityId,
        assigneeName,
        overdue,
        entityTitle,
        entitySubtitle,
      }))} />}
    </Card>
    {(hasPreviousPage || hasNextPage || rows.length > 0) && <nav className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-[0_12px_30px_-28px_rgba(6,11,22,0.45)]" aria-label="Aufgaben-Seiten">
      <p className="text-[11.5px] font-semibold text-steel">{rows.length ? `Aufgaben ${rangeStart}–${rangeEnd}` : "Keine Aufgaben auf dieser Seite"}</p>
      <div className="flex items-center gap-2">
        {hasPreviousPage ? <Link href={pageHref(page - 1)} className="inline-flex h-9 items-center rounded-xl border border-line bg-white px-3 text-[11.5px] font-bold text-ink hover:border-electric/30">Zurück</Link> : <span className="inline-flex h-9 items-center rounded-xl border border-line/60 px-3 text-[11.5px] font-bold text-steel/45">Zurück</span>}
        <span className="min-w-20 text-center text-[11.5px] font-extrabold text-ink">Seite {page}</span>
        {hasNextPage ? <Link href={pageHref(page + 1)} className="inline-flex h-9 items-center rounded-xl bg-electric px-3 text-[11.5px] font-extrabold text-white hover:bg-electric-deep">Weiter</Link> : <span className="inline-flex h-9 items-center rounded-xl border border-line/60 px-3 text-[11.5px] font-bold text-steel/45">Weiter</span>}
      </div>
    </nav>}
  </div>;
}
