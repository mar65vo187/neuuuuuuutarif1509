import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Card, formatDate } from "@/components/portal/ui";
import { TaskActions } from "@/components/portal/TaskActions";
import { getCurrentUser } from "@/lib/auth";
import { listTasks } from "@/lib/enterprise";

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Faufgaben");
  const { status } = await searchParams;
  const selected = ["open","in_progress","completed","cancelled","all"].includes(status ?? "") ? status! : "open";
  const rows = await listTasks(user, selected);

  return <div className="space-y-6">
    <header><p className="eyebrow text-electric-deep">Operations</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Aufgaben & Wiedervorlagen</h1><p className="text-[14px] text-steel">{rows.length} Aufgaben</p></header>
    <div className="no-scrollbar flex gap-2 overflow-x-auto">{["open","in_progress","completed","all"].map((value) => <Link key={value} href={`/portal/aufgaben?status=${value}`} className={`chip h-9 shrink-0 px-3.5 ${selected===value?"border-ink bg-ink text-white":"border-line bg-white"}`}>{({open:"Offen",in_progress:"In Arbeit",completed:"Erledigt",all:"Alle"} as Record<string,string>)[value]}</Link>)}</div>
    <Card className="p-0 sm:p-0">{rows.length === 0 ? <p className="p-10 text-center text-[14.5px] text-steel">Keine Aufgaben in dieser Ansicht.</p> :
      <ul className="divide-y divide-line">{rows.map(({ task, assigneeName, overdue }) => {
        const href = task.entityType === "order" ? `/portal/auftraege/${task.entityId}` : task.entityType === "customer" ? `/portal/kunden/${task.entityId}` : `/portal/leads/${task.entityId}`;
        return <li key={task.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"><div>
          <div className="flex flex-wrap items-center gap-2"><Link href={href} className="font-bold hover:underline">{task.title}</Link>{overdue && <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-red-700"><AlertTriangle className="h-3.5 w-3.5" /> überfällig</span>}<span className="chip border-line bg-white">{task.priority}</span></div>
          <p className="mt-0.5 text-[12.5px] text-steel">{task.entityType} #{task.entityId} · fällig {formatDate(task.dueAt)} · {assigneeName || "nicht zugewiesen"}</p>
          {task.description && <p className="mt-1 text-[13px]">{task.description}</p>}
        </div><TaskActions id={task.id} status={task.status} /></li>;
      })}</ul>}
    </Card>
  </div>;
}
