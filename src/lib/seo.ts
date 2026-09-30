import type { Metadata } from "next";
import { SITE } from "@/lib/content";

type PageSeo = { title: string; description: string; noindex?: boolean };

export const HOME_AUDIENCE_SEO = {
  b2c: {
    title: "TarifWerk Wiesbaden: Verträge persönlich prüfen lassen",
    description: "Vertrag oder Angebot zu Strom, Internet, Versicherung und mehr? Persönliche Einordnung aus Wiesbaden, deutschlandweit. Erstgespräch kostenlos.",
  },
  b2b: {
    title: "TarifWerk Business: Verträge für Unternehmen prüfen",
    description: "Angebote für Internet, Mobilfunk und Energie einordnen. Ein persönlicher Ansprechpartner für Ihren Betrieb, deutschlandweit.",
  },
} as const;

export const REQUEST_AUDIENCE_SEO = {
  b2c: {
    title: "Vertrag prüfen lassen: Beratung anfragen | TarifWerk",
    description: "Thema wählen, Situation kurz schildern und eine persönliche Einschätzung erhalten. Kostenlos und unverbindlich bei TarifWerk anfragen.",
  },
  b2b: {
    title: "Business-Beratung anfragen | TarifWerk",
    description: "Unternehmensbedarf zu Telekommunikation, Energie, Absicherung und weiteren Themen strukturiert klären. Unverbindliche Business-Anfrage starten.",
  },
} as const;

export const AUDIENCE_PAGE_SEO = {
  "/leistungen": {
    b2c: {
      title: "Leistungen: Tarife, Energie, Solar & mehr | TarifWerk",
      description: "Internet, Mobilfunk, Strom, Gas, Solar, Wärmepumpe, Versicherungen, Immobilien und mehr: persönliche TarifWerk Beratung deutschlandweit.",
    },
    b2b: {
      title: "Business-Leistungen für Unternehmen | TarifWerk",
      description: "Telekommunikation, Energie, Absicherung, Solar, Klima und weitere Themen für Unternehmen strukturiert über einen Ansprechpartner bündeln.",
    },
  },
  "/berater": {
    b2c: {
      title: "TarifWerk Berater finden | Persönlich & deutschlandweit",
      description: "TarifWerk Ansprechpartner nach Thema und Region finden. Persönliche Beratung vor Ort oder digital deutschlandweit – kostenlos und unverbindlich starten.",
    },
    b2b: {
      title: "Business-Ansprechpartner finden | TarifWerk",
      description: "Passenden TarifWerk Ansprechpartner für Telekommunikation, Energie, Absicherung und weitere Unternehmensthemen finden – deutschlandweit.",
    },
  },
  "/faq": {
    b2c: {
      title: "TarifWerk FAQ: Kosten, Provision und Ablauf",
      description: "Antworten zu Kosten, Vergütung durch Anbieterprovision, Partnerwahl, Daten und Ablauf der Beratung bei TarifWerk.",
    },
    b2b: {
      title: "TarifWerk Business FAQ | Ablauf & Beratung",
      description: "Antworten für Unternehmen zu Ablauf, Partnern, Vergütung, mehreren Standorten und persönlicher Business-Beratung bei TarifWerk.",
    },
  },
  "/ueber-uns": {
    b2c: {
      title: "Über TarifWerk aus Wiesbaden",
      description: "Wie TarifWerk berät, vermittelt und durch Anbieterprovision verdient. Ein fester Ansprechpartner aus Wiesbaden, deutschlandweit.",
    },
    b2b: {
      title: "Über TarifWerk | Business-Beratung deutschlandweit",
      description: "TarifWerk bündelt Vertrags-, Versorgungs- und weitere betriebliche Themen mit einem direkten Ansprechpartner für Unternehmen deutschlandweit.",
    },
  },
} as const;

export const PAGE_SEO: Record<string, PageSeo> = {
  "/": HOME_AUDIENCE_SEO.b2c,
  "/leistungen": AUDIENCE_PAGE_SEO["/leistungen"].b2c,
  "/berater": AUDIENCE_PAGE_SEO["/berater"].b2c,
  "/anfrage": REQUEST_AUDIENCE_SEO.b2c,
  "/ueber-uns": AUDIENCE_PAGE_SEO["/ueber-uns"].b2c,
  "/karriere": { title: "Berater bei TarifWerk werden", description: "Selbstständig beraten und bei erfolgreicher Vermittlung Provision erhalten. Modell, Aufwand und Einarbeitung klären wir vorab." },
  "/faq": AUDIENCE_PAGE_SEO["/faq"].b2c,
  "/optimierungsservice": { title: "Optimierungsservice für 1,99 € im Monat | TarifWerk", description: "Verträge, Ziele und Wünsche laufend im Blick: TarifWerk bündelt Bestand, Vergleichsoptionen und nächste Schritte für 1,99 € pro Monat." },
  "/freund-werben": { title: "TarifWerk empfehlen: Prämien und Bedingungen", description: "Persönlichen Empfehlungslink teilen und nach erfolgreicher Vermittlung je nach Bereich bis zu 1.000 € Wunschgutschein erhalten." },
  "/freund-werben/status": { title: "Dein Empfehlungsstatus | TarifWerk", description: "Deinen persönlichen Empfehlungsstatus mit privatem Zugangslink öffnen und zugeordnete Empfehlungen und Prämien im Blick behalten.", noindex: true },
  "/erstinformation": { title: "Erstinformation für Vermittler | TarifWerk", description: "Status, Registrierung, Erlaubnisbehörde und Schlichtungsstellen der TarifWerk-Berater für Versicherungs- und Immobilienvermittlung.", noindex: true },
  "/impressum": { title: "Impressum & Kontakt | TarifWerk", description: "Angaben zum Betreiber und zur Kontaktaufnahme mit TarifWerk. Informationen zu Verantwortlichkeiten und unseren Kontaktmöglichkeiten.", noindex: true },
  "/datenschutz": { title: "Datenschutzerklärung | TarifWerk", description: "Erfahren Sie, wie TarifWerk personenbezogene Daten verarbeitet, welche Rechte Sie haben und wie Sie uns bei Datenschutzfragen kontaktieren.", noindex: true },
  "/agb": { title: "Allgemeine Geschäftsbedingungen | TarifWerk", description: "Lesen Sie die Bedingungen zur Beratung und Vermittlung bei TarifWerk sowie Hinweise zu Ablauf, Vergütung und Terminen.", noindex: true },
};

export function shortenSeoText(text: string, limit: number): string {
  const chars = Array.from(text.replace(/\s+/g, " ").trim());
  return chars.length <= limit ? chars.join("") : chars.slice(0, limit - 1).join("").trimEnd() + "…";
}

export function pageMetadata(path: string, details: PageSeo = PAGE_SEO[path], image?: string | null, canonicalPath = path): Metadata {
  if (!details) throw new Error(`SEO-Konfiguration fehlt: ${path}`);
  const title = shortenSeoText(details.title, 59);
  const description = shortenSeoText(details.description, 154);
  const url = new URL(canonicalPath, SITE.url).href;
  const shareImage = image
    ? { url: new URL(image, SITE.url).href, alt: title }
    : { url: `${SITE.url}/opengraph-image`, width: 1200, height: 630, alt: "TarifWerk – Beratung auf Augenhöhe" };

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: url,
      languages: {
        "de-DE": url,
        "x-default": url,
      },
    },
    robots: {
      index: !details.noindex,
      follow: !details.noindex,
      googleBot: {
        index: !details.noindex,
        follow: !details.noindex,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "de_DE",
      siteName: SITE.name,
      title,
      description,
      url,
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: shareImage.url, alt: shareImage.alt }],
    },
  };
}

export function homeAudienceMetadata(audience: "b2c" | "b2b"): Metadata {
  return pageMetadata("/", HOME_AUDIENCE_SEO[audience], null, "/");
}

export function requestAudienceMetadata(audience: "b2c" | "b2b"): Metadata {
  return pageMetadata("/anfrage", REQUEST_AUDIENCE_SEO[audience], null, "/anfrage");
}

export function audiencePageMetadata(path: keyof typeof AUDIENCE_PAGE_SEO, audience: "b2c" | "b2b"): Metadata {
  return pageMetadata(path, AUDIENCE_PAGE_SEO[path][audience], null, path);
}

export const RELATED_SERVICE_KEYS: Record<string, string[]> = {
  internet: ["energie", "sicherheit", "klima", "solar"],
  energie: ["solar", "internet", "klima", "immobilien"],
  versicherungen: ["immobilien", "edelmetalle", "sicherheit", "solar"],
  sicherheit: ["internet", "klima", "versicherungen", "immobilien"],
  klima: ["solar", "energie", "sicherheit", "immobilien"],
  solar: ["energie", "immobilien", "klima", "versicherungen"],
  edelmetalle: ["immobilien", "versicherungen", "solar", "energie"],
  immobilien: ["solar", "versicherungen", "edelmetalle", "energie"],
};
