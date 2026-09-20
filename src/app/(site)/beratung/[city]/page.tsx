import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, FileSearch, MapPin } from "lucide-react";
import { JsonLd } from "@/components/security/JsonLd";
import { Button } from "@/components/ui/Button";
import { PageHero } from "@/components/site/PageHero";
import { SERVICES, SITE } from "@/lib/content";
import { LOCAL_PAGES, LOCAL_PAGE_LIST } from "@/lib/local-pages";
import { shortenSeoText } from "@/lib/seo";
import { resolveSiteAudience } from "@/lib/audience-server";
import { SERVICE_AUDIENCE_COPY } from "@/lib/audience-copy";

type Props = { params: Promise<{ city: string }>; searchParams: Promise<{ audience?: string | string[] }> };

export function generateStaticParams() {
  return LOCAL_PAGE_LIST.map((page) => ({ city: page.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const page = LOCAL_PAGES[city];
  if (!page) return {};
  const title = shortenSeoText(`Beratung ${page.city}: Strom, Internet & mehr | TarifWerk`, 59);
  const description = shortenSeoText(page.description, 154);
  const url = `${SITE.url}/beratung/${page.slug}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", locale: "de_DE", siteName: SITE.name, title, description, url, images: [{ url: `${SITE.url}/opengraph-image`, width: 1200, height: 630, alt: `TarifWerk Beratung in ${page.city}` }] },
    twitter: { card: "summary_large_image", title, description, images: [`${SITE.url}/opengraph-image`] },
  };
}

export default async function LocalConsultingPage({ params, searchParams }: Props) {
  const { city } = await params;
  const audience = await resolveSiteAudience((await searchParams).audience);
  const business = audience === "b2b";
  const page = LOCAL_PAGES[city];
  if (!page) notFound();

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `TarifWerk Beratung in ${page.city}`,
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: { "@type": "City", name: page.city },
    serviceType: "Persönliche Beratung zu Tarifen, Energie, Versicherungen und weiteren Vertrags- und Versorgungsthemen",
    url: `${SITE.url}/beratung/${page.slug}`,
  };

  const primary = SERVICES.filter((service) => ["energie", "internet", "versicherungen"].includes(service.key));

  return (
    <>
      <JsonLd data={serviceJsonLd} />
      <PageHero
        eyebrow={page.eyebrow}
        title={<>{page.title}</>}
        text={page.intro}
        compact
      />

      <section className="bg-paper py-16 sm:py-20">
        <div className="container-x grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-7">
            <p className="eyebrow text-electric-deep">Vor Ort verwurzelt. Digital flexibel.</p>
            <h2 className="mt-3 text-[clamp(1.9rem,3.6vw,2.9rem)] font-extrabold leading-[1.04] text-ink">
              {business ? "Beratung beginnt mit Ihrer Ausgangslage – nicht mit einem Produkt." : "Beratung beginnt mit deiner Situation – nicht mit einem Produkt."}
            </h2>
            <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-steel">{page.localText}</p>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-line bg-white p-5 text-[13.5px] leading-relaxed text-steel">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-electric-deep" aria-hidden="true" />
              <span>{page.contactText}</span>
            </div>
          </div>
          <aside className="rounded-[24px] border border-line bg-white p-6 shadow-soft lg:col-span-5">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-electric-deep">Kostenlos starten</p>
            <h2 className="mt-3 text-[22px] font-extrabold text-ink">{business ? "Was möchten Sie prüfen?" : "Was möchtest du prüfen?"}</h2>
            <ul className="mt-5 space-y-3 text-[14px] text-steel">
              {[
                "Bestehenden Vertrag einordnen",
                "Vorliegendes Angebot als zweite Meinung prüfen",
                "Möglichkeiten und nächste Schritte verstehen",
              ].map((item) => <li key={item} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-electric-deep" aria-hidden="true" />{item}</li>)}
            </ul>
            <Button href={`/anfrage?region=${encodeURIComponent(page.city)}&audience=${audience}`} size="lg" className="mt-6 w-full" iconRight={<ArrowRight />}>
              Kostenlose Einschätzung anfragen
            </Button>
            <Link href={`/anfrage?region=${encodeURIComponent(page.city)}&situation=vergleich&audience=${audience}`} className="mt-3 flex items-center justify-center gap-2 text-[13px] font-semibold text-electric-deep hover:underline">
              <FileSearch className="h-4 w-4" aria-hidden="true" /> Zweite Meinung einholen
            </Link>
          </aside>
        </div>
      </section>

      <section className="bg-paper-2 py-16 sm:py-20">
        <div className="container-x">
          <p className="eyebrow text-electric-deep">Häufige Einstiegsthemen in {page.city}</p>
          <h2 className="mt-3 text-[clamp(1.8rem,3.4vw,2.7rem)] font-extrabold text-ink">{business ? "Drei Themen, mit denen Sie direkt starten können." : "Drei Themen, mit denen du direkt starten kannst."}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {primary.map((service) => (
              <Link key={service.key} href={`/leistungen/${service.slug}`} className="card-hover rounded-[22px] border border-line bg-white p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-electric-deep">{service.eyebrow}</p>
                <h3 className="mt-3 text-[19px] font-extrabold text-ink">{service.name}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-steel">{SERVICE_AUDIENCE_COPY[audience][service.key] ?? service.intro}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-electric-deep">Mehr erfahren <ArrowRight className="h-4 w-4" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
