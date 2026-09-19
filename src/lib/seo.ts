import type { Metadata } from "next";
import { SITE } from "@/lib/content";

type PageSeo = { title: string; description: string; noindex?: boolean };

export const HOME_AUDIENCE_SEO = {
  b2c: {
    title: "TarifWerk | Beratung für Tarife, Energie & Versicherungen",
    description: "Beratung auf Augenhöhe zu Internet, Mobilfunk, Strom, Gas, Solar, Wärmepumpen, Versicherungen und Immobilien – persönlich und deutschlandweit.",
  },
  b2b: {
    title: "TarifWerk Business | Telekommunikation, Energie & Absicherung",
    description: "Persönliche Business-Beratung zu Telekommunikation, Energie, Absicherung und weiteren Lösungen für Selbstständige und Unternehmen – deutschlandweit.",
  },
} as const;

export const PAGE_SEO: Record<string, PageSeo> = {
  "/": HOME_AUDIENCE_SEO.b2c,
  "/leistungen": { title: "Leistungen: Tarife, Energie, Solar & mehr | TarifWerk", description: "Internet, Mobilfunk, Strom, Gas, Solar, Wärmepumpe, Versicherungen, Immobilien und mehr: persönliche TarifWerk Beratung deutschlandweit." },
  "/berater": { title: "TarifWerk Berater finden | Persönlich & deutschlandweit", description: "Finden Sie Ihren TarifWerk Ansprechpartner nach Thema und Region. Persönliche Beratung vor Ort oder digital deutschlandweit – unverbindlich anfragen." },
  "/anfrage": { title: "Kostenlose Beratung anfragen | TarifWerk", description: "Thema wählen, Kontaktdaten senden und persönlich beraten lassen. Kostenlose und unverbindliche Erstorientierung bei TarifWerk anfragen." },
  "/ueber-uns": { title: "Über TarifWerk | Beratung auf Augenhöhe aus Wiesbaden", description: "Lernen Sie TarifWerk und die persönliche Beratung aus Wiesbaden kennen: ein fester Ansprechpartner für Tarife, Energie und wichtige Entscheidungen." },
  "/karriere": { title: "Berater werden: Karriere bei TarifWerk", description: "Sie erklären verständlich und hören Menschen zu? Lernen Sie die Arbeit als Berater bei TarifWerk kennen und bewerben Sie sich bei uns." },
  "/faq": { title: "TarifWerk FAQ | Kosten, Ablauf & Beratung", description: "Antworten zu TarifWerk, Erstgespräch, Kosten, Ablauf, Tarifen und deutschlandweiter Beratung. Erfahren Sie, wie die persönliche Beratung funktioniert." },
  "/freund-werben": { title: "Freunde werben: bis 1.000 € Wunschgutschein | TarifWerk", description: "TarifWerk empfehlen und bei erfolgreicher Vermittlung je nach Bereich bis zu 1.000 € Wunschgutschein erhalten. Persönlicher Link und transparenter Status." },
  "/freund-werben/status": { title: "Ihr Empfehlungsstatus | TarifWerk", description: "Rufen Sie Ihren persönlichen Empfehlungsstatus mit Ihrem privaten Zugangslink auf und behalten Sie zugeordnete Anfragen und Prämien im Blick.", noindex: true },
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
