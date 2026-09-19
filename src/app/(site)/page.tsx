import type { Metadata } from "next";
import { JsonLd } from "@/components/security/JsonLd";
import { Hero } from "@/components/home/Hero";
import { AudienceProvider, type AudienceMode } from "@/components/home/AudienceProvider";
import { FinderTeaser } from "@/components/home/FinderTeaser";
import { PremiumGuidance } from "@/components/home/PremiumGuidance";
import { TrustEngine } from "@/components/home/TrustEngine";
import { TopicTicker } from "@/components/home/TopicTicker";
import {
  AudienceEverydaySection,
  AudienceFaqSection,
  AudienceFinalCta,
  AudienceFocusSection,
  AudienceManifesto,
  AudienceProcess,
  AudienceTrustStrip,
} from "@/components/home/AudienceSections";
import { Founder } from "@/components/home/Sections";
import { ReferralHomeTeaser } from "@/components/referrals/ReferralRewards";
import { AUDIENCE_COPY } from "@/lib/audience-copy";
import { SERVICES, SITE } from "@/lib/content";
import { homeAudienceMetadata } from "@/lib/seo";

type Props = { searchParams: Promise<{ audience?: string | string[] }> };

function resolveAudience(raw: string | string[] | undefined): AudienceMode {
  return (Array.isArray(raw) ? raw[0] : raw) === "b2b" ? "b2b" : "b2c";
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return homeAudienceMetadata(resolveAudience((await searchParams).audience));
}

export default async function HomePage({ searchParams }: Props) {
  const initialAudience = resolveAudience((await searchParams).audience);
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
        <TopicTicker />
        <AudienceFocusSection />
        <AudienceEverydaySection />
        <TrustEngine />
        <PremiumGuidance />
        <FinderTeaser />
        <AudienceProcess />
        <AudienceManifesto />
        <Founder />
        <ReferralHomeTeaser />
        <AudienceFaqSection />
        <AudienceFinalCta />
      </AudienceProvider>
    </>
  );
}
