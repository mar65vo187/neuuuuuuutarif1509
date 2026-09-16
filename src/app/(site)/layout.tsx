import { JsonLd } from "@/components/security/JsonLd";
import type { ReactNode } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { QuickContact } from "@/components/site/QuickContact";
import { REGIONS, SITE } from "@/lib/content";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${SITE.url}/#organization`,
  logo: `${SITE.url}/assets/logo-symbol.jpg`,
  image: `${SITE.url}/assets/architecture.webp`,
  name: SITE.name,
  url: SITE.url,
  email: SITE.email,
  telephone: "+49 157 82301076",
  founder: { "@type": "Person", name: SITE.founder, jobTitle: SITE.founderTitle },
  address: { "@type": "PostalAddress", addressLocality: SITE.hq, addressCountry: "DE" },
  areaServed: [
    ...REGIONS.filter((r) => !r.startsWith("Deutschlandweit")).map((r) => ({ "@type": "City", name: r as string })),
    { "@type": "Country", name: "Deutschland" },
  ],
  openingHours: "Mo-Su 08:00-22:00",
  priceRange: "Kostenlose Erstberatung",
  description:
    "Persönliche, unabhängige Beratung zu Immobilien, Edelmetallen, Solar, Wärmepumpe, Internet, Mobilfunk, Strom, Gas und Versicherungen.",
  knowsAbout: ["Immobilien", "Edelmetalle", "Photovoltaik", "Wärmepumpe", "Glasfaser", "Mobilfunk", "Strom", "Gas", "Versicherungen"],
};

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [organizationJsonLd, { "@type": "WebSite", "@id": `${SITE.url}/#website`, url: `${SITE.url}/`, name: SITE.name, inLanguage: "de-DE", publisher: { "@id": `${SITE.url}/#organization` } }] }} />
      <Header />
      <main id="main" className="pb-[68px] md:pb-0">
        {children}
      </main>
      <Footer />
      <QuickContact />
    </>
  );
}
