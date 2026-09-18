import type { Metadata } from "next";
import { SITE } from "@/lib/content";

type PageSeo = { title: string; description: string; noindex?: boolean };

export const HOME_AUDIENCE_SEO = {
  b2c: {
    title: "TarifWerk | Tarife, Energie & Versicherungen beraten",
    description: "Persönliche Beratung zu Internet, Mobilfunk, Strom, Gas, Solar, Wärmepumpe, Versicherungen und Immobilien. TarifWerk berät deutschlandweit.",
  },
  b2b: {
    title: "TarifWerk Business | Telekommunikation, Energie & Verträge",
    description: "TarifWerk bündelt Telekommunikation, Energie, Absicherung und weitere Lösungen für Selbstständige und Unternehmen – persönlich, deutschlandweit.",
  },
} as const;

export const PAGE_SEO: Record<string, PageSeo> = {
  "/": HOME_AUDIENCE_SEO.b2c,
  "/leistungen": { title: "Leistungen: Tarife, Energie, Solar & mehr | TarifWerk", description: "Internet, Mobilfunk, Strom, Gas, Solar, Wärmepumpe, Versicherungen, Immobilien und mehr: persönliche TarifWerk Beratung deutschlandweit." },
  "/berater": { title: "TarifWerk Berater finden | Persönlich & deutschlandweit", description: "Finde deinen TarifWerk Ansprechpartner nach Thema und Region. Persönliche Beratung vor Ort oder digital deutschlandweit – jetzt unverbindlich anfragen." },
  "/anfrage": { title: "Kostenlose Beratung anfragen | TarifWerk", description: "Thema wählen, Kontaktdaten senden und persönlich beraten lassen. Jetzt kostenlose und unverbindliche Erstorientierung bei TarifWerk anfragen." },
  "/ueber-uns": { title: "Über TarifWerk | Beratung auf Augenhöhe aus Wiesbaden", description: "Lerne TarifWerk und die persönliche Beratung aus Wiesbaden kennen: ein fester Ansprechpartner für Tarife, Energie und wichtige Entscheidungen." },
  "/karriere": { title: "Berater werden: Karriere bei TarifWerk", description: "Du erklärst verständlich und hörst Menschen zu? Entdecke die Arbeit als Berater bei TarifWerk und stelle dich mit deiner Bewerbung vor." },
  "/faq": { title: "TarifWerk FAQ | Kosten, Ablauf & Beratung", description: "Antworten zu TarifWerk, Erstgespräch, Kosten, Ablauf, Tarifen und deutschlandweiter Beratung. Erfahre, wie die persönliche Beratung funktioniert." },
  "/freund-werben": { title: "Freunde werben: bis 1.000 € Wunschgutschein | TarifWerk", description: "TarifWerk empfehlen und bei erfolgreicher Vermittlung je nach Bereich bis zu 1.000 € Wunschgutschein erhalten. Persönlicher Link und transparenter Status." },
  "/freund-werben/status": { title: "Dein Empfehlungsstatus | TarifWerk", description: "Rufe deinen persönlichen Empfehlungsstatus mit deinem privaten Zugangslink auf und behalte zugeordnete Anfragen und Prämien im Blick.", noindex: true },
  "/impressum": { title: "Impressum & Kontakt | TarifWerk", description: "Angaben zum Betreiber und zur Kontaktaufnahme mit TarifWerk. Informiere dich über die Verantwortlichkeiten und nutze unsere Kontaktmöglichkeiten.", noindex: true },
  "/datenschutz": { title: "Datenschutzerklärung | TarifWerk", description: "Erfahre, wie TarifWerk personenbezogene Daten verarbeitet und welche Rechte du hast. Lies die Datenschutzhinweise und kontaktiere uns bei Fragen.", noindex: true },
  "/agb": { title: "Allgemeine Geschäftsbedingungen | TarifWerk", description: "Lies die Bedingungen zur Beratung und Vermittlung bei TarifWerk. Informiere dich über Ablauf, Vergütung und Termine vor deiner Anfrage.", noindex: true },
};

export function shortenSeoText(text: string, limit: number): string {
  const chars = Array.from(text.replace(/\s+/g, " ").trim());
  return chars.length <= limit ? chars.join("") : chars.slice(0, limit - 1).join("").trimEnd() + "…";
}

export function pageMetadata(path: string, details: PageSeo = PAGE_SEO[path], image?: string | null, canonicalPath = path): Metadata {
  if (!details) throw new Error(`SEO-Konfiguration fehlt: ${path}`);
  const title = shortenSeoText(details.title, 62);
  const description = shortenSeoText(details.description, 160);
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
