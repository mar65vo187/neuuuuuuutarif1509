import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { LeadForm } from "@/components/forms/LeadForm";
import { getMarketingCampaign, MARKETING_CAMPAIGNS } from "@/lib/marketing-campaigns";
import { SITE } from "@/lib/content";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return MARKETING_CAMPAIGNS.map((campaign) => ({ slug: campaign.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const campaign = getMarketingCampaign((await params).slug);
  if (!campaign) return { title: "Nicht gefunden", robots: { index: false, follow: false } };
  return {
    title: { absolute: `${campaign.title} | TarifWerk` },
    description: campaign.text,
    robots: { index: false, follow: false },
    alternates: { canonical: SITE.url },
  };
}

export default async function CampaignPage({ params }: Props) {
  const campaign = getMarketingCampaign((await params).slug);
  if (!campaign) notFound();
  const business = campaign.audience === "b2b";

  return (
    <main className="min-h-screen bg-ink text-white">
      <header className="border-b border-white/8 bg-ink/95">
        <div className="container-x flex h-[72px] items-center justify-between">
          <Logo size={34} />
          <a href={SITE.phoneHref} className="rounded-full border border-white/12 px-4 py-2 text-[12.5px] font-bold text-platinum hover:bg-white/8">
            {business ? "Direkter Kontakt" : "Frage? Direkt anrufen"}
          </a>
        </div>
      </header>

      <section className="relative overflow-hidden grain">
        <div className="absolute inset-0 grid-lines" aria-hidden />
        <div className="pointer-events-none absolute left-[15%] top-[-15%] h-[620px] w-[620px] rounded-full bg-electric/20 blur-[150px]" aria-hidden />
        <div className="container-x relative grid gap-10 py-14 lg:grid-cols-12 lg:items-start lg:py-20">
          <div className="lg:col-span-6 lg:pt-6">
            <p className="eyebrow text-electric-soft">{campaign.eyebrow}</p>
            <h1 className="mt-5 text-[clamp(2.7rem,6vw,5.4rem)] font-extrabold leading-[0.96] tracking-[-0.05em]">
              {campaign.title}
              <br />
              <span className="display-i font-normal text-champagne-soft">{campaign.emphasis}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-[16.5px] leading-relaxed text-silver">{campaign.text}</p>

            <ul className="mt-7 grid gap-3">
              {campaign.points.map((point) => (
                <li key={point} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-[13.5px] text-platinum">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-electric-soft" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
            <p className="mt-5 inline-flex items-center gap-2 text-[12.5px] text-silver"><ShieldCheck className="h-4 w-4 text-electric-soft" />{campaign.reassurance}</p>
          </div>

          <div className="lg:col-span-6">
            <div className="glass rounded-[28px] p-6 shadow-soft sm:p-8">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-electric-soft">{campaign.cta}</p>
              <h2 className="mt-2 text-[24px] font-extrabold">{business ? "Ausgangslage in zwei Schritten senden." : "Situation in zwei Schritten senden."}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-silver">{business ? "Nur die Informationen, die für eine erste Einordnung wirklich nötig sind." : "Kein langer Fragebogen. Für den ersten Schritt reichen Thema, Situation und Kontaktweg."}</p>
              <div className="mt-6">
                <LeadForm
                  type="beratung"
                  tone="dark"
                  audience={campaign.audience}
                  defaultTopic={campaign.topic}
                  defaultSituation={campaign.situation}
                  source={`kampagne:${campaign.slug}`}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/8 bg-[#07111f] py-14">
        <div className="container-x">
          <div className="max-w-2xl">
            <p className="eyebrow text-electric-soft">TarifWerk-Prinzip</p>
            <h2 className="mt-3 text-[clamp(1.7rem,3.4vw,2.6rem)] font-extrabold">{campaign.proofTitle}</h2>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {campaign.proofItems.map((item) => (
              <article key={item.title} className="rounded-[22px] border border-white/8 bg-white/[0.035] p-5">
                <h3 className="text-[15px] font-extrabold">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-silver">{item.text}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/8 pt-6 text-[11.5px] text-steel">
            <p>© TarifWerk · Beratung auf Augenhöhe</p>
            <div className="flex gap-4">
              <Link href="/datenschutz" className="hover:text-white">Datenschutz</Link>
              <Link href="/impressum" className="hover:text-white">Impressum</Link>
              <Link href="/" className="inline-flex items-center gap-1 hover:text-white">Website <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
