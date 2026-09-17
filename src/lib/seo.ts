import type { Metadata } from "next";
import { SITE } from "@/lib/content";

type PageSeo = { title: string; description: string; noindex?: boolean };

export const PAGE_SEO: Record<string, PageSeo> = {
  "/": { title: "TarifWerk | Persönliche Beratung deutschlandweit", description: "TarifWerk aus Wiesbaden: persönliche Beratung zu Internet, Mobilfunk, Strom, Gas, Solar, Wärmepumpe, Versicherungen und Immobilien – deutschlandweit." },
  "/leistungen": { title: "Leistungen & Beratung | TarifWerk", description: "TarifWerk berät zu Internet, Mobilfunk, Strom, Gas, Solar, Wärmepumpe, Versicherungen und Immobilien – verständlich und persönlich." },
  "/berater": { title: "Berater finden | TarifWerk", description: "Finde deinen TarifWerk Ansprechpartner nach Thema und Region: vor Ort oder digital deutschlandweit. Jetzt Termin anfragen." },
  "/anfrage": { title: "Kostenloses Erstgespräch anfragen | TarifWerk", description: "Thema wählen, Kontaktdaten senden, persönlich beraten lassen. Frage jetzt deine kostenlose und unverbindliche Erstorientierung bei TarifWerk an." },
  "/ueber-uns": { title: "Über TarifWerk | Persönliche Beratung aus Wiesbaden", description: "Lerne TarifWerk und Gründer Marvin Noel Egenolf kennen. Persönliche Beratung aus Wiesbaden mit festem Ansprechpartner – digital deutschlandweit." },
  "/karriere": { title: "Berater werden: Karriere bei TarifWerk", description: "Du erklärst verständlich und hörst Menschen zu? Entdecke die Arbeit als Berater bei TarifWerk und stelle dich mit deiner Bewerbung vor." },
  "/faq": { title: "TarifWerk FAQ | Kosten, Ablauf & Beratung", description: "Antworten zu TarifWerk, Erstgespräch, Kosten, Ablauf und deutschlandweiter Beratung. Erfahre, wie die persönliche Beratung funktioniert." },
  "/freund-werben": { title: "Freunde werben & TarifWerk empfehlen", description: "Empfiehl TarifWerk mit deinem persönlichen Link und behalte deine Empfehlungen im Blick. Jetzt Empfehlungslink erstellen und mit Freunden teilen." },
  "/freund-werben/status": { title: "Dein Empfehlungsstatus | TarifWerk", description: "Rufe deinen persönlichen Empfehlungsstatus mit deinem privaten Zugangslink auf und behalte zugeordnete Anfragen im Blick.", noindex: true },
  "/impressum": { title: "Impressum & Kontakt | TarifWerk", description: "Angaben zum Betreiber und zur Kontaktaufnahme mit TarifWerk. Informiere dich über die Verantwortlichkeiten und nutze unsere Kontaktmöglichkeiten.", noindex: true },
  "/datenschutz": { title: "Datenschutzerklärung | TarifWerk", description: "Erfahre, wie TarifWerk personenbezogene Daten verarbeitet und welche Rechte du hast. Lies die Datenschutzhinweise und kontaktiere uns bei Fragen.", noindex: true },
  "/agb": { title: "Allgemeine Geschäftsbedingungen | TarifWerk", description: "Lies die Bedingungen zur Beratung und Vermittlung bei TarifWerk. Informiere dich über Ablauf, Vergütung und Termine vor deiner Anfrage.", noindex: true },
};

export function shortenSeoText(text: string, limit: number): string {
  const chars = Array.from(text.replace(/\s+/g, " ").trim());
  return chars.length <= limit ? chars.join("") : chars.slice(0, limit - 1).join("").trimEnd() + "…";
}

export function pageMetadata(path: string, details: PageSeo = PAGE_SEO[path], image?: string | null): Metadata {
  if (!details) throw new Error(`SEO-Konfiguration fehlt: ${path}`);
  const title = shortenSeoText(details.title, 59);
  const description = shortenSeoText(details.description, 154);
  const url = new URL(path, SITE.url).href;
  const shareImage = image ? { url: new URL(image, SITE.url).href, alt: title } : {
    url: `${SITE.url}/assets/architecture.webp`, width: 1122, height: 1402, alt: "TarifWerk – persönliche Beratung auf Augenhöhe",
  };
  return {
    title: { absolute: title }, description,
    alternates: { canonical: url },
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
    openGraph: { type: "website", locale: "de_DE", siteName: SITE.name, title, description, url, images: [shareImage] },
    twitter: { card: "summary_large_image", title, description, images: [{ url: shareImage.url, alt: shareImage.alt }] },
  };
}
