import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { JsonLd } from "@/components/security/JsonLd";
import { LeadForm } from "@/components/forms/LeadForm";
import { CAMPAIGN_LANDINGS, getCampaignLanding } from "@/lib/campaigns";
import { SITE } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return CAMPAIGN_LANDINGS.map((campaign) => ({ slug: campaign.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const campaign = getCampaignLanding((await params).slug);
  if (!campaign) return { title: "Nicht gefunden", robots: { index: false, follow: false } };
  return pageMetadata(
    `/kampagne/${campaign.slug}`,
    { title: campaign.seoTitle, description: campaign.seoDescription },
    null,
    `/kampagne/${campaign.slug}`,
  );
}

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const campaign = getCampaignLanding((await params).slug);
  if (!campaign) notFound();
  const business = campaign.audience === "b2b";

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: campaign.eyebrow,
    description: campaign.seoDescription,
    url: `${SITE.url}/kampagne/${campaign.slug}`,
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: { "@type": "Country", name: "Deutschland" },
  };

  return (
    <>
      <JsonLd data={serviceJsonLd} />
      <section className="relative overflow-hidden bg-ink pb-16 pt-[112px] text-white grain sm:pb-20 sm:pt-[128px]">
        <div className="absolute inset-0 grid-lines" aria-hidden />
        <div className="pointer-events-none absolute -right-40 top-0 h-[620px] w-[620px] rounded-full bg-electric/18 blur-[150px]" aria-hidden />
        <div className="container-x relative grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <p className="eyebrow text-electric-soft">{campaign.eyebrow}</p>
            <h1 className="mt-5 max-w-4xl text-[clamp(2.7rem,6vw,5.4rem)] font-extrabold leading-[0.96] tracking-[-0.05em]">
              {campaign.title} <span className="display-i font-normal text-champagne-soft">{campaign.emphasis}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-silver">{campaign.intro}</p>
            <ul className="mt-7 grid gap-3 sm:grid-cols-3">
              {campaign.bullets.map((item) => (
                <li key={item} className="flex items-start gap-2 rounded-2xl border border-white/9 bg-white/[0.04] p-3.5 text-[12.5px] leading-relaxed text-platinum">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-electric/15"><Check className="h-3 w-3 text-electric-soft" /></span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 inline-flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.035] px-3.5 py-2.5 text-[12px] leading-relaxed text-silver">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-electric-soft" />
              {business ? "Unverbindliche Bedarfsklärung. Sie entscheiden selbst, ob und wie Sie weitergehen." : "Kostenlose Erstorientierung. Du entscheidest selbst, ob und wie es weitergeht."}
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="glass rounded-[28px] p-6 sm:p-7">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-electric-soft">Was du erwarten kannst</p>
              <div className="mt-4 space-y-3">
                {campaign.proof.map((item, index) => (
                  <div key={item.title} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 text-[11px] font-extrabold text-electric-soft">{String(index + 1).padStart(2, "0")}</span>
                      <div><p className="text-[13.5px] font-extrabold">{item.title}</p><p className="mt-1 text-[12px] leading-relaxed text-silver">{item.text}</p></div>
                    </div>
                  </div>
                ))}
              </div>
              <a href="#anfrage" className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-electric px-5 text-[13.5px] font-extrabold text-white hover:bg-electric-deep">
                {business ? "Business-Anfrage starten" : "Kostenlos prüfen lassen"} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper py-16 sm:py-20" id="anfrage">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow text-electric-deep">Nächster Schritt</p>
            <h2 className="mt-3 text-[clamp(1.9rem,3.4vw,2.8rem)] font-extrabold leading-tight text-ink">
              {business ? "Kurz die Ausgangslage schildern." : "In zwei Schritten zur persönlichen Einschätzung."}
            </h2>
            <p className="mt-4 text-[14.5px] leading-relaxed text-steel">
              {business
                ? "Thema, Unternehmen und Kontaktweg reichen für den Einstieg. Wir melden uns persönlich und klären, welche Informationen danach wirklich nötig sind."
                : "Thema und Situation sind bereits vorausgewählt. Ergänze nur die Angaben, die wir für eine persönliche Rückmeldung brauchen."}
            </p>
            <Link href={`/leistungen/${campaign.serviceKey === "internet" ? "internet-glasfaser-tv" : campaign.serviceKey === "energie" ? "strom-gas" : campaign.serviceKey === "solar" ? "solar-photovoltaik" : campaign.serviceKey}?audience=${campaign.audience}`} className="mt-6 inline-flex items-center gap-2 text-[12.5px] font-bold text-electric-deep hover:underline">
              Leistung im Detail ansehen <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="lg:col-span-8">
            <div className="rounded-[28px] border border-line bg-white p-5 shadow-soft sm:p-8">
              <LeadForm
                type="beratung"
                defaultTopic={campaign.topic}
                defaultSituation={campaign.situation}
                source={`campaign:${campaign.slug}`}
                audience={campaign.audience}
                title={business ? "Business-Anfrage" : "Persönliche Anfrage"}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
