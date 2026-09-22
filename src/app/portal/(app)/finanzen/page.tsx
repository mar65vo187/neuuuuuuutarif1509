import { redirect } from "next/navigation";
import { Download, Euro, ReceiptText, WalletCards } from "lucide-react";
import { Card } from "@/components/portal/ui";
import { getCurrentUser } from "@/lib/auth";
import { getFinanceStats } from "@/lib/enterprise";
import { getCompensationRows, isCompensationOwner } from "@/lib/compensation";
import { permissionSnapshot, PORTAL_PERMISSION } from "@/lib/enterprise-access";

export const dynamic = "force-dynamic";

const money = (value: number) => value.toLocaleString("de-DE",{style:"currency",currency:"EUR"});

export default async function FinancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/login?next=%2Fportal%2Ffinanzen");
  const owner = isCompensationOwner(user);
  const capabilities = await permissionSnapshot(user, [
    PORTAL_PERMISSION.COMMISSION_READ_SELF,
    PORTAL_PERMISSION.COMMISSION_READ_TEAM,
    PORTAL_PERMISSION.COMMISSION_READ_ALL,
    PORTAL_PERMISSION.REPORT_FINANCE,
  ] as const);
  const canReadSelf = capabilities[PORTAL_PERMISSION.COMMISSION_READ_SELF];
  const canReadTeam = capabilities[PORTAL_PERMISSION.COMMISSION_READ_TEAM];
  const canReadAll = capabilities[PORTAL_PERMISSION.COMMISSION_READ_ALL];
  if (!owner && !canReadSelf && !canReadTeam && !canReadAll) redirect("/portal");

  const scope = owner || canReadAll ? "all" : canReadTeam ? "team" : "self";
  const [stats, compensationRows] = await Promise.all([
    user.role === "admin" ? getFinanceStats(user) : Promise.resolve(null),
    getCompensationRows(user, scope),
  ]);
  const compensation = compensationRows.find((row) => row.employeeId === user.id) ?? compensationRows[0];
  const canExport = user.role === "admin" || capabilities[PORTAL_PERMISSION.REPORT_FINANCE];
  const expected = owner
    ? stats?.expected ?? 0
    : compensationRows.reduce((sum, row) => sum + row.employeeExpected, 0);
  const confirmed = owner
    ? stats?.confirmed ?? 0
    : compensationRows.reduce((sum, row) => sum + row.employeeConfirmed, 0);
  const paid = owner
    ? stats?.paid ?? 0
    : compensationRows.reduce((sum, row) => sum + row.employeePaid, 0);
  const outstanding = Math.max(0, confirmed - paid);
  const scopeCopy = owner
    ? "Owner-Sicht auf Provider-Provisionen und Abgleich."
    : scope === "team"
      ? `Freigegebene Team-Sicht für ${compensationRows.length} Mitarbeitende.`
      : scope === "all"
        ? `Freigegebene Finance-Sicht für ${compensationRows.length} Mitarbeitende.`
        : `Ihre aktuelle Vergütungsstufe: ${compensation?.payoutPercent ?? 82} % der für Sie hinterlegten Vergütungsbasis.`;
  const expectedLabel = owner
    ? "Provider-Provision erwartet"
    : scope === "team"
      ? "Erwarteter Team-Anteil"
      : scope === "all"
        ? "Erwarteter Mitarbeitenden-Anteil"
        : "Ihr erwarteter Anteil";
  const confirmedLabel = owner ? "Provider bestätigt" : scope === "self" ? "Ihr bestätigter Anteil" : "Bestätigter Anteil";
  const paidLabel = owner ? "Provider ausgezahlt" : scope === "self" ? "Ihr ausgezahlter Anteil" : "Ausgezahlter Anteil";
  const kpis = [
    [expectedLabel, money(expected), Euro],
    [confirmedLabel, money(confirmed), ReceiptText],
    [paidLabel, money(paid), WalletCards],
    ["Offen", money(outstanding), Euro],
  ] as const;
  const issues = stats?.issues ?? [];

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow text-electric-deep">Finance</p><h1 className="mt-2 text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold tracking-tight">Provisionen & Abgleich</h1><p className="mt-2 text-[13.5px] text-steel">{scopeCopy}</p></div>
      {canExport && <a href="/api/portal/enterprise/export?type=commissions" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold"><Download className="h-4 w-4" /> CSV</a>}
    </header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{kpis.map(([label,value,Icon]) => <Card key={label}><div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-steel">{label}</p><Icon className="h-4.5 w-4.5 text-electric-deep" /></div><p className="mt-3 text-[28px] font-extrabold tracking-tight">{value}</p></Card>)}</div>
    {user.role === "admin" && <Card><div className="flex items-center justify-between"><h2 className="text-[16px] font-extrabold">Offene Reconciliation-Fälle</h2><span className="text-[12px] text-steel">{issues.length}</span></div>
      {issues.length === 0 ? <p className="mt-4 text-[14px] text-steel">Keine offenen Abweichungen.</p> : <ul className="mt-3 divide-y divide-line">{issues.map((issue) => <li key={issue.id} className="flex flex-wrap justify-between gap-3 py-3 text-[14px]"><div><p className="font-semibold">{issue.type} · {issue.reference || "ohne Referenz"}</p><p className="text-[12px] text-steel">{issue.status}</p></div><p className="font-semibold">{money(Number(issue.differenceAmount ?? 0))}</p></li>)}</ul>}
    </Card>}
  </div>;
}
