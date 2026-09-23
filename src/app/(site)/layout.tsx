import { JsonLd } from "@/components/security/JsonLd";
import type { ReactNode } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { QuickContact } from "@/components/site/QuickContact";
import { PublicAiChat } from "@/components/site/PublicAiChat";
import { JourneyContext } from "@/components/site/JourneyContext";
import { REGIONS, SERVICES, SITE } from "@/lib/content";
import { resolveSiteAudience } from "@/lib/audience-server";
import { publicBusinessPostalAddress } from "@/lib/business-identity";

function organizationJsonLd() {
  const businessAddress = publicBusinessPostalAddress();
  return {
  "@context": "https://schema.org",
  "@type": ["Organization", "ProfessionalService"],
  "@id": `${SITE.url}/#organization`,
  name: SITE.name,
  alternateName: ["TarifWerk.eu", "Tarif Werk"],
  url: `${SITE.url}/`,
  logo: {
    "@type": "ImageObject",
    url: `${SITE.url}/favicon.svg`,
    contentUrl: `${SITE.url}/favicon.svg`,
    width: 260,
    height: 260,
    caption: "TarifWerk",
  },
  image: `${SITE.url}/opengraph-image`,
  email: SITE.email,
  telephone: "+49 157 82301076",
  slogan: "Beratung auf Augenhöhe",
  description: "TarifWerk bietet persönliche Beratung zu Internet, Mobilfunk, TV, Strom, Gas, Photovoltaik, Wärmepumpe, Versicherungen, Immobilien, Edelmetallen, Klimaanlagen und Sicherheitslösungen.",
  founder: {
    "@type": "Person",
    name: SITE.founder,
    jobTitle: SITE.founderTitle,
  },
  address: {
    "@type": "PostalAddress",
    streetAddress: businessAddress.streetAddress,
    ...(businessAddress.postalCode ? { postalCode: businessAddress.postalCode } : {}),
    addressLocality: businessAddress.addressLocality,
    addressRegion: businessAddress.addressRegion,
    addressCountry: businessAddress.addressCountry,
  },
  areaServed: [
    { "@type": "Country", name: "Deutschland" },
    ...REGIONS.filter((region) => !region.startsWith("Deutschlandweit")).map((region) => ({
      "@type": "City",
      name: region,
    })),
  ],
  contactPoint: [{
    "@type": "ContactPoint",
    telephone: "+49 157 82301076",
    email: SITE.email,
    contactType: "customer service",
    areaServed: "DE",
    availableLanguage: ["de"],
  }],
  knowsAbout: SERVICES.map((service) => service.name),
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "TarifWerk Beratungsleistungen",
    itemListElement: SERVICES.map((service) => ({
      "@type": "Offer",
      url: `${SITE.url}/leistungen/${service.slug}`,
      itemOffered: {
        "@type": "Service",
        name: service.name,
        serviceType: service.name,
        url: `${SITE.url}/leistungen/${service.slug}`,
        provider: { "@id": `${SITE.url}/#organization` },
        areaServed: { "@type": "Country", name: "Deutschland" },
      },
    })),
  },
};
}

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE.url}/#website`,
  url: `${SITE.url}/`,
  name: SITE.name,
  alternateName: "TarifWerk.eu",
  inLanguage: "de-DE",
  publisher: { "@id": `${SITE.url}/#organization` },
};

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const audience = await resolveSiteAudience();
  return (
    <>
      <JourneyContext />
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd} />
      <Header initialAudience={audience} />
      <main id="main" className="pb-[68px] md:pb-0">
        {children}
      </main>
      <Footer audience={audience} />
      <PublicAiChat audience={audience} />
      <QuickContact audience={audience} />
    </>
  );
}
