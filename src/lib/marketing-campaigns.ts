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
    slug: "versicherungs-check",
    audience: "b2c",
    eyebrow: "TarifWerk · Versicherungen",
    title: "Versicherungen gewachsen?",
    emphasis: "Schutz neu sortieren.",
    text: "Wir ordnen bestehende Verträge, mögliche Lücken und Doppelungen gemeinsam ein. Ziel ist ein verständliches Gesamtbild – nicht möglichst viele neue Policen.",
    topic: "Versicherungen",
    situation: "bestand",
    cta: "Versicherungen sortieren",
    reassurance: "Unverbindlich · bedarfsorientiert · verständlich erklärt",
    points: [
      "Bestehenden Schutz und Lebenssituation zusammen betrachten",
      "Mögliche Lücken oder Doppelungen strukturiert erkennen",
      "Nur relevante nächste Schritte mit passenden Fachpartnern besprechen",
    ],
    seoTitle: "Versicherungen prüfen & sortieren | TarifWerk",
    seoDescription: "Bestehende Versicherungen, mögliche Lücken und Doppelungen verständlich einordnen und den tatsächlichen Bedarf gemeinsam prüfen.",
    proofTitle: "Absicherung ohne Produktdruck",
    proofItems: [
      { title: "Bestand zuerst", text: "Vor neuen Lösungen wird betrachtet, was bereits vorhanden ist und weiter passen kann." },
      { title: "Bedarf statt Menge", text: "Auch das Beibehalten oder Reduzieren bestehender Verträge kann ein sinnvolles Ergebnis sein." },
      { title: "Fachpartner bei Bedarf", text: "Erlaubnispflichtige Beratung und Vermittlung erfolgt nur über entsprechend qualifizierte Partner." },
    ],
  },
  {
    slug: "immobilien-check",
    audience: "b2c",
    eyebrow: "TarifWerk · Immobilien",
    title: "Immobilienentscheidung?",
    emphasis: "Erst sauber strukturieren.",
    text: "Kauf, Verkauf, Finanzierung oder Kapitalanlage: Wir klären die Ausgangslage, offenen Fragen und welche Fachpartner für den nächsten Schritt wirklich gebraucht werden.",
    topic: "Immobilien",
    situation: "konkret",
    cta: "Immobilienvorhaben einordnen",
    reassurance: "Unverbindliche Erstorientierung · keine Wert- oder Renditegarantie",
    points: [
      "Ziel, Budget und Zeithorizont gemeinsam strukturieren",
      "Finanzierung, Objekt und weitere Themen nicht isoliert betrachten",
      "Geeignete Fachpartner erst nach Bedarf einbinden",
    ],
    seoTitle: "Immobilienvorhaben strukturiert prüfen | TarifWerk",
    seoDescription: "Kauf, Verkauf, Finanzierung oder Kapitalanlage strukturiert einordnen und die nächsten Schritte mit passenden Fachpartnern planen.",
    proofTitle: "Große Entscheidungen brauchen Struktur",
    proofItems: [
      { title: "Ausgangslage klären", text: "Ziel, Zeithorizont und finanzielle Rahmenbedingungen werden vor dem nächsten Schritt sortiert." },
      { title: "Keine Wertversprechen", text: "Marktwerte, Finanzierungen und mögliche Entwicklungen werden nicht pauschal garantiert." },
      { title: "Koordination", text: "Je nach Vorhaben können Finanzierung, Vermittlung und weitere Fachbereiche sinnvoll zusammenspielen." },
    ],
  },
  {
    slug: "klima-check",
    audience: "b2c",
    eyebrow: "TarifWerk · Klimaanlagen",
    title: "Räume dauerhaft zu warm?",
    emphasis: "Lösung passend planen.",
    text: "Raumgröße, Nutzung, Gebäude und gewünschter Komfort bestimmen, welche Klimatisierung sinnvoll ist. Wir strukturieren den Bedarf und koordinieren bei Bedarf geeignete Fachpartner.",
    topic: "Klimaanlagen",
    situation: "konkret",
    cta: "Klimabedarf klären",
    reassurance: "Unverbindlich · bedarfsorientiert · Fachmontage über Partner",
    points: [
      "Raumgröße und Nutzung vor der Technik betrachten",
      "Komfort, Effizienz und Einbau gemeinsam einordnen",
      "Montage und Fachfragen mit geeigneten Partnern abstimmen",
    ],
    seoTitle: "Klimaanlage passend planen | TarifWerk",
    seoDescription: "Klimatisierung passend zu Raum, Gebäude und Nutzung einordnen und die nächsten Schritte mit geeigneten Fachpartnern planen.",
    proofTitle: "Nicht einfach irgendein Gerät",
    proofItems: [
      { title: "Bedarf vor Leistung", text: "Dimensionierung und Nutzung werden vor einer konkreten Lösung betrachtet." },
      { title: "Gebäude mitdenken", text: "Einbauort, Leitungswege und bauliche Rahmenbedingungen gehören zur Vorprüfung." },
      { title: "Fachgerechte Umsetzung", text: "Montage und technische Arbeiten bleiben bei entsprechend qualifizierten Fachpartnern." },
    ],
  },
  {
    slug: "business-connect",
    audience: "b2b",
    eyebrow: "TarifWerk Business · Telekommunikation",
    title: "Standorte, Mobilfunk, Internet.",
    emphasis: "Ein Ansprechpartner.",
    text: "Wir strukturieren Anschlüsse, Mobilfunkbedarf, Standorte, Laufzeiten und geplante Veränderungen. So entsteht ein belastbarer Überblick, bevor einzelne Verträge verändert werden.",
    topic: "Internet, Mobilfunk, TV",
    situation: "bestand",
    cta: "Business-Kommunikation prüfen",
    reassurance: "Unverbindlich · mehrere Standorte möglich · deutschlandweit",
    points: [
      "Anschlüsse, Rufnummern und Mobilfunkbedarf zentral aufnehmen",
      "Laufzeiten, Verfügbarkeit und Standortplanung zusammen betrachten",
      "Migrationen und nächste Schritte strukturiert vorbereiten",
    ],
    seoTitle: "Business Internet & Mobilfunk prüfen | TarifWerk",
    seoDescription: "Internet, Mobilfunk und Standortkommunikation für Unternehmen strukturiert prüfen und nächste Schritte zentral koordinieren.",
    proofTitle: "Kommunikation als Gesamtsystem betrachten",
    proofItems: [
      { title: "Standorte zusammenführen", text: "Einzelverträge werden im Zusammenhang mit Standorten, Teams und geplanten Veränderungen betrachtet." },
      { title: "Verfügbarkeit prüfen", text: "Technische Machbarkeit und passende Bandbreiten werden vor einer Umstellung eingeordnet." },
      { title: "Saubere Übergabe", text: "Änderungen werden erst nach Freigabe koordiniert und nachvollziehbar dokumentiert." },
    ],
  },
  {
    slug: "business-energie",
    audience: "b2b",
    eyebrow: "TarifWerk Business · Energie",
    title: "Verbrauch und Verträge.",
    emphasis: "Zentral im Blick.",
    text: "Bei höheren Verbräuchen oder mehreren Standorten lohnt sich eine strukturierte Bestandsaufnahme. Wir ordnen Verbrauch, Laufzeiten, Preislogik und nächste Prüfschritte gemeinsam ein.",
    topic: "Strom & Gas",
    situation: "bestand",
    cta: "Energiebedarf des Unternehmens prüfen",
    reassurance: "Unverbindlich · keine pauschalen Sparversprechen · deutschlandweit",
    points: [
      "Verbrauch und Vertragsstruktur je Standort aufnehmen",
      "Laufzeiten, Preisbestandteile und Beschaffungszeitpunkte einordnen",
      "Nächste Schritte zentral koordinieren",
    ],
    seoTitle: "Business Strom & Gas prüfen | TarifWerk",
    seoDescription: "Strom und Gas für Unternehmen strukturiert prüfen: Verbrauch, Standorte, Laufzeiten und sinnvolle nächste Schritte gemeinsam einordnen.",
    proofTitle: "Energieentscheidungen mit belastbarer Grundlage",
    proofItems: [
      { title: "Standortbezogene Daten", text: "Verbrauch und Vertragslage werden je Standort betrachtet statt pauschal geschätzt." },
      { title: "Keine Spargarantie", text: "Ob eine Änderung sinnvoll ist, hängt von konkreten Daten und verfügbaren Konditionen ab." },
      { title: "Zentrale Koordination", text: "Informationen und nächste Schritte laufen über einen festen Ansprechpartner zusammen." },
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
