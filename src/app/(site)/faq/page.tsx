import { JsonLd } from "@/components/security/JsonLd";
import { pageMetadata } from "@/lib/seo";
import { Accordion } from "@/components/ui/Accordion";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { FinalCta } from "@/components/home/Sections";
import { SERVICES } from "@/lib/content";
import { AUDIENCE_COPY, serviceFaqForAudience } from "@/lib/audience-copy";
import { resolveSiteAudience } from "@/lib/audience-server";

export const metadata = pageMetadata("/faq");

export default async function FaqPage({ searchParams }: { searchParams: Promise<{ audience?: string | string[] }> }) {
  const audience = await resolveSiteAudience((await searchParams).audience);
  const FAQ = AUDIENCE_COPY[audience].faq.items;
  const serviceFaq = SERVICES.flatMap((s) => serviceFaqForAudience([...s.faq], audience).map((f) => ({ q: `${s.name}: ${f.q}`, a: f.a })));
  const all = [...FAQ, ...serviceFaq];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: all.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <>
      <JsonLd data={jsonLd} />
      <PageHero eyebrow="FAQ" title={<>Ehrliche Antworten <span className="display-i font-normal text-champagne-soft">vor</span> dem ersten Gespräch.</>} compact />
      <section className="bg-paper py-16 sm:py-20">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <h2 className="text-[22px] font-extrabold text-ink">Allgemein</h2>
            <p className="mt-2 text-[15px] text-steel">Kosten, Ablauf, Unabhängigkeit, Daten.</p>
          </Reveal>
          <Reveal className="lg:col-span-8"><Accordion items={FAQ} /></Reveal>
        </div>
        <div className="container-x mt-20 grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <h2 className="text-[22px] font-extrabold text-ink">Zu den Themen</h2>
            <p className="mt-2 text-[15px] text-steel">{audience === "b2b" ? "Fragen, die Unternehmen zu einzelnen Bereichen häufig stellen." : "Fragen, die uns Privatkunden zu einzelnen Bereichen häufig stellen."}</p>
          </Reveal>
          <Reveal className="lg:col-span-8">
            <Accordion items={SERVICES.flatMap((s) => serviceFaqForAudience([...s.faq], audience).map((f) => ({ q: `${s.name} – ${f.q}`, a: f.a })))} />
          </Reveal>
        </div>
      </section>
      <FinalCta audience={audience} />
    </>
  );
}
