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

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Faufgaben");
  const { status } = await searchParams;
  const selected = ["open","in_progress","completed","cancelled","all"].includes(status ?? "") ? status! : "open";
  const [rows, assignees] = await Promise.all([
    listTasks(user, selected),
    user.role === "admin"
      ? db.select({ id: employees.id, name: employees.name }).from(employees).where(eq(employees.active, true)).orderBy(employees.name)
      : Promise.resolve([{ id: user.id, name: user.name }]),
  ]);

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow text-electric-deep">Arbeitssteuerung</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Aufgaben & Wiedervorlagen</h1><p className="text-[14px] text-steel">{rows.length} Aufgaben</p></div><details className="group relative"><summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white hover:bg-electric"><Plus className="h-4 w-4" /> Aufgabe anlegen</summary><div className="absolute right-0 z-20 mt-2 w-[min(92vw,420px)] rounded-[22px] border border-line bg-white p-5 shadow-soft"><QuickTaskComposer assignees={assignees} currentUserId={user.id} /></div></details></header>
    <div className="no-scrollbar flex gap-2 overflow-x-auto">{["open","in_progress","completed","all"].map((value) => <Link key={value} href={`/portal/aufgaben?status=${value}`} className={`chip h-9 shrink-0 px-3.5 ${selected===value?"border-ink bg-ink text-white":"border-line bg-white"}`}>{({open:"Offen",in_progress:"In Arbeit",completed:"Erledigt",all:"Alle"} as Record<string,string>)[value]}</Link>)}</div>
    <Card className="p-0 sm:p-0">{rows.length === 0 ? <p className="p-10 text-center text-[14.5px] text-steel">Keine Aufgaben in dieser Ansicht.</p> :
      <TaskBulkList rows={rows.map(({ task, assigneeName, overdue }) => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        status: task.status,
        dueAt: task.dueAt?.toISOString() ?? null,
        entityType: task.entityType,
        entityId: task.entityId,
        assigneeName,
        overdue,
      }))} />}
    </Card>
  </div>;
}
