import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { ArrowRight, BadgeEuro, Car, CheckCircle2, Dumbbell, Gift, GraduationCap, Infinity, PiggyBank, Plane, ShieldCheck, UsersRound } from "lucide-react";
import { db } from "@/db";
import { referrers } from "@/db/referral-schema";
import { ReferralRegistration } from "@/components/referrals/ReferralPanel";
import { ReferralPipeline, ReferralRewardMatrix } from "@/components/referrals/ReferralRewards";
import { PageHero } from "@/components/site/PageHero";
import { REFERRAL_CODE } from "@/lib/referrals";
import { REFERRAL_MAX_VOUCHER, formatEuro } from "@/lib/referral-rewards";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata("/freund-werben");

export default async function ReferralPage({ searchParams }: { searchParams: Promise<{ ref?: string | string[] }> }) {
  const { ref } = await searchParams;
  const code = Array.isArray(ref) ? ref[0] : ref;
  let validCode: string | null = null;

  if (code && REFERRAL_CODE.test(code)) {
    try {
      const [row] = await db.select({ code: referrers.code }).from(referrers)
        .where(and(eq(referrers.code, code), eq(referrers.active, true))).limit(1);
      validCode = row?.code ?? null;
    } catch {
      // A general inquiry remains available during a referral-service outage.
    }
  }

  if (validCode) {
    return <>
      <PageHero
        eyebrow="Persönlich empfohlen"
        title={<>Jemand findet, TarifWerk könnte <span className="display-i font-normal text-champagne-soft">zu dir passen.</span></>}
        text="Deine Entscheidung bleibt bei dir. Wir hören zu, prüfen deine Möglichkeiten und erklären verständlich, welche nächsten Schritte zu deiner Situation passen."
        compact
      />
      <section className="bg-paper py-16 sm:py-20">
        <div className="container-x">
          <div className="mx-auto max-w-3xl rounded-[26px] border border-line bg-white p-6 shadow-soft sm:p-9">
            <p className="eyebrow text-electric-deep">Kostenlose Erstorientierung</p>
            <h2 className="mt-3 text-[26px] font-extrabold text-ink">Wobei können wir dir helfen?</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-steel">
              Von Internet und Energie bis zu Solar, Versicherungen, Immobilien und weiteren Entscheidungen: Sag uns, was dich beschäftigt.
              Wenn du der Zuordnung zustimmst, wird lediglich erfasst, dass deine Anfrage über diesen Empfehlungslink kam.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["Unverbindlich", "Du entscheidest in Ruhe."],
                ["Persönlich", "Ein Mensch meldet sich."],
                ["Privat", "Keine Vertragsdaten an den Empfehlenden."],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl bg-paper p-4">
                  <p className="font-bold text-ink">{title}</p>
                  <p className="mt-1 text-[12.5px] text-steel">{text}</p>
                </div>
              ))}
            </div>
            <Link href={`/anfrage?ref=${validCode}`} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-6 py-3 font-semibold text-white hover:bg-electric">
              Kostenlose Einschätzung anfragen <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>;
  }

  return <>
    <PageHero
      eyebrow="TarifWerk Empfehlungsprogramm"
      title={<>Gute Beratung empfehlen. <span className="display-i font-normal text-champagne-soft">Bis zu {formatEuro(REFERRAL_MAX_VOUCHER)} erhalten.</span></>}
      text="Erstelle deinen persönlichen Empfehlungslink, teile ihn mit Menschen, für die TarifWerk hilfreich sein könnte, und behalte deine Empfehlungen und Prämien transparent im Blick."
      compact
    />

    <section className="bg-paper py-14 sm:py-16">
      <div className="container-x grid gap-10 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-5">
          <p className="eyebrow text-electric-deep">Einfach weiterempfehlen</p>
          <h2 className="mt-3 text-[clamp(1.8rem,3.2vw,2.5rem)] font-extrabold leading-tight text-ink">Dein Link. Deine Empfehlungen. Dein Status.</h2>
          <ol className="mt-6 space-y-5 text-[15px] leading-relaxed text-steel">
            <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">01</span><span><strong className="text-ink">Link erstellen.</strong> Du erhältst einen persönlichen Link zum Teilen und einen privaten Status-Link.</span></li>
            <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">02</span><span><strong className="text-ink">Persönlich weitergeben.</strong> Die empfohlene Person entscheidet selbst, ob sie Kontakt zu TarifWerk aufnimmt.</span></li>
            <li className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">03</span><span><strong className="text-ink">Status verfolgen.</strong> Du siehst anonymisiert, ob Empfehlungen erfasst, qualifiziert, abgeschlossen, freigegeben oder ausgezahlt wurden.</span></li>
          </ol>

          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-2xl border border-line bg-white p-4"><Gift className="h-5 w-5 text-electric-deep" /><p className="mt-2 font-bold text-ink">Bis 1.000 €</p><p className="text-[12px] text-steel">Wunschgutschein je nach Bereich</p></div>
            <div className="rounded-2xl border border-line bg-white p-4"><Infinity className="h-5 w-5 text-electric-deep" /><p className="mt-2 font-bold text-ink">Kein Limit</p><p className="text-[12px] text-steel">Mehrere Empfehlungen erlaubt</p></div>
            <div className="rounded-2xl border border-line bg-white p-4"><ShieldCheck className="h-5 w-5 text-electric-deep" /><p className="mt-2 font-bold text-ink">Transparent</p><p className="text-[12px] text-steel">Freigabe erst nach Prüfung</p></div>
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-white p-5 text-[13.5px] leading-relaxed text-steel">
            <strong className="text-ink">Du wählst im Erfolgsfall:</strong> bestätigten Wunschgutschein in voller Höhe oder alternativ eine Geld-Auszahlung in Höhe von 50 % des bestätigten Gutscheinwerts.
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="rounded-[26px] border border-line bg-white p-6 shadow-soft sm:p-9">
            {code && <p className="mb-5 rounded-xl bg-paper p-4 text-[14px] text-steel">Dieser Empfehlungslink ist gerade nicht verfügbar. Du kannst hier einen eigenen Link erstellen oder <Link href="/anfrage" className="underline">eine allgemeine Anfrage stellen</Link>.</p>}
            <ReferralRegistration />
          </div>
        </div>
      </div>
    </section>

    <ReferralRewardMatrix />

    <section className="bg-ink py-16 text-white sm:py-20">
      <div className="container-x">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow justify-center text-electric-soft">Beispiele</p>
          <h2 className="mt-3 text-[clamp(1.9rem,3.8vw,3rem)] font-extrabold">Was mehrere erfolgreiche Empfehlungen bedeuten können.</h2>
          <p className="mt-4 text-[13.5px] leading-relaxed text-silver">Rechenbeispiele auf Basis der veröffentlichten Maximalwerte – keine Garantie für den jeweiligen Maximalbetrag.</p>
        </div>
        <div className="mx-auto mt-8 grid max-w-4xl gap-3 md:grid-cols-3">
          {[
            ["2 × Internet", "bis 100 €", "oder bis 50 € Geld"],
            ["1 × Solar + 2 × Internet", "bis 600 €", "oder bis 300 € Geld"],
            ["1 × Immobilien + 1 × Solar", "bis 1.500 €", "oder bis 750 € Geld"],
          ].map(([label, total, cash]) => (
            <div key={label} className="glass rounded-2xl p-5 text-left">
              <CheckCircle2 className="h-5 w-5 text-electric-soft" />
              <p className="mt-4 text-[14px] font-semibold text-silver">{label}</p>
              <p className="mt-1 text-[27px] font-extrabold">{total}</p>
              <p className="mt-1 text-[12.5px] text-silver">{cash}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="bg-paper py-16 sm:py-20">
      <div className="container-x">
        <div className="rounded-[28px] border border-line bg-white p-6 shadow-soft sm:p-9">
          <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
            <div>
              <p className="eyebrow text-electric-deep">TarifWerk als Team</p>
              <h2 className="mt-3 text-[clamp(1.8rem,3.4vw,2.7rem)] font-extrabold leading-tight text-ink">Du kennst jemanden, der nicht nur empfehlen, sondern <span className="display-i font-normal text-electric-deep">mit aufbauen</span> möchte?</h2>
              <p className="mt-4 text-[14.5px] leading-relaxed text-steel">Wir suchen Menschen, die seriös beraten, Verantwortung übernehmen und sich entwickeln möchten. Leistung soll attraktiv vergütet werden – ohne Druckverkauf und ohne undurchsichtige Strukturen.</p>
              <Link href="/karriere" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-electric">Karriere & Benefits ansehen <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [BadgeEuro, "Attraktive Provisionen"],
                [UsersRound, "Fairer Teamaufbau"],
                [GraduationCap, "Schulungen & Coaching"],
                [Plane, "Reisen & Team-Events"],
                [Car, "Mobilität / Firmenfahrzeug"],
                [PiggyBank, "Langfristige Vorsorge"],
                [Dumbbell, "Wellpass & Gesundheit"],
              ].map(([Icon, label]) => {
                const BenefitIcon = Icon as typeof BadgeEuro;
                return <div key={String(label)} className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-electric-deep"><BenefitIcon className="h-4.5 w-4.5" /></span><p className="text-[12.5px] font-bold text-ink">{String(label)}</p></div>;
              })}
            </div>
          </div>
          <p className="mt-6 border-t border-line pt-5 text-[11.5px] leading-relaxed text-steel">Benefits richten sich nach Rolle, Stufe, Kooperations-/Beschäftigungsmodell, Zielerreichung und Verfügbarkeit. Konkrete Konditionen werden im persönlichen Gespräch transparent festgehalten.</p>
        </div>
      </div>
    </section>

    <ReferralPipeline />
  </>;
}
