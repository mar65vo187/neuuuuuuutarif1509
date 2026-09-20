import type { ServiceKey } from "@/lib/content";

export type CampaignLanding = {
  slug: string;
  audience: "b2c" | "b2b";
  eyebrow: string;
  title: string;
  emphasis: string;
  intro: string;
  topic: string;
  serviceKey: ServiceKey;
  situation: "orientierung" | "konkret" | "vergleich" | "bestand";
  bullets: string[];
  proof: Array<{ title: string; text: string }>;
  seoTitle: string;
  seoDescription: string;
};

export const CAMPAIGN_LANDINGS: CampaignLanding[] = [
  {
    slug: "internet-check",
    audience: "b2c",
    eyebrow: "TarifWerk Internet-Check",
    title: "Passt dein Anschluss noch",
    emphasis: "zu deinem Alltag?",
    intro: "Wir schauen auf Verfügbarkeit, Leistung, Mobilfunk, TV, Laufzeit und Gesamtkosten. Du bekommst eine klare Einordnung statt eines Tarifkatalogs.",
    topic: "Internet, Mobilfunk, TV",
    serviceKey: "internet",
    situation: "bestand",
    bullets: ["Verfügbarkeit & Bedarf prüfen", "Kosten und Laufzeit verstehen", "nur wechseln, wenn es sinnvoll ist"],
    proof: [
      { title: "Ein Gespräch", text: "Anschluss, Mobilfunk und TV gemeinsam betrachten." },
      { title: "Klare Kriterien", text: "Leistung, Netz, Nutzung und Gesamtkosten werden gemeinsam sortiert." },
      { title: "Kein Abschlussdruck", text: "Auch ein bestehender Vertrag kann das richtige Ergebnis sein." },
    ],
    seoTitle: "Internet-Check: Anschluss & Tarif prüfen | TarifWerk",
    seoDescription: "Internet, Glasfaser, Mobilfunk und TV gemeinsam prüfen. Verfügbarkeit, Leistung, Laufzeit und Kosten verständlich einordnen.",
  },
  {
    slug: "energie-check",
    audience: "b2c",
    eyebrow: "TarifWerk Energie-Check",
    title: "Strom und Gas",
    emphasis: "verständlich geprüft.",
    intro: "Verbrauch, Abschlag, Preisbestandteile und Fristen werden gemeinsam eingeordnet. Danach ist klar, ob Handlungsbedarf besteht.",
    topic: "Strom & Gas",
    serviceKey: "energie",
    situation: "bestand",
    bullets: ["Abrechnung & Verbrauch einordnen", "Preis und Fristen nachvollziehen", "Wechsel nur bei echtem Vorteil prüfen"],
    proof: [
      { title: "Bestand zuerst", text: "Wir beginnen mit deiner aktuellen Situation und nicht mit einem neuen Vertrag." },
      { title: "Transparente Optionen", text: "Verfügbare Partner und Bedingungen werden offen benannt." },
      { title: "Begleitung", text: "Wenn ein Wechsel sinnvoll ist, begleiten wir die nächsten Schritte." },
    ],
    seoTitle: "Strom- & Gas-Check persönlich | TarifWerk",
    seoDescription: "Strom und Gas prüfen: Verbrauch, Abschläge, Preise und Fristen verständlich einordnen und sinnvolle Optionen besprechen.",
  },
  {
    slug: "solar-waermepumpe",
    audience: "b2c",
    eyebrow: "TarifWerk Hausenergie-Check",
    title: "Solar und Wärmepumpe",
    emphasis: "als Gesamtprojekt.",
    intro: "Dach, Gebäude, Verbrauch, Budget und Angebote gehören zusammen. Wir strukturieren die Ausgangslage und führen bei Bedarf mit passenden Fachpartnern weiter.",
    topic: "Solar (Photovoltaik) & Wärmepumpe",
    serviceKey: "solar",
    situation: "konkret",
    bullets: ["Gebäude & Verbrauch gemeinsam betrachten", "Angebote nachvollziehbar einordnen", "Umsetzung mit Fachpartnern koordinieren"],
    proof: [
      { title: "Gesamtbild", text: "PV, Speicher und Wärmepumpe nicht isoliert betrachten." },
      { title: "Keine Renditeversprechen", text: "Wirtschaftlichkeit wird nachvollziehbar geprüft, nicht versprochen." },
      { title: "Fachpartner", text: "Für Planung und Umsetzung werden passende Spezialisten eingebunden." },
    ],
    seoTitle: "Solar & Wärmepumpe gemeinsam planen | TarifWerk",
    seoDescription: "Photovoltaik und Wärmepumpe passend zu Gebäude, Verbrauch und Budget einordnen. Angebote und nächste Schritte strukturiert prüfen.",
  },
  {
    slug: "business-check",
    audience: "b2b",
    eyebrow: "TarifWerk Business-Check",
    title: "Weniger Schnittstellen.",
    emphasis: "Mehr Überblick.",
    intro: "Telekommunikation, Energie, Absicherung und weitere laufende Themen werden über einen Ansprechpartner strukturiert. Sie entscheiden, welche Bereiche tatsächlich vertieft werden.",
    topic: "Internet, Mobilfunk, TV",
    serviceKey: "internet",
    situation: "orientierung",
    bullets: ["Standorte & bestehende Verträge aufnehmen", "Kosten, Leistung und Prioritäten ordnen", "nächste Schritte zentral koordinieren"],
    proof: [
      { title: "Ein Ansprechpartner", text: "Mehrere Themen über eine zentrale Schnittstelle." },
      { title: "Bedarf statt Paket", text: "Ausgangspunkt sind Ihre Anforderungen, nicht ein Standardprodukt." },
      { title: "Deutschlandweit", text: "Digitale Betreuung auch über mehrere Standorte hinweg." },
    ],
    seoTitle: "Business-Check für Unternehmen | TarifWerk",
    seoDescription: "Telekommunikation, Energie, Absicherung und weitere Unternehmensthemen strukturiert über einen Ansprechpartner prüfen.",
  },
];

export function getCampaignLanding(slug: string) {
  return CAMPAIGN_LANDINGS.find((item) => item.slug === slug);
}
