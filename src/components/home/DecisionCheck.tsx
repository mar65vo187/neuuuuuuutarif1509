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

export function DecisionCheck({ audience }: { audience: AudienceMode }) {
  const business = audience === "b2b";
  const [monthly, setMonthly] = useState("");
  const annual = useMemo(() => {
    const parsed = Number(monthly.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed * 12 : 0;
  }, [monthly]);

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
              <h3 className="mt-1 text-[19px] font-extrabold">{business ? "Was kostet Ihr Vertrag im Jahr?" : "Was kostet dein Vertrag im Jahr?"}</h3>
            </div>
          </div>
          <p className="mt-5 text-[13.5px] leading-relaxed text-silver">
            {business ? "Geben Sie Ihre ungefähren monatlichen Vertragskosten ein." : "Gib deine ungefähren monatlichen Vertragskosten ein."} Wir zeigen nur die aktuelle Jahresbelastung – keine erfundene Ersparnis.
          </p>
          <label className="mt-6 block">
            <span className="text-[12.5px] font-semibold text-platinum">Monatliche Kosten in €</span>
            <input
              inputMode="decimal"
              value={monthly}
              onChange={(event) => setMonthly(event.target.value.slice(0, 12))}
              placeholder="z. B. 89,90"
              className="field-dark mt-2"
              aria-label="Monatliche Vertragskosten"
            />
          </label>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <p className="text-[11.5px] text-silver">Aktuelle Jahresbelastung</p>
            <p className="mt-1 text-[28px] font-extrabold tracking-tight">
              {annual > 0 ? annual.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "–"}
            </p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-silver">
              Ob sich ein Wechsel oder eine Anpassung lohnt, hängt vom konkreten Vertrag und den verfügbaren Optionen ab.
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
