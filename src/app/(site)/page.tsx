import type { Metadata } from "next";
import { JsonLd } from "@/components/security/JsonLd";
import { Hero } from "@/components/home/Hero";
import { AudienceProvider } from "@/components/home/AudienceProvider";
import { FinderTeaser } from "@/components/home/FinderTeaser";
import { TrustEngine } from "@/components/home/TrustEngine";
import { PremiumGuidance } from "@/components/home/PremiumGuidance";
import { DecisionCheck } from "@/components/home/DecisionCheck";
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
      <AudienceProvider initialAudience={initialAudience}>
        <Hero />
        <AudienceTrustStrip />
        <AudienceFocusSection />
        <PremiumGuidance />
        <DecisionCheck />
        <TrustEngine />
        <FinderTeaser />
        <AudienceProcess />
        <AudienceEverydaySection />
        <Founder />
        <TopicTicker />
        <AudienceFaqSection />
        <AudienceFinalCta />
      </AudienceProvider>
    </>
  );
}
