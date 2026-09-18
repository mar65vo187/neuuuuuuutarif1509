"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Copy, Gift, Loader2, Share2, WalletCards } from "lucide-react";

type Links = { shareUrl: string; dashboardUrl: string };
type Reward = {
  id: number;
  ruleKey: string;
  label: string;
  status: string;
  maxVoucherAmountCents: number;
  voucherAmountCents: number | null;
  cashAmountCents: number | null;
  payoutChoice: string | null;
  createdAt: string;
  approvedAt: string | null;
  paidAt: string | null;
};
type Status = {
  code: string;
  referralCount: number;
  qualifiedCount: number;
  completedCount: number;
  benefit: { friend: string | null; referrer: string | null };
  rewardSummary: {
    potentialVoucherCents: number;
    approvedVoucherCents: number;
    approvedCashCents: number;
    paidVoucherCents: number;
    paidCashCents: number;
  };
  rewards: Reward[];
};

const button = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-electric focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric disabled:pointer-events-none disabled:opacity-50";
const euro = (cents: number) => (cents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const STATUS_LABELS: Record<string, string> = {
  completed: "Abgeschlossen · Prüfung offen",
  approved: "Freigegeben",
  paid: "Ausgezahlt",
  cancelled: "Nicht freigegeben",
  chargeback: "Rückabwicklung",
};

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) throw new Error(body?.error ?? "Die Anfrage konnte nicht verarbeitet werden.");
  return body as T;
}

export function ShareLinks({ url }: { url: string }) {
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Empfehlungslink kopiert.");
    } catch {
      input.current?.focus();
      input.current?.select();
      setMessage("Bitte kopiere den markierten Link.");
    }
  }

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: "TarifWerk – Beratung auf Augenhöhe", text: "Vielleicht hilft dir eine persönliche Einschätzung von TarifWerk.", url });
      else await copy();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setMessage("Teilen ist gerade nicht möglich. Du kannst den Link kopieren.");
    }
  }

  const text = encodeURIComponent(`Vielleicht hilft dir eine persönliche Einschätzung von TarifWerk: ${url}`);
  return <div className="space-y-4">
    <label className="label">Dein Link zum Weitergeben<input ref={input} className="field mt-2" readOnly value={url} onFocus={(event) => event.target.select()} /></label>
    <div className="flex flex-wrap gap-3">
      <button className={button} type="button" onClick={copy}><Copy className="h-4 w-4" /> Link kopieren</button>
      <button className={button} type="button" onClick={share}><Share2 className="h-4 w-4" /> Teilen</button>
      <a className="inline-flex min-h-12 items-center text-[14px] font-semibold text-electric-deep" href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a className="inline-flex min-h-12 items-center text-[14px] font-semibold text-electric-deep" href={`mailto:?subject=${encodeURIComponent("Eine Empfehlung für dich")}&body=${text}`}>E-Mail</a>
    </div>
    {message && <p className="text-[14px] text-steel" role="status">{message}</p>}
  </div>;
}

export function ReferralRegistration() {
  const [links, setLinks] = useState<Links | null>(null);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const values = new FormData(event.currentTarget);
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await readResponse<Links>(await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ name: values.get("name"), email: values.get("email"), consent: values.get("consent") === "on" }),
      }));
      setLinks({
        shareUrl: new URL(result.shareUrl, window.location.origin).href,
        dashboardUrl: new URL(result.dashboardUrl, window.location.origin).href,
      });
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Bitte versuche es erneut.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  if (links) return <div className="space-y-6">
    <h2 className="flex items-center gap-2 text-[22px] font-extrabold text-ink"><Check className="h-5 w-5 text-electric-deep" /> Dein Empfehlungslink ist bereit.</h2>
    <ShareLinks url={links.shareUrl} />
    <div className="rounded-2xl border border-line bg-paper p-5">
      <p className="font-semibold text-ink">Diesen zweiten Link behältst du für dich.</p>
      <p className="mt-2 text-[14px] leading-relaxed text-steel">Dort siehst du zusammengefasste Empfehlungen und deinen Prämienstatus. Jeder mit diesem Link könnte diese Übersicht öffnen – speichere ihn deshalb privat.</p>
      <a href={links.dashboardUrl} className="mt-4 inline-flex min-h-12 items-center gap-2 font-semibold text-electric-deep">Privaten Status öffnen <ArrowRight className="h-4 w-4" /></a>
    </div>
  </div>;

  return <form onSubmit={submit} className="space-y-5">
    <h2 className="text-[22px] font-extrabold text-ink">Deinen persönlichen Empfehlungslink erstellen</h2>
    <p className="text-[15px] leading-relaxed text-steel">Du gibst nur deine eigenen Daten an. Deine Freunde entscheiden selbst, ob sie sich über deinen Link bei TarifWerk melden.</p>
    <label className="label">Dein Name<input name="name" required minLength={2} maxLength={120} autoComplete="name" className="field mt-2" disabled={busy} /></label>
    <label className="label">Deine E-Mail<input name="email" type="email" required maxLength={200} autoComplete="email" className="field mt-2" disabled={busy} /></label>
    <label className="flex items-start gap-3 text-[14px] leading-relaxed text-steel">
      <input type="checkbox" name="consent" required disabled={busy} className="mt-1" />
      <span>TarifWerk darf meine Angaben zur Zuordnung meiner Empfehlungen und zur Kontaktaufnahme dazu verwenden. Kein Newsletter. <Link href="/datenschutz" className="underline">Datenschutz</Link></span>
    </label>
    {error && <p role="alert" className="text-[14px] text-red-700">{error}</p>}
    <button type="submit" className={button} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Empfehlungslink erstellen</button>
  </form>;
}

export function ReferralDashboard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [shareUrl, setShareUrl] = useState("");
  const request = useRef<AbortController | null>(null);

  async function load() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const token = window.location.hash.slice(1);
    if (!/^[a-f0-9]{64}$/.test(token)) {
      setError("Öffne den vollständigen privaten Status-Link, den du beim Erstellen erhalten hast.");
      setBusy(false);
      return;
    }
    setBusy(true);
    setError("");
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const data = await readResponse<Status>(await fetch("/api/referrals/status", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: controller.signal,
      }));
      if (request.current !== controller) return;
      setStatus(data);
      setShareUrl(`${window.location.origin}/freund-werben?ref=${data.code}`);
    } catch (problem) {
      if (request.current === controller) {
        setError(controller.signal.aborted ? "Der Abruf dauert zu lange. Bitte erneut versuchen." : problem instanceof Error ? problem.message : "Status nicht erreichbar.");
      }
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) setBusy(false);
    }
  }

  useEffect(() => {
    const first = setTimeout(() => { void load(); }, 0);
    const changed = () => { setStatus(null); void load(); };
    window.addEventListener("hashchange", changed);
    return () => {
      clearTimeout(first);
      request.current?.abort();
      request.current = null;
      window.removeEventListener("hashchange", changed);
    };
  }, []);

  return <div className="space-y-7">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-[24px] font-extrabold text-ink">Deine Empfehlungen & Prämien</h2>
        <p className="mt-1 text-[13.5px] text-steel">Zusammengefasst, transparent und ohne Kundendaten.</p>
      </div>
      <button type="button" disabled={busy} onClick={load} className={button}>{busy ? "Wird geladen …" : "Aktualisieren"}</button>
    </div>

    {error && <p role="alert" className="rounded-xl border border-line bg-paper p-4 text-[14px] text-steel">{error}</p>}

    {status && <>
      <div className="grid gap-3 sm:grid-cols-3">
        {[["Anfragen", status.referralCount], ["Qualifiziert", status.qualifiedCount], ["Abgeschlossen", status.completedCount]].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-paper p-5">
            <p className="text-[32px] font-extrabold text-ink">{value}</p>
            <p className="mt-1 text-[14px] text-steel">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-5">
          <Gift className="h-5 w-5 text-electric-deep" />
          <p className="mt-3 text-[26px] font-extrabold text-ink">bis {euro(status.rewardSummary.potentialVoucherCents)}</p>
          <p className="mt-1 text-[13px] text-steel">erfasstes Gutschein-Maximum*</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <Check className="h-5 w-5 text-electric-deep" />
          <p className="mt-3 text-[26px] font-extrabold text-ink">{euro(status.rewardSummary.approvedVoucherCents)}</p>
          <p className="mt-1 text-[13px] text-steel">freigegebener Gutscheinwert</p>
          <p className="mt-2 text-[12px] text-steel">Geldalternative: {euro(status.rewardSummary.approvedCashCents)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <WalletCards className="h-5 w-5 text-electric-deep" />
          <p className="mt-3 text-[26px] font-extrabold text-ink">{euro(status.rewardSummary.paidVoucherCents)}</p>
          <p className="mt-1 text-[13px] text-steel">als Prämienwert erledigt</p>
          <p className="mt-2 text-[12px] text-steel">Geldalternative: {euro(status.rewardSummary.paidCashCents)}</p>
        </div>
      </div>

      {status.rewards.length > 0 && <div className="rounded-2xl border border-line bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-extrabold text-ink">Prämienstatus</h3>
          <span className="text-[12px] text-steel">{status.rewards.length} Vorgänge</span>
        </div>
        <ul className="mt-3 divide-y divide-line">
          {status.rewards.map((reward) => (
            <li key={reward.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="font-semibold text-ink">{reward.label}</p>
                <p className="text-[12.5px] text-steel">{STATUS_LABELS[reward.status] ?? reward.status}</p>
              </div>
              <div className="sm:text-right">
                {reward.voucherAmountCents !== null ? (
                  <>
                    <p className="font-bold text-ink">{euro(reward.voucherAmountCents)} Gutscheinwert</p>
                    <p className="text-[12px] text-steel">oder {euro(reward.cashAmountCents ?? 0)} Geld-Auszahlung</p>
                  </>
                ) : (
                  <p className="font-semibold text-ink">bis {euro(reward.maxVoucherAmountCents)}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>}

      <p className="text-[12.5px] leading-relaxed text-steel">
        * Maximalwerte sind noch keine Freigabe. Die konkrete Prämie hängt vom jeweiligen Geschäft und den geltenden Voraussetzungen ab. Nach erfolgreicher Prüfung wird der bestätigte Betrag separat als „freigegeben“ angezeigt.
      </p>

      {status.benefit.referrer && <p className="rounded-2xl bg-paper p-5 text-[15px] text-ink">Für dich: {status.benefit.referrer}</p>}
      <ShareLinks url={shareUrl} />
    </>}

    <p className="text-[14px] leading-relaxed text-steel">Keine Namen, Kontaktdaten oder Vertragsdetails deiner Freunde werden hier angezeigt. Deinen privaten Status-Link bitte nicht weitergeben.</p>
  </div>;
}
