import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle, ArrowRight, BriefcaseBusiness, CheckCircle2, Clock3, ContactRound,
  Activity, CalendarClock, Euro, Flame, Inbox, ListTodo, PackageSearch, Plus, ShieldCheck, Sparkles, Target, TrendingUp, Trophy, UserRoundX, UsersRound,
} from "lucide-react";
import { BarSeries } from "@/components/portal/Charts";
import { QuickTaskComposer } from "@/components/portal/QuickTaskComposer";
import { Card } from "@/components/portal/ui";
import { getCurrentUser } from "@/lib/auth";
import { LEAD_STATUS_LABELS } from "@/lib/content";
import { getCommandCenterData, type FocusItem } from "@/lib/portal-command-center";
import { permissionSnapshot, PORTAL_PERMISSION } from "@/lib/enterprise-access";

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
  customer: "Kunde",
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

  const [data, capabilities] = await Promise.all([
    getCommandCenterData(user),
    permissionSnapshot(user, [
      PORTAL_PERMISSION.LEAD_EDIT,
      PORTAL_PERMISSION.CUSTOMER_EDIT,
      PORTAL_PERMISSION.ORDER_CREATE,
      PORTAL_PERMISSION.TASK_MANAGE,
      PORTAL_PERMISSION.REPORT_SALES,
    ] as const),
  ]);
  const canLeadEdit = capabilities[PORTAL_PERMISSION.LEAD_EDIT];
  const canCustomerEdit = capabilities[PORTAL_PERMISSION.CUSTOMER_EDIT];
  const canOrderCreate = capabilities[PORTAL_PERMISSION.ORDER_CREATE];
  const canTaskManage = capabilities[PORTAL_PERMISSION.TASK_MANAGE];
  const canReport = capabilities[PORTAL_PERMISSION.REPORT_SALES];
  const workOrders = data.orderPipeline
    .filter((row) => !["active", "rejected", "cancelled", "storno"].includes(row.status))
    .reduce((sum, row) => sum + row.count, 0);
  const attention = data.metrics.untouchedLeads24h + data.metrics.overdueTasks + data.metrics.attentionOrders + data.metrics.dueCustomerReviews + data.metrics.atRiskCustomers;

  const kpis = [
    { label: "Offene Leads", value: data.metrics.openLeads, hint: data.metrics.newLeads24h + " neu in 24h", href: "/portal/leads", Icon: Inbox },
    { label: "Aufträge in Arbeit", value: workOrders, hint: data.metrics.activeOrders + " bereits aktiv", href: "/portal/auftraege", Icon: BriefcaseBusiness },
    { label: "Aufgaben fällig", value: data.metrics.dueTasks24h, hint: "nächste 24 Stunden", href: "/portal/aufgaben", Icon: Clock3 },
    { label: "Aufmerksamkeit", value: attention, hint: data.metrics.overdueTasks + " Tasks überfällig", href: "#fokus", Icon: AlertTriangle, attention: attention > 0 },
    { label: "Kunden", value: data.metrics.customers, hint: "aktive Kundenakten", href: "/portal/kunden", Icon: ContactRound },
    { label: "Abschlüsse 30T", value: data.metrics.wins30, hint: "abgeschlossene Leads", href: canReport ? "/portal/reporting" : "/portal/leads?status=abgeschlossen", Icon: TrendingUp },
  ];
  const firstFocus = data.focus[0] ?? null;
  const salesControl = [
    { label: "Hot Leads", value: data.metrics.hotLeads, hint: "hohe Priorität", href: "/portal/leads?priority=attention", Icon: Flame, tone: "border-champagne/30 bg-champagne/10" },
    { label: "Heute nachfassen", value: data.metrics.dueLeadFollowUpsToday, hint: "geplante Kontakte", href: "/portal/leads?next=today&sort=next", Icon: CalendarClock, tone: "border-electric/20 bg-electric/[0.06]" },
    { label: "Ohne nächsten Schritt", value: data.metrics.leadsMissingNextAction, hint: "CRM-Lücke schließen", href: "/portal/leads?next=missing", Icon: Target, tone: "border-amber-200 bg-amber-50/80" },
    { label: "Ohne Produktprofil", value: data.metrics.leadsWithoutProduct, hint: "Potenzial ergänzen", href: "/portal/leads?relation=none", Icon: PackageSearch, tone: "border-violet-200 bg-violet-50/80" },
  ];
  const customerControl = [
    { label: "Reviews fällig", value: data.metrics.dueCustomerReviews, hint: "Bestandscheck jetzt", href: "/portal/kunden?focus=review", Icon: Clock3, tone: "border-amber-200 bg-amber-50/80" },
    { label: "Offene Potenziale", value: data.metrics.openCustomerOpportunities, hint: "qualifizieren oder terminieren", href: "/portal/kunden?focus=opportunity", Icon: Target, tone: "border-electric/20 bg-electric/[0.06]" },
    { label: "Risiko-Kunden", value: data.metrics.atRiskCustomers, hint: "Beziehung aktiv prüfen", href: "/portal/kunden?focus=risk", Icon: AlertTriangle, tone: "border-red-200 bg-red-50/70" },
  ];
  const qualityChecks = [
    { label: "Nächster Schritt gesetzt", open: data.metrics.leadsMissingNextAction, href: "/portal/leads?next=missing", detail: "Jeder offene Lead braucht eine konkrete nächste Aktion.", Icon: Target },
    { label: "Produktbild gepflegt", open: data.metrics.leadsWithoutProduct, href: "/portal/leads?relation=none", detail: "Bedarf, Bestand oder Abschluss sollten nachvollziehbar dokumentiert sein.", Icon: PackageSearch },
    { label: "Aufgaben im Zeitplan", open: data.metrics.overdueTasks, href: "/portal/aufgaben", detail: "Überfällige Aufgaben zuerst schließen oder neu terminieren.", Icon: Clock3 },
    { label: "Bestandschecks aktuell", open: data.metrics.dueCustomerReviews, href: "/portal/kunden?focus=review", detail: "Fällige Kundenreviews aktiv bearbeiten statt liegen lassen.", Icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-7">
      <header className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
        <div>
          <p className="eyebrow text-electric-deep"><Sparkles className="h-3.5 w-3.5" /> TarifWerk Arbeitsübersicht</p>
          <h1 className="mt-2 text-[clamp(1.8rem,3.6vw,2.8rem)] font-extrabold tracking-tight">Willkommen zurück, {user.name.split(" ")[0]}.</h1>
          <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-steel">
            Ein Arbeitsbild statt zehn Einzelansichten: Prioritäten, Pipeline, Teamlast und nächste Aktionen auf einen Blick.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canLeadEdit && <Link href="/portal/leads/neu" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13px] font-semibold hover:border-electric/30 hover:text-electric-deep"><Plus className="h-4 w-4" /> Lead</Link>}
          {canCustomerEdit && <Link href="/portal/kunden/neu" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13px] font-semibold hover:border-electric/30 hover:text-electric-deep"><Plus className="h-4 w-4" /> Kunde</Link>}
          {canOrderCreate && <Link href="/portal/auftraege/neu" className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-white hover:bg-electric"><Plus className="h-4 w-4" /> Auftrag</Link>}
        </div>
      </header>

      <section className="rounded-[22px] border border-line bg-white p-4 shadow-soft sm:p-5" aria-label="Tagesleistung">
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.2fr_auto] xl:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-electric-deep"><Flame className="h-3.5 w-3.5" /> Tagesleistung</span>
              {data.momentum.status === "complete" && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700"><Trophy className="h-3 w-3" /> Tagesziel erreicht</span>}
            </div>
            <div className="mt-2 flex items-end gap-3">
              <p className="text-[32px] font-extrabold leading-none tracking-tight">{data.momentum.today}<span className="text-steel/45">/{data.momentum.dailyTarget}</span></p>
              <p className="pb-0.5 text-[12px] font-semibold text-steel">
                {data.momentum.status === "complete"
                  ? "Tagesziel erreicht"
                  : data.momentum.status === "streak"
                    ? "Rhythmus steht · noch 1 bis Tagesziel"
                    : data.momentum.streakAtRisk
                      ? data.momentum.currentStreak + "-Tage-Rhythmus fortsetzen"
                      : "Heute mit 1 Lead starten"}
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper" aria-label={data.momentum.today + " von " + data.momentum.dailyTarget + " Leads heute"}>
              <div
                className="h-full rounded-full bg-electric transition-[width] duration-500"
                style={{ width: Math.min(100, (data.momentum.today / data.momentum.dailyTarget) * 100) + "%" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 rounded-[16px] bg-paper/70 p-2" aria-label="Aktivität der letzten sieben Tage">
            {data.momentum.week.map((day) => (
              <div key={day.day} className={"rounded-xl px-1 py-2 text-center " + (day.isToday ? "bg-white shadow-sm" : "")}>
                <p className="text-[9px] font-bold uppercase tracking-wide text-steel">{day.label}</p>
                <div className={"mx-auto mt-1.5 grid h-6 w-6 place-items-center rounded-full text-[11px] font-extrabold " + (day.count >= 2 ? "bg-electric text-white" : day.count === 1 ? "bg-electric/10 text-electric-deep" : "bg-white text-steel/45")}>
                  {day.count}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4 xl:justify-end">
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-[18px] font-extrabold">{data.momentum.currentStreak}</p>
                <p className="text-[10px] font-semibold text-steel">Aktivserie</p>
              </div>
              <div>
                <p className="text-[18px] font-extrabold">{data.momentum.activeDays7}/7</p>
                <p className="text-[10px] font-semibold text-steel">aktiv</p>
              </div>
            </div>
            {canLeadEdit && <Link href="/portal/leads/neu" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-[12.5px] font-bold text-white hover:bg-electric"><Plus className="h-4 w-4" /> Lead eintragen</Link>}
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

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]" aria-label="Tagessteuerung">
        <Card className="overflow-hidden border-ink/10 bg-ink text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-electric-soft">Jetzt zuerst</p>
              <h2 className="mt-1 text-[18px] font-extrabold">Dein nächster sinnvoller Schritt</h2>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-electric-soft"><Sparkles className="h-4 w-4" /></span>
          </div>
          {firstFocus ? (
            <div className="mt-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={"chip " + (firstFocus.priority === "critical" ? "border-red-400/40 bg-red-400/10 text-red-100" : firstFocus.priority === "high" ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-white/10 bg-white/[0.05] text-silver")}>{firstFocus.priority === "critical" ? "Kritisch" : firstFocus.priority === "high" ? "Hoch" : "Beobachten"}</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-silver">{KIND_LABEL[firstFocus.kind]}</span>
              </div>
              <p className="mt-3 text-[20px] font-extrabold leading-tight">{firstFocus.title}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-silver">{firstFocus.subtitle}</p>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-steel">{dateTime(firstFocus.timestamp)}</span>
                <Link href={firstFocus.href} className="inline-flex h-10 items-center gap-2 rounded-full bg-electric px-4 text-[12.5px] font-extrabold text-white hover:bg-electric-deep">Jetzt bearbeiten <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="font-bold">Keine kritische Arbeit offen.</p>
              <p className="mt-1 text-[12px] text-silver">Neue Fälligkeiten und Engpässe erscheinen automatisch hier.</p>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow text-electric-deep">Vertriebssteuerung</p>
              <h2 className="mt-1 text-[18px] font-extrabold">CRM-Qualität auf einen Blick</h2>
              <p className="mt-1 text-[12px] text-steel">Vier Arbeitslisten, die saubere Wiedervorlagen, vollständige Bedarfserfassung und konsequente Bearbeitung sichern.</p>
            </div>
            <Link href="/portal/leads" className="text-[12px] font-bold text-electric-deep hover:underline">Lead CRM öffnen</Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {salesControl.map(({ label, value, hint, href, Icon, tone }) => (
              <Link key={label} href={href} className={"group rounded-2xl border p-3.5 transition hover:-translate-y-0.5 hover:shadow-soft " + tone}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-steel">{label}</p><p className="mt-1.5 text-[24px] font-extrabold leading-none">{value}</p></div>
                  <Icon className="h-4 w-4 text-electric-deep transition-transform group-hover:scale-110" />
                </div>
                <p className="mt-2 text-[11.5px] text-steel">{hint}</p>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <section aria-label="Arbeitsqualität">
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow text-electric-deep">Qualitätscheck</p>
              <h2 className="mt-1 text-[18px] font-extrabold">Arbeitsqualität für heute</h2>
              <p className="mt-1 max-w-3xl text-[12px] text-steel">Kein Ranking und kein Drucksystem: Diese vier Standards zeigen nur, wo Dokumentation oder Nacharbeit noch offen ist.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10.5px] font-bold text-silver">Ziel: 0 offene Qualitätslücken</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {qualityChecks.map(({ label, open, href, detail, Icon }) => {
              const clean = open === 0;
              return (
                <Link key={label} href={href} className={"rounded-2xl border p-3.5 transition hover:-translate-y-0.5 " + (clean ? "border-emerald-400/20 bg-emerald-400/[0.07]" : "border-amber-300/20 bg-amber-300/[0.07]")}>
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-[11px] font-extrabold uppercase tracking-[0.11em] text-silver">{label}</p><p className="mt-1.5 text-[24px] font-extrabold">{clean ? "Sauber" : open + " offen"}</p></div>
                    <Icon className={"h-4 w-4 " + (clean ? "text-emerald-300" : "text-amber-300")} />
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-steel">{detail}</p>
                </Link>
              );
            })}
          </div>
        </Card>
      </section>

      <section aria-label="Bestandskundensteuerung">
        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow text-electric-deep">Bestandskundensteuerung</p>
              <h2 className="mt-1 text-[18px] font-extrabold">Bestand, Potenzial & Retention</h2>
              <p className="mt-1 text-[12px] text-steel">Kundenpflege wird automatisch Teil der Tagessteuerung statt erst beim nächsten Zufallskontakt sichtbar.</p>
            </div>
            <Link href="/portal/kunden" className="text-[12px] font-bold text-electric-deep hover:underline">Customer 360 öffnen</Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {customerControl.map(({ label, value, hint, href, Icon, tone }) => (
              <Link key={label} href={href} className={"group rounded-2xl border p-3.5 transition hover:-translate-y-0.5 hover:shadow-soft " + tone}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-steel">{label}</p><p className="mt-1.5 text-[24px] font-extrabold leading-none">{value}</p></div>
                  <Icon className="h-4 w-4 text-electric-deep transition-transform group-hover:scale-110" />
                </div>
                <p className="mt-2 text-[11.5px] text-steel">{hint}</p>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <section id="fokus" className="grid gap-4 xl:grid-cols-[1.45fr_0.75fr]">
        <Card className="p-0 sm:p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
            <div>
              <p className="eyebrow text-electric-deep">Arbeitsfokus</p>
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
          <div className="flex items-center gap-2"><ListTodo className="h-4.5 w-4.5 text-electric-deep" /><h2 className="text-[16px] font-extrabold">{canTaskManage ? "Schnelle Aufgabe" : "Aufgaben"}</h2></div>
          <p className="mt-1 text-[12px] text-steel">{canTaskManage ? "Eine Wiedervorlage ohne Seitenwechsel anlegen." : "Diese Rolle kann Aufgaben ansehen, aber keine neuen Aufgaben anlegen."}</p>
          {canTaskManage && <div className="mt-4"><QuickTaskComposer assignees={data.taskAssignees} currentUserId={user.id} /></div>}
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
          <p className="text-[12px] text-steel">Leads und Aufträge ohne Wechsel in Auswertungen.</p>
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

      {data.integrity && (
        <section aria-label="Betriebsqualität">
          <Card>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow text-electric-deep"><ShieldCheck className="h-3.5 w-3.5" /> Operations Control</p>
                <h2 className="mt-1 text-[18px] font-extrabold">Datenintegrität & SLA</h2>
                <p className="mt-1 text-[12px] text-steel">Verwaiste Zuständigkeiten und festhängende Vorgänge früh erkennen, bevor sie im Vertrieb oder Kundenservice verloren gehen.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5 text-[11px] font-bold text-steel"><Activity className="h-3.5 w-3.5 text-electric-deep" /> {data.integrity.auditEvents24h} Audit-Events · 24h</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {[
                ["Unzugewiesene Leads", data.integrity.unassignedOpenLeads, "/portal/leads", UserRoundX],
                ["Kunden ohne Owner", data.integrity.unownedCustomers, "/portal/kunden", ContactRound],
                ["Aufträge ohne Owner", data.integrity.unassignedOpenOrders, "/portal/auftraege", BriefcaseBusiness],
                ["Aufgaben ohne Owner", data.integrity.unassignedOpenTasks, "/portal/aufgaben", ListTodo],
                ["Überfällige Lead-Aktionen", data.integrity.overdueLeadActions, "/portal/leads?next=overdue&sort=next", AlertTriangle],
                ["Stagnierende Aufträge >7T", data.integrity.staleOrders, "/portal/auftraege", Clock3],
              ].map(([label, value, href, Icon]) => {
                const count = Number(value);
                const IconComponent = Icon as typeof AlertTriangle;
                return (
                  <Link key={String(label)} href={String(href)} className={"rounded-2xl border p-3.5 transition hover:-translate-y-0.5 hover:shadow-soft " + (count > 0 ? "border-amber-200 bg-amber-50/70" : "border-emerald-200 bg-emerald-50/60")}>
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-[11px] font-extrabold uppercase tracking-[0.11em] text-steel">{String(label)}</p><p className="mt-1.5 text-[24px] font-extrabold leading-none">{count}</p></div>
                      <IconComponent className={"h-4 w-4 " + (count > 0 ? "text-amber-700" : "text-emerald-700")} />
                    </div>
                    <p className="mt-2 text-[11px] font-semibold text-steel">{count > 0 ? "Prüfung erforderlich" : "Sauber"}</p>
                  </Link>
                );
              })}
            </div>
          </Card>
        </section>
      )}

      {user.role === "admin" && (
        <Card className="p-0 sm:p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2"><UsersRound className="h-4.5 w-4.5 text-electric-deep" /><div><h2 className="text-[16px] font-extrabold">Team-Auslastung</h2><p className="text-[11.5px] text-steel">Arbeitslast und Engpässe statt Bauchgefühl.</p></div></div>
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
