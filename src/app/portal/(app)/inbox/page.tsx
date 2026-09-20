import { Bell, CheckCircle2, Circle } from "lucide-react";
import { redirect } from "next/navigation";
import { Card, formatDate } from "@/components/portal/ui";
import { NotificationActions } from "@/components/portal/NotificationActions";
import { getCurrentUser } from "@/lib/auth";
import { listInAppNotifications } from "@/lib/portal-productivity";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Finbox");

  const rows = await listInAppNotifications(user, 150);
  const unread = rows.filter((row) => row.status === "pending");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-electric-deep">Arbeits-Inbox</p>
          <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Benachrichtigungen</h1>
          <p className="mt-1 text-[14px] text-steel">{unread.length} ungelesen · {rows.length} in dieser Ansicht</p>
        </div>
        <NotificationActions unreadIds={unread.map((row) => row.id)} />
      </header>

      <Card className="p-0 sm:p-0">
        {rows.length === 0 ? (
          <div className="grid min-h-64 place-items-center px-6 text-center">
            <div><Bell className="mx-auto h-8 w-8 text-electric-deep" /><p className="mt-3 font-bold">Deine Inbox ist leer.</p><p className="mt-1 max-w-md text-[12.5px] text-steel">Automationen können hier persönliche Hinweise ablegen, ohne dass operative Informationen in Chats verloren gehen.</p></div>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => {
              const unreadRow = row.status === "pending";
              return (
                <li key={row.id} className={"grid gap-3 px-5 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-start sm:px-6 " + (unreadRow ? "bg-electric/[0.035]" : "")}>
                  <span className={"mt-0.5 grid h-8 w-8 place-items-center rounded-xl " + (unreadRow ? "bg-electric text-white" : "bg-paper text-steel")}>
                    {unreadRow ? <Circle className="h-3.5 w-3.5 fill-current" /> : <CheckCircle2 className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold">{row.subject || "TarifWerk Hinweis"}</p>
                    <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-steel">{row.body}</p>
                  </div>
                  <div className="text-[11px] text-steel sm:text-right"><p>{formatDate(row.createdAt)}</p><p className="mt-1 font-semibold">{unreadRow ? "Neu" : "Gelesen"}</p></div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
