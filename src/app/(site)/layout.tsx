import { JsonLd } from "@/components/security/JsonLd";
import type { ReactNode } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { QuickContact } from "@/components/site/QuickContact";
import { REGIONS, SITE } from "@/lib/content";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": ["Organization", "ProfessionalService"],
  "@id": `${SITE.url}/#organization`,
  name: SITE.name,
  alternateName: ["TarifWerk Wiesbaden", "Tarif Werk"],
  url: `${SITE.url}/`,
  logo: {
    "@type": "ImageObject",
    url: `${SITE.url}/assets/logo-symbol.jpg`,
  },
  image: `${SITE.url}/assets/architecture.webp`,
  email: SITE.email,
  telephone: "+49 157 82301076",
  founder: { "@type": "Person", name: SITE.founder, jobTitle: SITE.founderTitle },
  address: { "@type": "PostalAddress", addressLocality: SITE.hq, addressRegion: "Hessen", addressCountry: "DE" },
  areaServed: [
    ...REGIONS.filter((r) => !r.startsWith("Deutschlandweit")).map((r) => ({ "@type": "City", name: r as string })),
    { "@type": "Country", name: "Deutschland" },
  ],
  openingHours: "Mo-Su 08:00-22:00",
  priceRange: "Kostenlose Erstberatung",
  slogan: SITE.claim,
  description:
    "TarifWerk aus Wiesbaden bietet persönliche Beratung zu Internet, Mobilfunk, Strom, Gas, Solar, Photovoltaik, Wärmepumpe, Versicherungen, Immobilien, Edelmetallen, Klimaanlagen und Sicherheitslösungen – digital deutschlandweit.",
  knowsAbout: ["Internet", "Glasfaser", "Mobilfunk", "TV", "Strom", "Gas", "Photovoltaik", "Solar", "Wärmepumpe", "Versicherungen", "Immobilien", "Edelmetalle", "Klimaanlagen", "Sicherheitslösungen"],
};

const websiteJsonLd = {
  "@type": "WebSite",
  "@id": `${SITE.url}/#website`,
  url: `${SITE.url}/`,
  name: SITE.name,
  alternateName: "TarifWerk Wiesbaden",
  inLanguage: "de-DE",
  publisher: { "@id": `${SITE.url}/#organization` },
};

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [organizationJsonLd, websiteJsonLd] }} />
      <Header />
      <main id="main" className="pb-[68px] md:pb-0">
        {children}
      </main>
      <Footer />
      <QuickContact />
    </>
  );
}
