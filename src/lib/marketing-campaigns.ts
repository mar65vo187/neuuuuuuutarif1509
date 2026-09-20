export type MarketingCampaign = {
  slug: string;
  audience: "b2c" | "b2b";
  eyebrow: string;
  title: string;
  emphasis: string;
  text: string;
  topic: string;
  situation: string;
  cta: string;
  reassurance: string;
  points: string[];
  proofTitle: string;
  proofItems: Array<{ title: string; text: string }>;
  seoTitle: string;
  seoDescription: string;
};

export const MARKETING_CAMPAIGNS: MarketingCampaign[] = [
  {
    slug: "tarifcheck",
    audience: "b2c",
    eyebrow: "TarifWerk · kostenlose Erstorientierung",
    title: "Schon ein Angebot oder einen Vertrag?",
    emphasis: "Erst verstehen. Dann entscheiden.",
    text: "Schick uns kurz deine Ausgangslage. Wir ordnen Kosten, Laufzeit, Leistung und wichtige Bedingungen verständlich ein – ohne dass du dich direkt für einen Wechsel entscheiden musst.",
    topic: "Internet, Mobilfunk, TV",
    situation: "vergleich",
    cta: "Kostenlose Einschätzung starten",
    reassurance: "Unverbindlich · persönlich · kein Abschlusszwang",
    points: [
      "Vorhandenes Angebot oder bestehenden Vertrag einordnen",
      "Kosten und Bedingungen verständlich durchgehen",
      "Klarer nächster Schritt statt Produktliste",
    ],
    seoTitle: "Tarifcheck: Vertrag & Angebot prüfen | TarifWerk",
    seoDescription: "Bestehenden Vertrag oder Angebot verständlich prüfen: Kosten, Laufzeit, Leistung und Bedingungen gemeinsam einordnen.",
    proofTitle: "Warum diese Anfrage anders aufgebaut ist",
    proofItems: [
      { title: "Bedarf zuerst", text: "Wir beginnen mit deiner Situation und nicht mit einem vorgegebenen Produkt." },
      { title: "Transparente Grenzen", text: "TarifWerk arbeitet mit mehreren Marktteilnehmern, aber nicht mit jedem Anbieter." },
      { title: "Du entscheidest", text: "Eine Einschätzung verpflichtet dich nicht zu einem Abschluss." },
    ],
  },
  {
    slug: "energie-check",
    audience: "b2c",
    eyebrow: "TarifWerk · Strom & Gas",
    title: "Energievertrag prüfen,",
    emphasis: "ohne blind zu wechseln.",
    text: "Wir schauen gemeinsam auf Verbrauch, Preisbestandteile, Laufzeit und Kündigungsfristen. Danach weißt du, ob überhaupt Handlungsbedarf besteht.",
    topic: "Strom & Gas",
    situation: "bestand",
    cta: "Energievertrag prüfen lassen",
    reassurance: "Kostenlose Erstorientierung · nachvollziehbar erklärt",
    points: [
      "Abrechnung und Abschläge einordnen",
      "Fristen und Preisbestandteile verstehen",
      "Nur handeln, wenn es wirklich sinnvoll ist",
    ],
    seoTitle: "Strom- & Gas-Check persönlich | TarifWerk",
    seoDescription: "Strom und Gas prüfen: Verbrauch, Abschläge, Preise und Fristen verständlich einordnen und sinnvolle Optionen besprechen.",
    proofTitle: "Ein Tarifcheck ohne Sparversprechen",
    proofItems: [
      { title: "Keine erfundene Ersparnis", text: "Ob sich ein Wechsel lohnt, hängt von deinem konkreten Vertrag und den verfügbaren Optionen ab." },
      { title: "Persönlicher Kontakt", text: "Ein Ansprechpartner kennt die Anfrage und bleibt für Rückfragen erreichbar." },
      { title: "Klare Entscheidung", text: "Du bekommst die relevanten Unterschiede erklärt und entscheidest selbst." },
    ],
  },
  {
    slug: "solar-check",
    audience: "b2c",
    eyebrow: "TarifWerk · Solar & Wärmepumpe",
    title: "Große Investition.",
    emphasis: "Vorher sauber einordnen.",
    text: "Dach, Gebäude, Verbrauch, Budget und vorhandene Angebote gehören zusammen betrachtet. Wir strukturieren die offenen Punkte und koordinieren bei Bedarf passende Fachpartner.",
    topic: "Solar (Photovoltaik) & Wärmepumpe",
    situation: "konkret",
    cta: "Projekt einordnen lassen",
    reassurance: "Unverbindliche Erstorientierung · keine Renditeversprechen",
    points: [
      "Solar, Speicher und Wärmepumpe zusammen betrachten",
      "Angebote und offene Punkte strukturiert prüfen",
      "Umsetzung mit geeigneten Fachpartnern besprechen",
    ],
    seoTitle: "Solar & Wärmepumpe gemeinsam prüfen | TarifWerk",
    seoDescription: "Photovoltaik und Wärmepumpe passend zu Gebäude, Verbrauch und Budget einordnen. Angebote und nächste Schritte strukturiert prüfen.",
    proofTitle: "Erst das Gesamtbild, dann die Technik",
    proofItems: [
      { title: "Gebäude & Verbrauch", text: "Technik wird nicht isoliert vom tatsächlichen Energiebedarf betrachtet." },
      { title: "Angebote verstehen", text: "Kosten, Komponenten und Umsetzbarkeit werden nachvollziehbar eingeordnet." },
      { title: "Fachpartner bei Bedarf", text: "Erlaubnis- oder fachpflichtige Leistungen bleiben bei entsprechend qualifizierten Partnern." },
    ],
  },
  {
    slug: "business-check",
    audience: "b2b",
    eyebrow: "TarifWerk Business · Bedarfsklärung",
    title: "Weniger Dienstleister.",
    emphasis: "Mehr Überblick.",
    text: "Telekommunikation, Energie, Absicherung und weitere laufende Themen lassen sich strukturiert bündeln. Sie schildern kurz die Ausgangslage – wir klären, welche Informationen und nächsten Schritte tatsächlich relevant sind.",
    topic: "Internet, Mobilfunk, TV",
    situation: "bestand",
    cta: "Business-Bedarf klären",
    reassurance: "Unverbindlich · direkter Ansprechpartner · deutschlandweit",
    points: [
      "Standorte, Verträge und Prioritäten strukturiert aufnehmen",
      "Kosten, Leistung und Umsetzbarkeit gemeinsam betrachten",
      "Nächste Schritte zentral koordinieren",
    ],
    seoTitle: "Business-Check für Unternehmen | TarifWerk",
    seoDescription: "Telekommunikation, Energie, Absicherung und weitere Unternehmensthemen strukturiert über einen Ansprechpartner prüfen.",
    proofTitle: "Für Unternehmen, die Schnittstellen reduzieren wollen",
    proofItems: [
      { title: "Zentraler Kontakt", text: "Mehrere Themen laufen über einen Ansprechpartner statt über viele einzelne Rückfragen." },
      { title: "Nachvollziehbare Kriterien", text: "Empfehlungen werden anhand des tatsächlichen Bedarfs und verfügbarer Optionen begründet." },
      { title: "Freigabe bleibt bei Ihnen", text: "Umgesetzt wird erst, wenn Sie den nächsten Schritt ausdrücklich freigeben." },
    ],
  },
];

export function getMarketingCampaign(slug: string) {
  return MARKETING_CAMPAIGNS.find((campaign) => campaign.slug === slug);
}
