import { redirect } from "next/navigation";
import { AlertTriangle, Clock3, Euro, FileCheck2, RotateCcw, ListTodo } from "lucide-react";
import { Card } from "@/components/portal/ui";
import { getCurrentUser } from "@/lib/auth";
import { getEnterpriseReport } from "@/lib/enterprise";

export const dynamic = "force-dynamic";

export default async function ReportingPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Freporting");
  const { days: raw } = await searchParams;
  const days = [7,30,90,365].includes(Number(raw)) ? Number(raw) : 30;
  const report = await getEnterpriseReport(user, days);
  const cards = [
    ["Aufträge", String(report.totalOrders), FileCheck2],
    ["Aktiv", String(report.activeOrders), FileCheck2],
    ["Stornoquote", `${report.cancellationRate}%`, RotateCcw],
    ["Erwartete Provision", report.expectedCommission.toLocaleString("de-DE",{style:"currency",currency:"EUR"}), Euro],
    ["Ø Sales Cycle", `${report.averageCycleHours} h`, Clock3],
    ["Überfällige Tasks", String(report.overdueTasks), AlertTriangle],
  ] as const;

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow text-electric-deep">Management</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Enterprise Reporting</h1></div>
      <form className="flex items-end gap-2">
        <label className="label">Zeitraum
          <select name="days" defaultValue={String(days)} className="field mt-1">
            <option value="7">7 Tage</option>
            <option value="30">30 Tage</option>
            <option value="90">90 Tage</option>
            <option value="365">365 Tage</option>
          </select>
        </label>
        <button type="submit" className="inline-flex h-12 items-center justify-center rounded-xl bg-ink px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-electric focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric">Anwenden</button>
      </form>
    </header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label,value,Icon]) => <Card key={label}><div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-steel">{label}</p><Icon className="h-4.5 w-4.5 text-electric-deep" /></div><p className="mt-3 text-[30px] font-extrabold tracking-tight">{value}</p></Card>)}</div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><h2 className="text-[16px] font-extrabold">Aufträge nach Status</h2><ul className="mt-4 space-y-3">{report.byStatus.map((row) => <li key={row.status} className="flex items-center justify-between text-[14px]"><span>{row.status}</span><span className="font-bold">{row.count}</span></li>)}</ul></Card>
      <Card><h2 className="text-[16px] font-extrabold">Provider-Performance</h2><ul className="mt-4 space-y-3">{report.byProvider.map((row) => <li key={row.provider} className="flex items-center justify-between gap-3 text-[14px]"><span className="truncate">{row.provider}</span><span className="font-bold">{row.count} · {Number(row.expected).toLocaleString("de-DE",{style:"currency",currency:"EUR"})}</span></li>)}</ul></Card>
    </div>
    <Card><div className="flex items-center gap-2"><ListTodo className="h-4 w-4 text-electric-deep" /><h2 className="text-[16px] font-extrabold">Operations</h2></div><p className="mt-3 text-[14px] text-steel">{report.openTasks} offene Aufgaben · {report.overdueTasks} davon überfällig</p></Card>
  </div>;
}
