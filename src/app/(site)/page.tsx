import type { Metadata } from "next";
import { JsonLd } from "@/components/security/JsonLd";
import { Hero } from "@/components/home/Hero";
import { DecisionCheck } from "@/components/home/DecisionCheck";
import { SessionIntentCard } from "@/components/home/SessionIntentCard";
import { BrandIdentitySection } from "@/components/home/BrandIdentitySection";
import { OptimizationMembershipTeaser } from "@/components/home/OptimizationMembershipTeaser";
import {
  AudienceEverydaySection,
  AudienceFaqSection,
  AudienceFinalCta,
  AudienceFocusSection,
  AudienceProcess,
  AudienceTrustStrip,
} from "@/components/home/AudienceSections";
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
      {/* Gutachten 2026-09-29 (UX-01): kurze Reihenfolge – Versprechen, Ablauf, Einstiege, Belege, FAQ, Anfrage. */}
      <Hero audience={initialAudience} />
      <SessionIntentCard audience={initialAudience} />
      <AudienceProcess audience={initialAudience} />
      <AudienceTrustStrip audience={initialAudience} />
      <AudienceFocusSection audience={initialAudience} />
      <AudienceEverydaySection audience={initialAudience} />
      <DecisionCheck audience={initialAudience} />
      <BrandIdentitySection audience={initialAudience} />
      <OptimizationMembershipTeaser audience={initialAudience} />
      <AudienceFaqSection audience={initialAudience} />
      <AudienceFinalCta audience={initialAudience} />
    </>
  );
}
