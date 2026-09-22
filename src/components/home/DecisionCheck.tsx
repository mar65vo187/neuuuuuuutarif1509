"use client";

import Link from "next/link";
import { ArrowRight, Calculator, CheckCircle2, FileSearch, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { withAudience, type AudienceMode } from "@/lib/audience";

const B2C_POINTS = [
  "Angebot oder bestehenden Vertrag verständlich einordnen",
  "Kosten, Laufzeit und wichtige Bedingungen gemeinsam ansehen",
  "Keine Abschlussverpflichtung – du entscheidest selbst",
] as const;

const B2B_POINTS = [
  "Vorliegende Angebote und Vertragsstände strukturiert einordnen",
  "Kosten, Leistung, Laufzeit und Umsetzbarkeit gemeinsam ansehen",
  "Keine automatische Entscheidung – Sie behalten die Freigabe",
] as const;

type PriceMode = "single" | "promo";

function parseMoney(value: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function clampMonths(value: string, fallback: number, max = 120) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function formatCurrency(value: number) {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

export function DecisionCheck({ audience }: { audience: AudienceMode }) {
  const business = audience === "b2b";
  const [priceMode, setPriceMode] = useState<PriceMode>("single");
  const [monthly, setMonthly] = useState("");
  const [duration, setDuration] = useState("24");
  const [promoMonthly, setPromoMonthly] = useState("");
  const [promoMonths, setPromoMonths] = useState("6");
  const [regularMonthly, setRegularMonthly] = useState("");

  const calculation = useMemo(() => {
    const contractMonths = clampMonths(duration, 24);
    const firstPhaseMonths = Math.min(clampMonths(promoMonths, 1, 120), contractMonths);

    if (priceMode === "single") {
      const monthlyPrice = parseMoney(monthly);
      const total = monthlyPrice * contractMonths;
      const firstYearMonths = Math.min(contractMonths, 12);
      return {
        total,
        average: contractMonths > 0 ? total / contractMonths : 0,
        firstYear: monthlyPrice * firstYearMonths,
        contractMonths,
        firstYearMonths,
        valid: monthlyPrice > 0,
      };
    }

    const promoPrice = parseMoney(promoMonthly);
    const regularPrice = parseMoney(regularMonthly);
    const regularMonths = Math.max(contractMonths - firstPhaseMonths, 0);
    const total = promoPrice * firstPhaseMonths + regularPrice * regularMonths;

    const firstYearMonths = Math.min(contractMonths, 12);
    const promoMonthsInFirstYear = Math.min(firstPhaseMonths, firstYearMonths);
    const regularMonthsInFirstYear = Math.max(firstYearMonths - promoMonthsInFirstYear, 0);
    const firstYear = promoPrice * promoMonthsInFirstYear + regularPrice * regularMonthsInFirstYear;

    return {
      total,
      average: contractMonths > 0 ? total / contractMonths : 0,
      firstYear,
      contractMonths,
      firstYearMonths,
      valid: promoPrice > 0 || regularPrice > 0,
    };
  }, [duration, monthly, priceMode, promoMonthly, promoMonths, regularMonthly]);

  const href = withAudience(business ? "/anfrage" : "/anfrage?situation=vergleich", audience);

  return (
    <section className="relative overflow-hidden bg-paper-2 py-16 sm:py-20">
      <div className="pointer-events-none absolute right-[-10%] top-[-20%] h-[420px] w-[420px] rounded-full bg-electric/10 blur-[120px]" aria-hidden="true" />
      <div className="container-x relative grid gap-6 lg:grid-cols-12 lg:items-stretch">
        <article className="rounded-[28px] border border-line bg-white p-6 shadow-soft sm:p-8 lg:col-span-7">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-electric/10 text-electric-deep">
              <FileSearch className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="eyebrow text-electric-deep">{business ? "Angebote prüfen" : "Zweite Meinung"}</p>
          </div>

          <h2 className="mt-5 max-w-3xl text-[clamp(2rem,4vw,3.35rem)] font-extrabold leading-[1.02] text-ink">
            {business ? "Schon ein Angebot auf dem Tisch?" : "Schon ein Vertrag oder Angebot vor dir?"}
            <br />
            <span className="display-i font-normal text-ink-700">
              {business ? "Erst einordnen. Dann freigeben." : "Erst prüfen. Dann entscheiden."}
            </span>
          </h2>
          <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-steel">
            {business
              ? "Sie müssen ein vorhandenes Angebot nicht ungeprüft übernehmen. Wir schauen mit Ihnen auf die relevanten Kriterien und strukturieren offene Punkte vor der Entscheidung."
              : "Wenn schon ein Angebot vorliegt, musst du nicht bei null anfangen. Wir schauen auf die entscheidenden Punkte und erklären dir verständlich, worauf du vor deiner Entscheidung achten solltest."}
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {(business ? B2B_POINTS : B2C_POINTS).map((item) => (
              <li key={item} className="rounded-2xl border border-line bg-paper p-4 text-[13px] leading-relaxed text-ink-700">
                <CheckCircle2 className="mb-3 h-4.5 w-4.5 text-electric-deep" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={href} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[14px] font-bold text-white transition hover:bg-electric">
              {business ? "Angebot einordnen lassen" : "Kostenlose zweite Meinung anfragen"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <span className="inline-flex items-center gap-2 text-[12.5px] text-steel">
              <ShieldCheck className="h-4 w-4 text-electric-deep" aria-hidden="true" />
              kostenlos & unverbindlich zum Start
            </span>
          </div>
        </article>

        <aside className="rounded-[28px] border border-line bg-ink p-6 text-white shadow-soft sm:p-8 lg:col-span-5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-electric-soft">
              <Calculator className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-silver">Schneller Kosten-Check</p>
              <h3 className="mt-1 text-[19px] font-extrabold">
                {business ? "Was kostet Ihr Vertrag wirklich?" : "Was kostet dein Vertrag wirklich?"}
              </h3>
            </div>
          </div>

          <p className="mt-5 text-[13.5px] leading-relaxed text-silver">
            {business
              ? "Tragen Sie Laufzeit und Preis ein. Auch Aktionspreise mit anschließend höherem Monatspreis werden korrekt berücksichtigt."
              : "Trag Laufzeit und Preis ein. Auch Aktionspreise mit anschließend höherem Monatspreis werden korrekt berücksichtigt."}
          </p>

          <div className="mt-6 grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.04] p-1" role="group" aria-label="Preismodell auswählen">
            <button
              type="button"
              aria-pressed={priceMode === "single"}
              onClick={() => setPriceMode("single")}
              className={`min-h-11 rounded-xl px-3 py-2 text-[12.5px] font-bold transition ${
                priceMode === "single" ? "bg-white text-ink" : "text-silver hover:text-white"
              }`}
            >
              Ein Preis
            </button>
            <button
              type="button"
              aria-pressed={priceMode === "promo"}
              onClick={() => setPriceMode("promo")}
              className={`min-h-11 rounded-xl px-3 py-2 text-[12.5px] font-bold transition ${
                priceMode === "promo" ? "bg-white text-ink" : "text-silver hover:text-white"
              }`}
            >
              Aktionspreis
            </button>
          </div>

          <label className="mt-5 block">
            <span className="text-[12.5px] font-semibold text-platinum">Vertragslaufzeit in Monaten</span>
            <input
              type="number"
              min={1}
              max={120}
              inputMode="numeric"
              value={duration}
              onChange={(event) => setDuration(event.target.value.slice(0, 3))}
              className="field-dark mt-2"
              aria-label="Vertragslaufzeit in Monaten"
            />
          </label>

          {priceMode === "single" ? (
            <label className="mt-4 block">
              <span className="text-[12.5px] font-semibold text-platinum">Monatliche Kosten in €</span>
              <input
                inputMode="decimal"
                value={monthly}
                onChange={(event) => setMonthly(event.target.value.slice(0, 12))}
                placeholder="z. B. 44,95"
                className="field-dark mt-2"
                aria-label="Monatliche Vertragskosten"
              />
            </label>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[12.5px] font-semibold text-platinum">Aktionspreis / Monat</span>
                <input
                  inputMode="decimal"
                  value={promoMonthly}
                  onChange={(event) => setPromoMonthly(event.target.value.slice(0, 12))}
                  placeholder="z. B. 19,99"
                  className="field-dark mt-2"
                  aria-label="Aktionspreis pro Monat"
                />
              </label>
              <label className="block">
                <span className="text-[12.5px] font-semibold text-platinum">Aktionsdauer in Monaten</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  inputMode="numeric"
                  value={promoMonths}
                  onChange={(event) => setPromoMonths(event.target.value.slice(0, 3))}
                  placeholder="z. B. 6"
                  className="field-dark mt-2"
                  aria-label="Dauer des Aktionspreises in Monaten"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[12.5px] font-semibold text-platinum">Preis danach / Monat</span>
                <input
                  inputMode="decimal"
                  value={regularMonthly}
                  onChange={(event) => setRegularMonthly(event.target.value.slice(0, 12))}
                  placeholder="z. B. 44,95"
                  className="field-dark mt-2"
                  aria-label="Regulärer Monatspreis nach der Aktion"
                />
              </label>
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4" aria-live="polite">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11.5px] text-silver">Gesamtkosten über {calculation.contractMonths} Monate</p>
                <p className="mt-1 text-[28px] font-extrabold tracking-tight">
                  {calculation.valid ? formatCurrency(calculation.total) : "–"}
                </p>
              </div>
              {calculation.valid ? (
                <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-right">
                  <p className="text-[10.5px] text-silver">Ø pro Monat</p>
                  <p className="mt-0.5 text-[14px] font-bold text-white">{formatCurrency(calculation.average)}</p>
                </div>
              ) : null}
            </div>

            {calculation.valid ? (
              <div className="mt-4 border-t border-white/10 pt-3">
                <p className="text-[11.5px] text-silver">
                  {calculation.firstYearMonths === 12
                    ? "Kosten in den ersten 12 Monaten"
                    : `Kosten bis Vertragsende (${calculation.firstYearMonths} Monate)`}
                </p>
                <p className="mt-1 text-[16px] font-bold text-platinum">{formatCurrency(calculation.firstYear)}</p>
              </div>
            ) : null}

            <p className="mt-3 text-[11.5px] leading-relaxed text-silver">
              Rechnerischer Kosten-Check ohne einmalige Anschlusskosten, Boni oder Zusatzoptionen. Für einen vollständigen Vergleich prüfen wir den konkreten Vertrag.
            </p>
          </div>

          <Link href={href} className="mt-5 inline-flex items-center gap-2 text-[13.5px] font-bold text-electric-soft hover:text-white">
            Vertrag persönlich prüfen lassen <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </section>
  );
}
