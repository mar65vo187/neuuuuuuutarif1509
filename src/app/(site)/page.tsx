import { pageMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/security/JsonLd";
import { Hero } from "@/components/home/Hero";
import { AudienceProvider, type AudienceMode } from "@/components/home/AudienceProvider";
import { FinderTeaser } from "@/components/home/FinderTeaser";
import { TopicTicker } from "@/components/home/TopicTicker";
import {
  AudienceEverydaySection,
  AudienceFaqSection,
  AudienceFinalCta,
  AudienceFocusSection,
  AudienceManifesto,
  AudienceProcess,
  AudienceProofSection,
  AudienceTrustStrip,
} from "@/components/home/AudienceSections";
import { Founder } from "@/components/home/Sections";
import { FAQ } from "@/lib/content";

export const metadata = pageMetadata("/");

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.slice(0, 5).map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default async function HomePage({ searchParams }: { searchParams: Promise<{ audience?: string | string[] }> }) {
  const rawAudience = (await searchParams).audience;
  const initialAudience: AudienceMode = (Array.isArray(rawAudience) ? rawAudience[0] : rawAudience) === "b2b" ? "b2b" : "b2c";

  return (
    <>
      <JsonLd data={faqJsonLd} />
      <AudienceProvider initialAudience={initialAudience}>
        <Hero />
        <AudienceTrustStrip />
        <TopicTicker />
        <AudienceFocusSection />
        <AudienceEverydaySection />
        <AudienceManifesto />
        <AudienceProofSection />
        <FinderTeaser />
        <AudienceProcess />
        <Founder />
        <AudienceFaqSection />
        <AudienceFinalCta />
      </AudienceProvider>
    </>
  );
}
