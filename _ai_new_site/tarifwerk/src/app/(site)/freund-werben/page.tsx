import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { referrers } from "@/db/referral-schema";
import { PageHero } from "@/components/site/PageHero";
import { ReferralRegistration } from "@/components/referrals/ReferralPanel";
import { REFERRAL_CODE, referralBenefits } from "@/lib/referrals";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Freunde werben – gute Beratung weiterempfehlen", description: "Empfiehl TarifWerk mit deinem persönlichen Link. Deine Freunde entscheiden selbst; du behältst deine Empfehlungen im Blick.", alternates: { canonical: "/freund-werben" } };
export default async function ReferralPage({ searchParams }: { searchParams: Promise<{ ref?: string | string[] }> }) {
  const { ref } = await searchParams;
  const code = Array.isArray(ref) ? ref[0] : ref;
  let validCode: string | null = null;
  if (code && REFERRAL_CODE.test(code)) {
    try { const [row] = await db.select({ code: referrers.code }).from(referrers).where(and(eq(referrers.code, code), eq(referrers.active, true))).limit(1); validCode = row?.code ?? null; } catch { /* A general inquiry remains available during a referral-service outage. */ }
  }
  const benefit = referralBenefits();
  return <>
    <PageHero eyebrow="Freunde werben" title={<>Gute Beratung darf man <span className="display-i font-normal text-champagne-soft">weitergeben.</span></>} text={validCode ? "Jemand hat dir TarifWerk empfohlen. Wir hören zu, prüfen deine Möglichkeiten und erklären dir, was zu deiner Situation passt." : "Du kennst jemanden, der bei Verträgen oder größeren Entscheidungen Unterstützung sucht? Gib ihm einen direkten Weg zu einer persönlichen Einschätzung."} compact />
    <section className="bg-paper py-16 sm:py-20"><div className="container-x grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <h2 className="text-[24px] font-extrabold text-ink">Eine Empfehlung. Deine Entscheidung.</h2>
        <ol className="mt-6 space-y-5 text-[15px] leading-relaxed text-steel">
          <li><strong className="text-ink">1. Link erstellen.</strong> Du bekommst einen Link zum Teilen und einen privaten Link für deinen Status.</li>
          <li><strong className="text-ink">2. Persönlich weitergeben.</strong> Teile ihn mit Menschen, für die unsere Beratung hilfreich sein könnte.</li>
          <li><strong className="text-ink">3. Selbst entscheiden lassen.</strong> Dein Kontakt meldet sich aus eigenem Interesse. Das Erstgespräch ist kostenlos und unverbindlich.</li>
        </ol>
        {(benefit.friend || benefit.referrer) ? <div className="mt-8 rounded-2xl border border-line bg-white p-5 text-[15px] text-steel">{benefit.friend && <p><strong className="text-ink">Für deinen Kontakt:</strong> {benefit.friend}</p>}{benefit.referrer && <p className="mt-3"><strong className="text-ink">Für dich:</strong> {benefit.referrer}</p>}</div> : <p className="mt-8 text-[14px] leading-relaxed text-steel">Aktuell versprechen wir keine pauschalen Rabatte oder Geldprämien. Falls für ein Angebot besondere Vorteile gelten, erklären wir Voraussetzungen und Umfang vor einem Abschluss.</p>}
      </div>
      <div className="lg:col-span-7"><div className="rounded-[26px] border border-line bg-white p-6 shadow-soft sm:p-9">
        {validCode ? <div className="space-y-5"><h2 className="text-[24px] font-extrabold text-ink">Wobei können wir dir helfen?</h2><p className="text-[15px] leading-relaxed text-steel">Von Internet und Energie bis zu Solar, Immobilien und weiteren Entscheidungen: Sag uns, was dich beschäftigt. Du bestimmst, ob deine Anfrage der Empfehlung zugeordnet wird.</p><Link href={`/anfrage?ref=${validCode}`} className="inline-flex min-h-12 items-center rounded-full bg-ink px-6 py-3 font-semibold text-white hover:bg-electric">Kostenlose Einschätzung anfragen</Link><p className="text-[14px] text-steel">Deine Vertrags- und Kontaktdaten werden nicht an die empfehlende Person weitergegeben.</p></div> : <>{code && <p className="mb-5 text-[14px] text-steel">Dieser Empfehlungslink ist gerade nicht verfügbar. Du kannst trotzdem <Link href="/anfrage" className="underline">eine allgemeine Anfrage stellen</Link>.</p>}<ReferralRegistration /></>}
      </div></div>
    </div></section>
  </>;
}
