import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle, ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, ContactRound,
  Euro, Flame, Inbox, ListTodo, Plus, Sparkles, Target, TrendingUp, Trophy, UsersRound,
} from "lucide-react";
import { BarSeries } from "@/components/portal/Charts";
import { QuickTaskComposer } from "@/components/portal/QuickTaskComposer";
import { Card } from "@/components/portal/ui";
import { getCurrentUser } from "@/lib/auth";
import { LEAD_STATUS_LABELS } from "@/lib/content";
import { getCommandCenterData, type FocusItem } from "@/lib/portal-command-center";

export const dynamic = "force-dynamic";

const ORDER_LABELS: Record<string, string> = {
  draft: "Entwurf",
  documents_missing: "Unterlagen fehlen",
  ready_to_submit: "Versandbereit",
  submitted: "Eingereicht",
  provider_review: "Provider-Prüfung",
  accepted: "Angenommen",
  activation_pending: "Aktivierung offen",
  active: "Aktiv",
  rejected: "Abgelehnt",
  cancelled: "Storniert",
  storno: "Rückbelastung",
};

const PRIORITY_STYLE: Record<FocusItem["priority"], string> = {
  critical: "border-red-200 bg-red-50 text-red-800",
  high: "border-amber-200 bg-amber-50 text-amber-800",
  normal: "border-line bg-paper text-steel",
};

const KIND_LABEL: Record<FocusItem["kind"], string> = {
  lead: "Lead",
  task: "Aufgabe",
  order: "Auftrag",
};

function money(value: number) {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function dateTime(value: string | null) {
  if (!value) return "ohne Termin";
  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export default async function PortalDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal");

  const data = await getCommandCenterData(user);
  const workOrders = data.orderPipeline
    .filter((row) => !["active", "rejected", "cancelled", "storno"].includes(row.status))
    .reduce((sum, row) => sum + row.count, 0);
  const attention = data.metrics.untouchedLeads24h + data.metrics.overdueTasks + data.metrics.attentionOrders;

  const kpis = [
    { label: "Offene Leads", value: data.metrics.openLeads, hint: data.metrics.newLeads24h + " neu in 24h", href: "/portal/leads", Icon: Inbox },
    { label: "Aufträge in Arbeit", value: workOrders, hint: data.metrics.activeOrders + " bereits aktiv", href: "/portal/auftraege", Icon: BriefcaseBusiness },
    { label: "Aufgaben fällig", value: data.metrics.dueTasks24h, hint: "nächste 24 Stunden", href: "/portal/aufgaben", Icon: Clock3 },
    { label: "Aufmerksamkeit", value: attention, hint: data.metrics.overdueTasks + " Tasks überfällig", href: "#fokus", Icon: AlertTriangle, attention: attention > 0 },
    { label: "Kunden", value: data.metrics.customers, hint: "aktive Kundenakten", href: "/portal/kunden", Icon: ContactRound },
    { label: "Abschlüsse 30T", value: data.metrics.wins30, hint: "abgeschlossene Leads", href: "/portal/reporting", Icon: TrendingUp },
  ];

  return (
    <div className="space-y-7">
      <header className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <p className="eyebrow text-electric-deep"><Sparkles className="h-3.5 w-3.5" /> TarifWerk Command Center</p>
          <h1 className="mt-2 text-[clamp(1.8rem,3.6vw,2.8rem)] font-extrabold tracking-tight">Willkommen zurück, {user.name.split(" ")[0]}.</h1>
          <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-steel">
            Ein Arbeitsbild statt zehn Einzelansichten: Prioritäten, Pipeline, Teamlast und nächste Aktionen auf einen Blick.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/leads/neu" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13px] font-semibold hover:border-electric/30 hover:text-electric-deep"><Plus className="h-4 w-4" /> Lead</Link>
          <Link href="/portal/kunden/neu" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13px] font-semibold hover:border-electric/30 hover:text-electric-deep"><Plus className="h-4 w-4" /> Kunde</Link>
          <Link href="/portal/auftraege/neu" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white hover:bg-electric"><Plus className="h-4 w-4" /> Auftrag</Link>
        </div>
      </header>

      <section className="overflow-hidden rounded-[24px] border border-electric/20 bg-[linear-gradient(135deg,rgba(8,15,29,0.98),rgba(20,36,64,0.96))] text-white shadow-[0_24px_70px_-38px_rgba(6,11,22,0.75)]" aria-label="Daily Momentum">
        <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-bold text-electric-soft"><Flame className="h-3.5 w-3.5" /> Daily Momentum</span>
              {data.momentum.status === "complete" && <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-200"><Trophy className="h-3.5 w-3.5" /> Power Day</span>}
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-2">
              <p className="text-[clamp(2rem,5vw,3.4rem)] font-extrabold leading-none tracking-[-0.04em]">{data.momentum.today}<span className="text-white/35">/{data.momentum.dailyTarget}</span></p>
              <div className="pb-1">
                <p className="text-[14px] font-bold">
                  {data.momentum.status === "complete"
                    ? "Tagesziel erreicht."
                    : data.momentum.status === "streak"
                      ? "Rhythmus steht. Ein Lead noch für den Power Day."
                      : data.momentum.streakAtRisk
                        ? data.momentum.currentStreak + "-Tage-Rhythmus kann heute weitergehen."
                        : "Ein Lead reicht, um heute Momentum aufzubauen."}
                </p>
                <p className="mt-1 text-[12px] text-silver">
                  1 Lead hält den Tagesrhythmus · 2 Leads machen den Tag komplett. Kein Zwang – sichtbar bleibt nur dein eigener Fortschritt.
                </p>
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10" aria-label={data.momentum.today + " von " + data.momentum.dailyTarget + " Leads heute"}>
              <div
                className="h-full rounded-full bg-electric transition-[width] duration-500"
                style={{ width: Math.min(100, (data.momentum.today / data.momentum.dailyTarget) * 100) + "%" }}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/portal/leads/neu" className="inline-flex h-10 items-center gap-2 rounded-full bg-electric px-4 text-[12.5px] font-extrabold text-white shadow-[0_10px_28px_-12px_rgba(79,141,255,0.9)] hover:bg-electric-deep"><Plus className="h-4 w-4" /> Lead eintragen</Link>
              <Link href="/portal/leads" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 text-[12.5px] font-bold text-white hover:bg-white/[0.1]">Meine Leads <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-white/[0.055] p-4 sm:p-5">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-black/10 p-3 text-center">
                <Flame className="mx-auto h-4 w-4 text-orange-300" />
                <p className="mt-2 text-[20px] font-extrabold">{data.momentum.currentStreak}</p>
                <p className="text-[10.5px] text-silver">Tage Rhythmus</p>
              </div>
              <div className="rounded-xl bg-black/10 p-3 text-center">
                <Target className="mx-auto h-4 w-4 text-electric-soft" />
                <p className="mt-2 text-[20px] font-extrabold">{data.momentum.activeDays7}/7</p>
                <p className="text-[10.5px] text-silver">aktive Tage</p>
              </div>
              <div className="rounded-xl bg-black/10 p-3 text-center">
                <TrendingUp className="mx-auto h-4 w-4 text-emerald-300" />
                <p className="mt-2 text-[20px] font-extrabold">{data.momentum.leads7}</p>
                <p className="text-[10.5px] text-silver">Leads · 7 Tage</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Aktivität der letzten sieben Tage">
              {data.momentum.week.map((day) => (
                <div key={day.day} className={"rounded-xl border px-1 py-2 text-center " + (day.count > 0 ? "border-electric/35 bg-electric/15" : day.isToday ? "border-white/20 bg-white/[0.06]" : "border-white/8 bg-black/10")}>
                  <p className="text-[9.5px] font-bold uppercase text-silver">{day.label}</p>
                  <p className={"mt-1 text-[14px] font-extrabold " + (day.count > 0 ? "text-white" : "text-white/35")}>{day.count}</p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-silver">
              Nächster Meilenstein: <span className="font-bold text-white">{data.momentum.nextMilestone} aktive Tage</span>
              {data.momentum.nextMilestoneRemaining > 0 ? " · noch " + data.momentum.nextMilestoneRemaining : ""}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" aria-label="Kennzahlen">
        {kpis.map(({ label, value, hint, href, Icon, attention: isAttention }) => (
          <Link key={label} href={href} className={"rounded-[20px] border p-4 transition hover:-translate-y-0.5 hover:shadow-soft " + (isAttention ? "border-amber-200 bg-amber-50/70" : "border-line bg-white")}>
            <div className="flex items-center justify-between gap-3"><p className="text-[12px] font-semibold text-steel">{label}</p><Icon className={"h-4 w-4 " + (isAttention ? "text-amber-600" : "text-electric-deep")} /></div>
            <p className="mt-3 text-[30px] font-extrabold leading-none tracking-tight">{value}</p>
            <p className="mt-2 text-[11.5px] text-steel">{hint}</p>
          </Link>
        ))}
      </section>

      <section id="fokus" className="grid gap-4 xl:grid-cols-[1.45fr_0.75fr]">
        <Card className="p-0 sm:p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
            <div>
              <p className="eyebrow text-electric-deep">Smart Focus</p>
              <h2 className="mt-1 text-[18px] font-extrabold">Was jetzt Aufmerksamkeit braucht</h2>
            </div>
            <Link href="/portal/aufgaben" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-electric-deep hover:underline">Alle Aufgaben <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          {data.focus.length ? (
            <ul className="divide-y divide-line">
              {data.focus.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="grid gap-3 px-5 py-4 transition hover:bg-paper sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-6">
                    <span className={"chip w-fit " + PRIORITY_STYLE[item.priority]}>{item.priority === "critical" ? "Kritisch" : item.priority === "high" ? "Hoch" : "Beobachten"}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-bold">{item.title}</span>
                      <span className="mt-0.5 block text-[12px] leading-relaxed text-steel">{KIND_LABEL[item.kind]} · {item.subtitle}</span>
                    </span>
                    <span className="text-[11px] text-steel sm:text-right">{dateTime(item.timestamp)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid min-h-56 place-items-center px-6 py-10 text-center">
              <div><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" /><p className="mt-3 font-bold">Aktuell kein kritischer Rückstand.</p><p className="mt-1 text-[12.5px] text-steel">Überfällige Tasks, alte neue Leads und festhängende Aufträge erscheinen automatisch hier.</p></div>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2"><ListTodo className="h-4.5 w-4.5 text-electric-deep" /><h2 className="text-[16px] font-extrabold">Schnelle Aufgabe</h2></div>
          <p className="mt-1 text-[12px] text-steel">Eine Wiedervorlage ohne Seitenwechsel anlegen.</p>
          <div className="mt-4">
            <QuickTaskComposer assignees={data.taskAssignees} currentUserId={user.id} />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="text-[16px] font-extrabold">Lead-Eingang · 14 Tage</h2><p className="text-[12px] text-steel">Tatsächliche neue Anfragen in deinem Sichtbereich.</p></div>
            <span className="text-[12px] font-bold text-steel">{data.leadSeries.reduce((sum, row) => sum + row.count, 0)} gesamt</span>
          </div>
          <div className="mt-5"><BarSeries data={data.leadSeries} /></div>
        </Card>

        <Card>
          <h2 className="text-[16px] font-extrabold">Pipeline kompakt</h2>
          <p className="text-[12px] text-steel">Leads und Aufträge ohne Wechsel in Reporting.</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-steel">Leads</p>
              <ul className="mt-2 space-y-2">
                {data.leadPipeline.filter((row) => row.count > 0).map((row) => <li key={row.status} className="flex items-center justify-between gap-3 text-[12.5px]"><span className="truncate">{LEAD_STATUS_LABELS[row.status] ?? row.status}</span><strong>{row.count}</strong></li>)}
              </ul>
            </div>
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-steel">Aufträge</p>
              <ul className="mt-2 space-y-2">
                {data.orderPipeline.filter((row) => row.count > 0).map((row) => <li key={row.status} className="flex items-center justify-between gap-3 text-[12.5px]"><span className="truncate">{ORDER_LABELS[row.status] ?? row.status}</span><strong>{row.count}</strong></li>)}
              </ul>
            </div>
          </div>
        </Card>
      </section>

      {data.finance && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Owner Finanzüberblick">
          {[
            ["Bestätigt", money(data.finance.confirmed)],
            ["Ausgezahlt", money(data.finance.paid)],
            ["Offen", money(data.finance.outstanding)],
            ["Überfällig", money(data.finance.overdue)],
          ].map(([label, value], index) => (
            <Link key={label} href="/portal/finanzen" className={"rounded-[20px] border p-4 " + (index === 3 && data.finance!.overdue > 0 ? "border-amber-200 bg-amber-50" : "border-line bg-white")}>
              <div className="flex items-center justify-between"><p className="text-[12px] font-semibold text-steel">{label}</p><Euro className="h-4 w-4 text-electric-deep" /></div>
              <p className="mt-3 text-[22px] font-extrabold tracking-tight">{value}</p>
            </Link>
          ))}
        </section>
      )}

      {user.role === "admin" && (
        <Card className="p-0 sm:p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2"><UsersRound className="h-4.5 w-4.5 text-electric-deep" /><div><h2 className="text-[16px] font-extrabold">Team Pulse</h2><p className="text-[11.5px] text-steel">Arbeitslast und Engpässe statt Bauchgefühl.</p></div></div>
            <Link href="/portal/betrieb" className="text-[12px] font-bold text-electric-deep hover:underline">Team steuern</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[12.5px]">
              <thead><tr className="border-b border-line bg-paper/60 text-steel"><th className="px-5 py-3 font-semibold sm:px-6">Mitarbeiter</th><th className="px-4 py-3 font-semibold">Offene Leads</th><th className="px-4 py-3 font-semibold">Offene Tasks</th><th className="px-4 py-3 font-semibold">Überfällig</th><th className="px-4 py-3 font-semibold">Aufträge in Arbeit</th><th className="px-4 py-3 font-semibold">Aktiviert 30T</th></tr></thead>
              <tbody>
                {data.team.map((row) => (
                  <tr key={row.employeeId} className="border-b border-line last:border-0 hover:bg-paper/70">
                    <td className="px-5 py-3.5 sm:px-6"><p className="font-bold">{row.name}</p><p className="text-[10.5px] uppercase tracking-wider text-steel">{row.role === "admin" ? "Admin" : "Berater"}</p></td>
                    <td className="px-4 py-3.5 font-semibold">{row.openLeads}</td>
                    <td className="px-4 py-3.5 font-semibold">{row.openTasks}</td>
                    <td className={"px-4 py-3.5 font-extrabold " + (row.overdueTasks > 0 ? "text-red-700" : "text-emerald-700")}>{row.overdueTasks}</td>
                    <td className="px-4 py-3.5 font-semibold">{row.activeOrders}</td>
                    <td className="px-4 py-3.5 font-semibold">{row.wins30}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
