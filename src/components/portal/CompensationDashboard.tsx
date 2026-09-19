"use client";

import { BarChart3, BadgeEuro, CalendarClock, Coins, Loader2, PiggyBank, ShieldCheck, TrendingUp, UsersRound } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { COMPENSATION_TIERS, TEAM_LEVELS } from "@/lib/compensation-model";
import { ProfileImage } from "@/components/advisors/ProfileImage";

type Row = {
  employeeId: number;
  name: string;
  email: string;
  imageUrl: string | null;
  role: "admin" | "berater";
  payoutPercent: number;
  reservePercent: number;
  savingsPercent: number;
  loyaltyStartedAt: string;
  loyaltyVestingYears: number;
  teamLevel: string;
  note: string;
  providerGross: number;
  confirmedGross: number;
  paidGross: number;
  employeeExpected: number;
  reserveAmount: number;
  companyOperatingAmount: number;
  savingsProjection: number;
  loyaltyEligibleAt: string;
};

const money = (value: number) => value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const pct = (value: number) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(value) + " %";
const date = (value: string) => new Date(value).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

function Avatar({ row }: { row: Row }) {
  const initials = row.name.trim().split(/\s+/).map((part) => part[0]).slice(0,2).join("").toUpperCase();
  return <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-platinum to-electric text-[11px] font-extrabold text-ink">
    {row.imageUrl ? <ProfileImage src={row.imageUrl} initials={initials} alt="" /> : initials}
  </span>;
}

export function CompensationDashboard({ rows, isOwner, asOf }: { rows: Row[]; isOwner: boolean; asOf: string }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(rows[0]?.employeeId ?? 0);
  const selected = rows.find((row) => row.employeeId === selectedId) ?? rows[0];
  const [providerAmount, setProviderAmount] = useState("1000");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const simulation = useMemo(() => {
    const gross = Math.max(0, Number(providerAmount.replace(",", ".")) || 0);
    const payout = selected ? gross * selected.payoutPercent / 100 : 0;
    const reserve = selected ? gross * selected.reservePercent / 100 : 0;
    const company = selected ? Math.max(0, gross - payout - reserve) : 0;
    const savings = selected ? gross * selected.savingsPercent / 100 : 0;
    return { gross, payout, reserve, company, savings };
  }, [providerAmount, selected]);

  const maxEmployeeExpected = Math.max(1, ...rows.map((row) => row.employeeExpected));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/portal/compensation/${selected.employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          payoutPercent: Number(data.get("payoutPercent")),
          savingsPercent: Number(data.get("savingsPercent")),
          loyaltyStartedAt: new Date(String(data.get("loyaltyStartedAt")) + "T00:00:00.000Z").toISOString(),
          teamLevel: String(data.get("teamLevel")),
          note: String(data.get("note") ?? ""),
          reason: String(data.get("reason") ?? ""),
        }),
        signal: AbortSignal.timeout(15000),
      });
      const json = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (response.status === 401) {
        window.location.replace("/portal/login?next=%2Fportal%2Fverguetung");
        return;
      }
      if (!response.ok || !json?.ok) throw new Error(json?.error ?? "Die Vergütung konnte nicht gespeichert werden.");
      setSuccess("Vergütungsprofil gespeichert und revisionssicher protokolliert.");
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Speichern fehlgeschlagen.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  if (!selected) {
    return <div className="rounded-[22px] border border-line bg-white p-6 text-[14px] text-steel">Noch keine aktiven Mitarbeiter vorhanden.</div>;
  }

  const currentTier = COMPENSATION_TIERS.find((tier) => tier.percent === selected.payoutPercent) ?? COMPENSATION_TIERS[0];
  const loyaltyYears = Math.max(0, Math.floor((new Date(asOf).getTime() - new Date(selected.loyaltyStartedAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
  const loyaltyProgress = Math.min(100, Math.max(0, loyaltyYears / selected.loyaltyVestingYears * 100));

  return <div className="space-y-6">
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {[
        { label: "Aktuelle Stufe", value: `${currentTier.name} · ${pct(selected.payoutPercent)}`, Icon: TrendingUp },
        { label: "Storno-Rücklage", value: pct(selected.reservePercent), Icon: ShieldCheck },
        { label: "Provider-Basis", value: money(selected.providerGross), Icon: Coins },
        { label: "Treue-Sparquote", value: pct(selected.savingsPercent), Icon: PiggyBank },
      ].map(({ label, value, Icon }) => <div key={label} className="rounded-[22px] border border-line bg-white p-5">
        <div className="flex items-center justify-between"><p className="text-[12.5px] font-semibold text-steel">{label}</p><Icon className="h-4.5 w-4.5 text-electric-deep" /></div>
        <p className="mt-3 text-[24px] font-extrabold tracking-tight text-ink">{value}</p>
      </div>)}
    </section>

    <section className="rounded-[26px] border border-line bg-ink p-6 text-white sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-electric-soft">Stufenmodell</p>
          <h2 className="mt-2 text-[clamp(1.5rem,3vw,2.2rem)] font-extrabold">Transparent von 82 % bis 92 %.</h2>
          <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-silver">Grundlage ist die jeweilige Provisionsliste des Anbieters. Die Stufe wird nicht automatisch durch einen einzelnen starken Monat verändert, sondern anhand von Leistung, Beratungsqualität, Stornoquote, Zuverlässigkeit und Teambeitrag nachvollziehbar festgelegt.</p>
        </div>
        <span className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[12px] font-semibold text-silver">8 % Sicherheits-/Storno-Rücklage separat</span>
      </div>
      <div className="mt-7 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {COMPENSATION_TIERS.map((tier) => {
          const active = tier.percent === selected.payoutPercent;
          return <div key={tier.percent} className={`rounded-2xl border p-4 ${active ? "border-electric bg-electric/15" : "border-white/10 bg-white/5"}`}>
            <p className="text-[11px] uppercase tracking-[0.14em] text-silver">{tier.name}</p>
            <p className="mt-1 text-[25px] font-extrabold">{tier.percent} %</p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-silver">{tier.note}</p>
          </div>;
        })}
      </div>
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <div className="rounded-[22px] border border-line bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3"><BadgeEuro className="h-5 w-5 text-electric-deep" /><div><h2 className="text-[17px] font-extrabold">Verdienstrechner</h2><p className="text-[12.5px] text-steel">Simulation auf Basis einer Anbieter-Provision.</p></div></div>
        <label className="label mt-5">Anbieter-Provision (€)<input inputMode="decimal" className="field" value={providerAmount} onChange={(event) => setProviderAmount(event.target.value)} /></label>
        <div className="mt-5 overflow-hidden rounded-2xl border border-line">
          {[
            ["Anbieter-Provision", simulation.gross, "100 %"],
            ["Mitarbeiteranteil", simulation.payout, pct(selected.payoutPercent)],
            ["Storno-Rücklage", simulation.reserve, pct(selected.reservePercent)],
            ["Operativer Firmenanteil", simulation.company, pct(Math.max(0, 100 - selected.payoutPercent - selected.reservePercent))],
            ["Zusätzliche Treue-Sparprojektion", simulation.savings, pct(selected.savingsPercent)],
          ].map(([label, value, share], index) => <div key={String(label)} className={`flex items-center justify-between gap-4 px-4 py-3 text-[13.5px] ${index ? "border-t border-line" : ""}`}><div><p className="font-semibold text-ink">{label}</p><p className="text-[11.5px] text-steel">{share}</p></div><p className="font-extrabold text-ink">{money(Number(value))}</p></div>)}
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-steel">Der Treue-Sparbaustein wird separat dargestellt und nicht vom Mitarbeiteranteil abgezogen. Eine tatsächliche Gutschrift richtet sich nach dem intern freigegebenen Modell und den dokumentierten Bedingungen.</p>
      </div>

      <div className="rounded-[22px] border border-line bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3"><CalendarClock className="h-5 w-5 text-electric-deep" /><div><h2 className="text-[17px] font-extrabold">10-Jahres-Treueplan</h2><p className="text-[12.5px] text-steel">Langfristiger Firmenbonus mit klarer Laufzeit.</p></div></div>
        <div className="mt-6 flex items-end justify-between"><div><p className="text-[12px] text-steel">Start</p><p className="font-bold">{date(selected.loyaltyStartedAt)}</p></div><div className="text-right"><p className="text-[12px] text-steel">Auszahlungsreife</p><p className="font-bold">{date(selected.loyaltyEligibleAt)}</p></div></div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-paper"><div className="h-full rounded-full bg-electric" style={{ width: `${loyaltyProgress}%` }} /></div>
        <div className="mt-2 flex justify-between text-[11.5px] text-steel"><span>{loyaltyYears} Jahre erreicht</span><span>{selected.loyaltyVestingYears} Jahre Ziel</span></div>
        <div className="mt-5 rounded-2xl bg-paper p-4"><p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-electric-deep">Aktuelle Sparprojektion</p><p className="mt-1 text-[25px] font-extrabold">{money(selected.savingsProjection)}</p><p className="mt-1 text-[11.5px] text-steel">Auf Basis der bisher erfassten Provider-Provisionen und der hinterlegten Sparquote.</p></div>
      </div>
    </section>

    {isOwner && <>
      <section className="rounded-[22px] border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow text-electric-deep"><BarChart3 className="h-4 w-4" /> Owner-Dashboard</p><h2 className="mt-2 text-[18px] font-extrabold">Verdienstübersicht Team</h2></div><span className="text-[12px] text-steel">Nur Owner-Account</span></div>
        <div className="mt-6 space-y-4">
          {rows.map((row) => <div key={row.employeeId}>
            <div className="mb-1.5 flex items-center justify-between gap-4 text-[12.5px]"><span className="font-semibold text-ink">{row.name} · {row.payoutPercent} %</span><span className="font-extrabold text-ink">{money(row.employeeExpected)}</span></div>
            <div className="h-3 overflow-hidden rounded-full bg-paper"><div className="h-full rounded-full bg-electric" style={{ width: `${Math.max(2, row.employeeExpected / maxEmployeeExpected * 100)}%` }} /></div>
          </div>)}
        </div>
        <p className="mt-4 text-[11.5px] text-steel">Diagramm = rechnerischer Mitarbeiteranteil aus den erfassten Provider-Provisionen; keine Aussage über steuerliche Nettoauszahlung.</p>
      </section>

      <section className="rounded-[22px] border border-line bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3"><UsersRound className="h-5 w-5 text-electric-deep" /><div><h2 className="text-[18px] font-extrabold">Vergütung festlegen</h2><p className="text-[12.5px] text-steel">Stufe, Teamlevel und Treue-Sparquote können ausschließlich hier durch den Owner geändert werden.</p></div></div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <label className="label">Mitarbeiter<select className="field" value={selected.employeeId} onChange={(event) => setSelectedId(Number(event.target.value))}>{rows.map((row) => <option key={row.employeeId} value={row.employeeId}>{row.name} · {row.payoutPercent} %</option>)}</select></label>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-paper p-4"><Avatar row={selected} /><div><p className="font-bold text-ink">{selected.name}</p><p className="text-[12px] text-steel">{selected.email}</p></div></div>
          </div>
          <form key={selected.employeeId} onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <label className="label">Provisionsstufe<select name="payoutPercent" defaultValue={selected.payoutPercent} className="field">{COMPENSATION_TIERS.map((tier) => <option key={tier.percent} value={tier.percent}>{tier.name} · {tier.percent} %</option>)}</select></label>
            <label className="label">Teamlevel<select name="teamLevel" defaultValue={selected.teamLevel} className="field">{TEAM_LEVELS.map((level) => <option key={level.key} value={level.key}>{level.label}</option>)}</select></label>
            <label className="label">Treue-Sparquote (%)<input name="savingsPercent" type="number" min={0} max={20} step="0.25" defaultValue={selected.savingsPercent} className="field" /></label>
            <label className="label">Treueplan Start<input name="loyaltyStartedAt" type="date" defaultValue={selected.loyaltyStartedAt.slice(0,10)} className="field" /></label>
            <label className="label sm:col-span-2">Interne Vergütungsnotiz<textarea name="note" rows={3} maxLength={2000} defaultValue={selected.note} className="field" placeholder="z. B. nächste Prüfung, Qualitätsziele, Teamaufbau" /></label>
            <label className="label sm:col-span-2">Begründung der Änderung<input name="reason" required minLength={3} maxLength={500} className="field" placeholder="z. B. Stufenaufstieg nach Qualitäts- und Leistungsreview" /></label>
            {error && <p role="alert" className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</p>}
            {success && <p role="status" className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">{success}</p>}
            <button disabled={saving} className="sm:col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[14px] font-semibold text-white hover:bg-electric disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Vergütung speichern</button>
          </form>
        </div>
      </section>
    </>}
  </div>;
}
