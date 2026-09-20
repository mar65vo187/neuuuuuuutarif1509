import type { Metadata } from "next";
import { JsonLd } from "@/components/security/JsonLd";
import { Hero } from "@/components/home/Hero";
import { FinderTeaser } from "@/components/home/FinderTeaser";
import { TrustEngine } from "@/components/home/TrustEngine";
import { PremiumGuidance } from "@/components/home/PremiumGuidance";
import { DecisionCheck } from "@/components/home/DecisionCheck";
import { SessionIntentCard } from "@/components/home/SessionIntentCard";
import { TopicTicker } from "@/components/home/TopicTicker";
import {
  AudienceEverydaySection,
  AudienceFaqSection,
  AudienceFinalCta,
  AudienceFocusSection,
  AudienceProcess,
  AudienceTrustStrip,
} from "@/components/home/AudienceSections";
import { Founder } from "@/components/home/Sections";
import { AUDIENCE_COPY } from "@/lib/audience-copy";
import { SERVICES, SITE } from "@/lib/content";
import { homeAudienceMetadata } from "@/lib/seo";
import { resolveSiteAudience } from "@/lib/audience-server";

type Props = { searchParams: Promise<{ audience?: string | string[] }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return homeAudienceMetadata(await resolveSiteAudience((await searchParams).audience));
}

export default async function HomePage({ searchParams }: Props) {
  const initialAudience = await resolveSiteAudience((await searchParams).audience);
  const faq = AUDIENCE_COPY[initialAudience].faq.items;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE.url}/#faq`,
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const serviceListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE.url}/#services`,
    name: "TarifWerk Leistungen",
    itemListElement: SERVICES.map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE.url}/leistungen/${service.slug}`,
      name: service.name,
    })),
  };

  return (
    <>
      <JsonLd data={faqJsonLd} />
      <JsonLd data={serviceListJsonLd} />
      <Hero audience={initialAudience} />
      <AudienceTrustStrip audience={initialAudience} />
      <SessionIntentCard audience={initialAudience} />
      <AudienceFocusSection audience={initialAudience} />
      <PremiumGuidance audience={initialAudience} />
      <DecisionCheck audience={initialAudience} />
      <TrustEngine audience={initialAudience} />
      <FinderTeaser audience={initialAudience} />
      <AudienceProcess audience={initialAudience} />
      <AudienceEverydaySection audience={initialAudience} />
      <Founder audience={initialAudience} />
      <TopicTicker />
      <AudienceFaqSection audience={initialAudience} />
      <AudienceFinalCta audience={initialAudience} />
    </>
  );
}
