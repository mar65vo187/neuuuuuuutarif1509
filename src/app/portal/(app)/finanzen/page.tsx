import { redirect } from "next/navigation";
import { Download, Euro, ReceiptText, WalletCards } from "lucide-react";
import { Card } from "@/components/portal/ui";
import { getCurrentUser } from "@/lib/auth";
import { getFinanceStats } from "@/lib/enterprise";
import { getCompensationRows, isCompensationOwner } from "@/lib/compensation";
import { hasPermission } from "@/lib/enterprise-access";

export const dynamic = "force-dynamic";

const money = (value: number) => value.toLocaleString("de-DE",{style:"currency",currency:"EUR"});

export default async function FinancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Ffinanzen");
  const canFinance = user.role === "admin" || await hasPermission(user, "commission.read.self") || await hasPermission(user, "commission.read.all");
  if (!canFinance) redirect("/portal");
  const stats = await getFinanceStats(user);
  const owner = isCompensationOwner(user);
  const compensation = (await getCompensationRows(user))[0];
  const canExport = user.role === "admin" || await hasPermission(user, "report.finance");
  const payoutFactor = owner ? 1 : (compensation?.payoutPercent ?? 82) / 100;
  const expected = owner ? stats.expected : (compensation?.providerGross ?? 0) * payoutFactor;
  const confirmed = owner ? stats.confirmed : (compensation?.confirmedGross ?? 0) * payoutFactor;
  const paid = owner ? stats.paid : (compensation?.paidGross ?? 0) * payoutFactor;
  const outstanding = Math.max(0, confirmed - paid);
  const kpis = [
    [owner ? "Provider-Provision erwartet" : "Ihr erwarteter Anteil", money(expected), Euro],
    [owner ? "Provider bestätigt" : "Ihr bestätigter Anteil", money(confirmed), ReceiptText],
    [owner ? "Provider ausgezahlt" : "Ihr ausgezahlter Anteil", money(paid), WalletCards],
    ["Offen", money(outstanding), Euro],
  ] as const;

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow text-electric-deep">Finance</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Provisionen & Abgleich</h1><p className="mt-2 text-[13.5px] text-steel">{owner ? "Owner-Sicht auf Provider-Provisionen und Abgleich." : `Ihre aktuelle Vergütungsstufe: ${compensation?.payoutPercent ?? 82} % der erfassten Anbieter-Provision.`}</p></div>
      {canExport && <a href="/api/portal/enterprise/export?type=commissions" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold"><Download className="h-4 w-4" /> CSV</a>}
    </header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{kpis.map(([label,value,Icon]) => <Card key={label}><div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-steel">{label}</p><Icon className="h-4.5 w-4.5 text-electric-deep" /></div><p className="mt-3 text-[28px] font-extrabold tracking-tight">{value}</p></Card>)}</div>
    {user.role === "admin" && <Card><div className="flex items-center justify-between"><h2 className="text-[16px] font-extrabold">Offene Reconciliation-Fälle</h2><span className="text-[12px] text-steel">{stats.issues.length}</span></div>
      {stats.issues.length === 0 ? <p className="mt-4 text-[14px] text-steel">Keine offenen Abweichungen.</p> : <ul className="mt-3 divide-y divide-line">{stats.issues.map((issue) => <li key={issue.id} className="flex flex-wrap justify-between gap-3 py-3 text-[14px]"><div><p className="font-semibold">{issue.type} · {issue.reference || "ohne Referenz"}</p><p className="text-[12px] text-steel">{issue.status}</p></div><p className="font-semibold">{money(Number(issue.differenceAmount ?? 0))}</p></li>)}</ul>}
    </Card>}
  </div>;
}
