import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle, BarChart3, Clock3, Euro, FileCheck2, GraduationCap, ListTodo,
  Megaphone, ReceiptText, RotateCcw, TrendingUp, UserRoundSearch,
} from "lucide-react";
import { Card } from "@/components/portal/ui";
import { getCurrentUser } from "@/lib/auth";
import { getEnterpriseReport } from "@/lib/enterprise";
import { isCompensationOwner } from "@/lib/compensation";
import { BI_METRICS, BI_METRIC_BY_KEY } from "@/lib/bi-metrics";

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

function money(value: number) {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function trend(value: number) {
  if (value === 0) return "±0 %";
  return `${value > 0 ? "+" : ""}${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
}

export default async function ReportingPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Freporting");

  const { days: raw } = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(raw)) ? Number(raw) : 30;
  const report = await getEnterpriseReport(user, days);
  const owner = isCompensationOwner(user);

  const cards = [
    { label: "Leads", value: String(report.leadTotal), hint: `${trend(report.trends.leads)} zur Vorperiode`, Icon: UserRoundSearch },
    { label: "Lead → Abschluss", value: `${report.leadConversionRate}%`, hint: `${report.leadCompleted} abgeschlossen`, Icon: TrendingUp },
    { label: "Aufträge", value: String(report.totalOrders), hint: `${trend(report.trends.orders)} zur Vorperiode`, Icon: FileCheck2 },
    { label: "Aktivierungsquote", value: `${report.activationRate}%`, hint: `${report.activeOrders} aktiv`, Icon: FileCheck2 },
    { label: "Stornoquote", value: `${report.cancellationRate}%`, hint: "Storniert + Rückbelastung", Icon: RotateCcw },
    ...(owner ? [{ label: "Provider-Provision", value: money(report.expectedCommission), hint: "Erwartete Provision im Zeitraum", Icon: Euro }] : []),
    { label: "Ø Sales Cycle", value: `${report.averageCycleHours} h`, hint: "Anlage bis Aktivierung", Icon: Clock3 },
    { label: "Überfällige Tasks", value: String(report.overdueTasks), hint: `${report.openTasks} insgesamt offen`, Icon: AlertTriangle },
  ];

  const quality = [
    { label: "Leads >72h offen", value: report.dataQuality.staleLeads72h, href: "/portal/leads", Icon: UserRoundSearch, critical: report.dataQuality.staleLeads72h > 0 },
    { label: "Aufträge ohne Provider-ID", value: report.dataQuality.ordersMissingExternalId, href: "/portal/auftraege", Icon: ReceiptText, critical: report.dataQuality.ordersMissingExternalId > 0 },
    { label: "Provider-Abweichungen", value: report.dataQuality.openReconciliation, href: "/portal/betrieb", Icon: ReceiptText, critical: report.dataQuality.openReconciliation > 0 },
    { label: "Unvollständige Produkte", value: report.dataQuality.incompleteProducts, href: "/portal/produkte", Icon: AlertTriangle, critical: report.dataQuality.incompleteProducts > 0 },
    { label: "Schulungen laufen ≤30T ab", value: report.dataQuality.expiringTrainings30d, href: "/portal/betrieb", Icon: GraduationCap, critical: report.dataQuality.expiringTrainings30d > 0 },
  ];
  const coverage = [
    { key: "next_action_coverage", value: report.qualityCoverage.nextAction, href: "/portal/leads?next=missing", Icon: TrendingUp },
    { key: "product_context_coverage", value: report.qualityCoverage.productContext, href: "/portal/leads?relation=none", Icon: FileCheck2 },
    { key: "provider_reference_coverage", value: report.qualityCoverage.providerReference, href: "/portal/auftraege", Icon: ReceiptText },
    { key: "customer_owner_coverage", value: report.qualityCoverage.customerOwner, href: "/portal/kunden", Icon: UserRoundSearch },
    { key: "task_on_time_coverage", value: report.qualityCoverage.taskOnTime, href: "/portal/aufgaben", Icon: ListTodo },
  ].map((row) => ({ ...row, definition: BI_METRIC_BY_KEY[row.key] }));

  const runRate = [
    { label: "Leads / Tag", current: report.velocity.leadsPerDay, previous: report.velocity.previousLeadsPerDay, Icon: UserRoundSearch },
    { label: "Aufträge / Tag", current: report.velocity.ordersPerDay, previous: report.velocity.previousOrdersPerDay, Icon: FileCheck2 },
    { label: "Aktivierungen / Tag", current: report.velocity.activationsPerDay, previous: report.velocity.previousActivationsPerDay, Icon: TrendingUp },
  ];

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow text-electric-deep">Steuerung</p>
        <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Auswertungen & Qualität</h1>
        <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-steel">Funnel, Leistung, Vorperiodenvergleich und operative Datenqualität – damit Entscheidungen nicht nur auf Umsatzsummen beruhen.</p>
      </div>
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

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Steuerungskennzahlen">
      {cards.map(({ label, value, hint, Icon }) => <Card key={label}>
        <div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-steel">{label}</p><Icon className="h-4.5 w-4.5 text-electric-deep" /></div>
        <p className="mt-3 text-[28px] font-extrabold tracking-tight">{value}</p>
        <p className="mt-1 text-[11.5px] text-steel">{hint}</p>
      </Card>)}
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.45fr_0.75fr]" aria-label="BI Datenqualität und Run Rate">
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-electric-deep">BI-Datenqualität</p>
            <h2 className="mt-1 text-[17px] font-extrabold">Coverage der operativen Kerndaten</h2>
            <p className="mt-1 text-[11.5px] text-steel">Jede Quote hat eine feste Formel. 100 % bedeutet vollständige Abdeckung im jeweiligen sichtbaren Datenbestand.</p>
          </div>
          <span className="rounded-full border border-line bg-paper px-3 py-1.5 text-[10.5px] font-bold text-steel">kanonisch definiert</span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {coverage.map(({ key, value, href, Icon, definition }) => {
            const attention = value.percent < 90;
            return <Link key={key} href={href} className={"rounded-2xl border p-3 transition hover:-translate-y-0.5 " + (attention ? "border-amber-200 bg-amber-50/70" : "border-emerald-200 bg-emerald-50/70")}>
              <div className="flex items-start justify-between gap-2"><p className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-steel">{definition.label}</p><Icon className={"h-4 w-4 " + (attention ? "text-amber-600" : "text-emerald-600")} /></div>
              <p className="mt-2 text-[24px] font-extrabold">{value.percent}%</p>
              <p className="mt-1 text-[10.5px] text-steel">{value.covered} von {value.total} abgedeckt</p>
            </Link>;
          })}
        </div>
      </Card>

      <Card>
        <p className="eyebrow text-electric-deep">Run Rate · keine Prognose</p>
        <h2 className="mt-1 text-[17px] font-extrabold">Arbeitsgeschwindigkeit</h2>
        <p className="mt-1 text-[11.5px] leading-relaxed text-steel">Tagesdurchschnitt des gewählten Zeitraums im Vergleich zur direkt davorliegenden Periode. Keine Zukunftsvorhersage.</p>
        <div className="mt-4 space-y-2.5">
          {runRate.map(({ label, current, previous, Icon }) => {
            const delta = previous === 0 ? (current === 0 ? 0 : 100) : Math.round(((current - previous) / previous) * 1000) / 10;
            return <div key={label} className="rounded-xl border border-line bg-paper/60 p-3">
              <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-[11.5px] font-bold"><Icon className="h-3.5 w-3.5 text-electric-deep" /> {label}</span><strong className="text-[18px]">{current.toLocaleString("de-DE", { maximumFractionDigits: 2 })}</strong></div>
              <p className="mt-1 text-[10.5px] text-steel">Vorperiode {previous.toLocaleString("de-DE", { maximumFractionDigits: 2 })} · {trend(delta)}</p>
            </div>;
          })}
        </div>
      </Card>
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <Card>
        <div className="flex items-center justify-between gap-3"><h2 className="text-[16px] font-extrabold">Aufträge nach Status</h2><span className="text-[11.5px] font-semibold text-steel">{report.totalOrders} gesamt</span></div>
        <ul className="mt-4 space-y-3">{report.byStatus.map((row) => <li key={row.status} className="flex items-center justify-between text-[14px]"><span>{ORDER_LABELS[row.status] ?? row.status}</span><span className="font-bold">{row.count}</span></li>)}</ul>
      </Card>
      <Card>
        <h2 className="text-[16px] font-extrabold">Provider-Performance</h2>
        <p className="mt-1 text-[11.5px] text-steel">Volumen, Aktivierungen und Stornos im gewählten Zeitraum.</p>
        <ul className="mt-4 space-y-3">{report.byProvider.map((row) => <li key={row.provider} className="grid grid-cols-[1fr_auto] gap-3 text-[13px]"><span className="truncate font-semibold">{row.provider}</span><span className="text-right"><strong>{row.count}</strong> Aufträge · <span className="text-emerald-700">{row.active} aktiv</span>{row.cancelled > 0 ? <span className="text-red-700"> · {row.cancelled} Storno</span> : null}{owner ? <span className="block text-[11px] text-steel">{money(Number(row.expected))} erwartet</span> : null}</span></li>)}</ul>
      </Card>
    </section>

    <section className="grid gap-4 xl:grid-cols-2" aria-label="Marketing Attribution">
      <Card>
        <div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-electric-deep" /><h2 className="text-[16px] font-extrabold">Akquise nach Quelle</h2></div>
        <p className="mt-1 text-[11.5px] text-steel">First-Party-Auswertung der Quelle, die bei der tatsächlichen Anfrage mitgegeben wurde.</p>
        {report.attribution.bySource.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[12px]">
              <thead className="text-[10px] font-bold uppercase tracking-[0.11em] text-steel"><tr><th className="pb-2 pr-3">Quelle</th><th className="pb-2 px-2 text-right">Leads</th><th className="pb-2 px-2 text-right">Qualifiziert</th><th className="pb-2 px-2 text-right">Abschluss</th><th className="pb-2 pl-2 text-right">Quote</th></tr></thead>
              <tbody className="divide-y divide-line">
                {report.attribution.bySource.map((row) => <tr key={row.source}><td className="py-2.5 pr-3 font-bold">{row.source}</td><td className="px-2 py-2.5 text-right">{row.total}</td><td className="px-2 py-2.5 text-right">{row.qualified}</td><td className="px-2 py-2.5 text-right">{row.completed}</td><td className="py-2.5 pl-2 text-right font-extrabold">{row.conversionRate}%</td></tr>)}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-4 text-[12px] text-steel">Noch keine Attributionsdaten im gewählten Zeitraum.</p>}
      </Card>

      <Card>
        <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-electric-deep" /><h2 className="text-[16px] font-extrabold">Kampagnen-Funnel</h2></div>
        <p className="mt-1 text-[11.5px] text-steel">UTM-Kampagnen und interne Kampagnen-Landingpages bis zum CRM-Abschluss verfolgen.</p>
        {report.attribution.byCampaign.length ? (
          <div className="mt-4 space-y-2.5">
            {report.attribution.byCampaign.map((row) => (
              <div key={row.campaign} className="rounded-2xl border border-line bg-paper/60 p-3.5">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[12.5px] font-extrabold">{row.campaign.replace(/^campaign:/, "").replace(/^kampagne:/, "")}</p><p className="mt-0.5 text-[10.5px] text-steel">{row.total} Leads · {row.qualified} qualifiziert · {row.completed} abgeschlossen{row.lost ? " · " + row.lost + " verloren" : ""}</p></div><span className="rounded-full border border-electric/15 bg-electric/[0.06] px-2.5 py-1 text-[11px] font-extrabold text-electric-deep">{row.conversionRate}%</span></div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/8"><div className="h-full rounded-full bg-electric" style={{ width: Math.min(100, row.qualificationRate) + "%" }} /></div>
                <p className="mt-1.5 text-[10px] text-steel">{row.qualificationRate}% erreichen Termin, Beratung oder Abschluss</p>
              </div>
            ))}
          </div>
        ) : <p className="mt-4 text-[12px] text-steel">Noch keine Kampagnen im gewählten Zeitraum.</p>}
      </Card>
    </section>

    <Card>
      <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-electric-deep" /><h2 className="text-[16px] font-extrabold">Datenqualität & operative Risiken</h2></div>
      <p className="mt-1 text-[12px] text-steel">Nur Punkte, die konkrete Nacharbeit oder ein finanzielles/operatives Risiko erzeugen.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {quality.map(({ label, value, href, Icon, critical }) => <Link key={label} href={href} className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${critical ? "border-amber-200 bg-amber-50/70" : "border-line bg-paper"}`}>
          <div className="flex items-center justify-between gap-2"><p className="text-[11.5px] font-semibold text-steel">{label}</p><Icon className={`h-4 w-4 ${critical ? "text-amber-600" : "text-emerald-600"}`} /></div>
          <p className="mt-3 text-[25px] font-extrabold">{value}</p>
          <p className="mt-1 text-[11px] text-steel">{value > 0 ? "Prüfen" : "Sauber"}</p>
        </Link>)}
      </div>
    </Card>

    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-electric-deep">Kennzahlenkatalog</p>
          <h2 className="mt-1 text-[17px] font-extrabold">Eine Definition pro KPI</h2>
          <p className="mt-1 max-w-3xl text-[11.5px] leading-relaxed text-steel">Formeln, Datenquellen und Scope sind zentral festgelegt. Damit bleibt dieselbe Kennzahl in Dashboard, Reporting und späteren Exporten identisch interpretierbar.</p>
        </div>
        <span className="rounded-full border border-line bg-paper px-3 py-1.5 text-[10.5px] font-bold text-steel">{BI_METRICS.length} Definitionen</span>
      </div>
      <div className="mt-4 grid gap-2 lg:grid-cols-2">
        {BI_METRICS.map((metric) => (
          <details key={metric.key} className="group rounded-2xl border border-line bg-paper/55 p-3.5">
            <summary className="cursor-pointer list-none">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[12.5px] font-extrabold">{metric.label}</p><p className="mt-0.5 text-[10.5px] text-steel">{metric.category} · {metric.scope}</p></div>
                <span className="text-[16px] font-bold text-electric-deep group-open:rotate-45">+</span>
              </div>
            </summary>
            <div className="mt-3 border-t border-line pt-3">
              <p className="text-[11.5px] leading-relaxed text-steel">{metric.description}</p>
              <div className="mt-3 grid gap-2">
                <div className="rounded-xl border border-line bg-white/70 p-2.5"><p className="text-[9.5px] font-bold uppercase tracking-wider text-steel">Formel</p><p className="mt-1 text-[11px] font-semibold">{metric.formula}</p></div>
                <div className="rounded-xl border border-line bg-white/70 p-2.5"><p className="text-[9.5px] font-bold uppercase tracking-wider text-steel">Quelle</p><p className="mt-1 break-words text-[10.5px] font-mono text-steel">{metric.source.join(" · ")}</p></div>
              </div>
            </div>
          </details>
        ))}
      </div>
    </Card>

    <Card>
      <div className="flex items-center gap-2"><ListTodo className="h-4 w-4 text-electric-deep" /><h2 className="text-[16px] font-extrabold">Betriebsstatus</h2></div>
      <p className="mt-3 text-[14px] text-steel">{report.openTasks} offene Aufgaben · {report.overdueTasks} davon überfällig · Aktivierungen {trend(report.trends.activations)} zur Vorperiode · Lead-Abschlüsse {trend(report.trends.leadWins)}.</p>
    </Card>
  </div>;
}
