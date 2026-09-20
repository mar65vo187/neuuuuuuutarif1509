/* ------------------------------------------------------------------ */
/*  TarifWerk – zentrale Inhalte (Single Source of Truth)              */
/* ------------------------------------------------------------------ */

export const SITE = {
  name: "TarifWerk",
  claim: "Beratung auf Augenhöhe",
  url: "https://www.tarifwerk.eu",
  email: "m.egenolf@tarifwerk.eu",
  whatsappNumber: "4915782301076",
  whatsappDisplay: "0157 823 010 76",
  phoneHref: "tel:+4915782301076",
  founder: "Marvin Noel Egenolf",
  founderTitle: "Gründer von TarifWerk",
  hours: "Täglich 08:00–22:00 Uhr",
  hq: "Wiesbaden",
} as const;

export function whatsappLink(text?: string) {
  const base = `https://wa.me/${SITE.whatsappNumber}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/* ------------------------------------------------------------------ */
/*  Themen / Leistungen                                                */
/* ------------------------------------------------------------------ */

export type ServiceKey =
  | "immobilien"
  | "edelmetalle"
  | "solar"
  | "waermepumpe"
  | "internet"
  | "mobilfunk"
  | "energie"
  | "versicherungen"
  | "sicherheit"
  | "klima";

export type Service = {
  key: ServiceKey;
  slug: string;
  name: string;
  short: string;
  shortLabel?: string;
  tickerLabel?: string;
  featured: boolean;
  eyebrow: string;
  headline: string;
  intro: string;
  checks: string[];
  forWhom: string[];
  faq: { q: string; a: string }[];
  seoTitle: string;
  seoDescription: string;
};

export const SERVICES: Service[] = [
  {
    "key": "internet",
    "slug": "internet-glasfaser-tv",
    "name": "Internet, Mobilfunk, TV",
    "short": "Gut verbunden. Klar entschieden.",
    "featured": false,
    "eyebrow": "Verbunden im Alltag",
    "headline": "Gut verbunden. Klar entschieden.",
    "intro": "Internet inklusive Glasfaser, Mobilfunk und TV: Verfügbarkeit, Netz, Datenvolumen, Nutzung und Vertragsbedingungen werden gemeinsam eingeordnet – passend zu Haushalt oder Unternehmen.",
    "checks": [
      "Verfügbarkeit am Anschluss prüfen",
      "Bandbreite und TV-Bedarf bestimmen",
      "Laufzeiten, Fristen und Gesamtkosten vergleichen",
      "Kündigung und Wechsel gemeinsam vorbereiten",
      "Nutzung und Netzbedarf besprechen",
      "Datenvolumen passend wählen",
      "Laufzeit und Gesamtkosten verstehen"
    ],
    "forWhom": [
      "Haushalte mit Homeoffice und Streaming",
      "Umzügler",
      "Alle, die seit Jahren denselben Tarif haben"
    ],
    "faq": [
      {
        "q": "Prüft ihr die Verfügbarkeit für mich?",
        "a": "Ja – das gehört zur Erstprüfung dazu."
      }
    ],
    "seoTitle": "Internet, Mobilfunk & TV: Beratung | TarifWerk",
    "seoDescription": "Internet, Glasfaser, Mobilfunk und TV persönlich einordnen: Verfügbarkeit, Netz, Leistung und Vertragsbedingungen verständlich prüfen.",
    "tickerLabel": "Internet, Mobilfunk, TV"
  },
  {
    "key": "energie",
    "slug": "strom-gas",
    "name": "Strom & Gas",
    "short": "Energieverträge. Verständlich sortiert.",
    "featured": false,
    "eyebrow": "Energie im Alltag",
    "headline": "Klare Sicht auf Energiekosten.",
    "intro": "Verbrauch, Konditionen und Kündigungsfristen werden gemeinsam geprüft. So wird klar, welche Optionen passen und ob ein Wechsel überhaupt sinnvoll ist.",
    "checks": [
      "Abrechnung und Abschläge einordnen",
      "Preisbestandteile und Boni nachvollziehen",
      "Verträge und Fristen vergleichen",
      "Wechsel und weitere Schritte begleiten"
    ],
    "forWhom": [
      "Haushalte in der Grundversorgung",
      "Eigentümer mit Wärmepumpe oder E-Auto",
      "Unternehmen mit höherem Verbrauch"
    ],
    "faq": [
      {
        "q": "Begleitet TarifWerk auch den Wechsel?",
        "a": "Ja. Auf Wunsch begleiten wir den kompletten Prozess."
      }
    ],
    "seoTitle": "Strom & Gas: Persönliche Tarifberatung | TarifWerk",
    "seoDescription": "Strom und Gas verständlich prüfen: Verbrauch, Preise, Fristen und sinnvolle Wechseloptionen persönlich einordnen.",
    "tickerLabel": "Alltagstarife (Strom & Gas)"
  },
  {
    "key": "versicherungen",
    "slug": "versicherungen",
    "name": "Versicherungen",
    "short": "Schutz, der zum tatsächlichen Bedarf passt.",
    "featured": true,
    "eyebrow": "Sicherheit & Vorsorge",
    "headline": "Absicherung mit Augenmaß.",
    "intro": "Bestehende Verträge, tatsächlicher Absicherungsbedarf und mögliche Lücken werden gemeinsam sortiert; bei Bedarf kommen passende Fachpartner hinzu.",
    "checks": [
      "Bestehende Verträge und Bedarf ordnen",
      "Mögliche Lücken und Doppelungen erkennen",
      "Beiträge und Leistungen verständlich vergleichen",
      "Veränderungen in Lebens- oder Arbeitssituation berücksichtigen"
    ],
    "forWhom": [
      "Junge Familien",
      "Selbstständige",
      "Alle, die ihren Ordner seit Jahren nicht geöffnet haben"
    ],
    "faq": [
      {
        "q": "Verkauft ihr mir Verträge, die ich nicht brauche?",
        "a": "Nein. Auch eine Kündigung oder das Beibehalten eines bestehenden Vertrags kann das richtige Ergebnis sein."
      }
    ],
    "seoTitle": "Versicherungen verständlich prüfen | TarifWerk",
    "seoDescription": "Versicherungen verständlich einordnen: bestehenden Schutz, mögliche Lücken und tatsächlichen Bedarf gemeinsam prüfen.",
    "tickerLabel": "Versicherungen"
  },
  {
    "key": "sicherheit",
    "slug": "sicherheitsloesungen",
    "name": "Sicherheitslösungen",
    "short": "Ein gutes Gefühl beginnt zu Hause.",
    "featured": false,
    "eyebrow": "Zuhause & Sicherheit",
    "headline": "Sicherheit, die zum Objekt passt.",
    "intro": "Alarmanlagen, Überwachung und Smart Home: Wir klären Ihren Bedarf und helfen bei der Einordnung passender Lösungen und Fachpartner.",
    "checks": [
      "Bedarf und mögliche Schwachstellen besprechen",
      "Funk, Kabel und Smart Home vergleichen",
      "Datenschutz bei Kameras und Cloud mitdenken",
      "Montage mit Fachpartnern abstimmen"
    ],
    "forWhom": [
      "Privatkunden mit passendem Bedarf",
      "Selbstständige und Unternehmen"
    ],
    "faq": [
      {
        "q": "Wie läuft die erste Beratung ab?",
        "a": "Wir klären den Bedarf und stimmen die nächsten sinnvollen Schritte persönlich ab."
      }
    ],
    "seoTitle": "Sicherheitslösungen: Persönliche Beratung | TarifWerk",
    "seoDescription": "Alarmanlage, Überwachung oder Smart Home: Bedarf, Technik und passende nächste Schritte gemeinsam mit Fachpartnern einordnen.",
    "tickerLabel": "Rund um Sicherheit"
  },
  {
    "key": "klima",
    "slug": "klimaanlagen",
    "name": "Klimaanlagen",
    "short": "Räume zum Wohlfühlen.",
    "featured": false,
    "eyebrow": "Wohnen & Komfort",
    "headline": "Ein gutes Klima. Passend geplant.",
    "intro": "Raumgröße, Nutzung und Budget bestimmen, welche Klimaanlage passt. TarifWerk unterstützt bei Orientierung und Abstimmung mit Fachpartnern.",
    "checks": [
      "Raumgröße und Nutzung berücksichtigen",
      "Lösungen und Energieverbrauch vergleichen",
      "Montage und Einbau besprechen",
      "Wartung und Reinigung von Anfang an mitdenken"
    ],
    "forWhom": [
      "Privatkunden mit passendem Bedarf",
      "Selbstständige und Unternehmen"
    ],
    "faq": [
      {
        "q": "Wie läuft die erste Beratung ab?",
        "a": "Wir klären den Bedarf und stimmen die nächsten sinnvollen Schritte persönlich ab."
      }
    ],
    "seoTitle": "Klimaanlagen: Bedarf & Optionen klären | TarifWerk",
    "seoDescription": "Klimaanlagen passend zu Raum, Nutzung, Energiebedarf und Budget einordnen – gemeinsam mit geeigneten Fachpartnern.",
    "tickerLabel": "Klimaanlagen"
  },
  {
    "key": "solar",
    "slug": "solar-photovoltaik",
    "name": "Solar (Photovoltaik) & Wärmepumpe",
    "short": "Heute durchdenken. Morgen profitieren.",
    "featured": true,
    "eyebrow": "Energie & Zukunft",
    "headline": "Strom und Wärme gemeinsam durchdenken.",
    "intro": "Solar und Wärmepumpe werden als Gesamtprojekt betrachtet: Dach, Gebäude, Verbrauch, Budget, Angebote und sinnvolle nächste Schritte.",
    "checks": [
      "Dachfläche und Ihren Strombedarf einordnen",
      "Photovoltaik und Speicher zusammen betrachten",
      "Wirtschaftlichkeit nachvollziehbar prüfen lassen",
      "Angebote und Umsetzung mit Fachpartnern besprechen",
      "Gebäude und bestehende Heizung berücksichtigen",
      "Verbrauch und realistische Betriebskosten besprechen",
      "Mögliche Förderungen durch Fachpartner prüfen lassen"
    ],
    "forWhom": [
      "Eigenheimbesitzer mit steigenden Stromkosten",
      "Familien mit E-Auto oder Wärmepumpe",
      "Vermieter, die Objekte aufwerten möchten"
    ],
    "faq": [
      {
        "q": "Kommt ihr vorbei?",
        "a": "Ja, in unseren Regionen sind Vor-Ort-Termine möglich. Alternativ prüfen wir per Video – auch das funktioniert sehr gut."
      },
      {
        "q": "Muss ich mich für einen Anbieter entscheiden?",
        "a": "Nein. TarifWerk arbeitet mit mehreren Partnern und ordnet verfügbare Optionen transparent ein."
      }
    ],
    "seoTitle": "Photovoltaik & Wärmepumpe: Beratung | TarifWerk",
    "seoDescription": "Solar und Wärmepumpe passend zu Dach, Gebäude und Verbrauch einordnen. Besprich Budget und Angebote mit uns. Jetzt Erstgespräch anfragen.",
    "shortLabel": "Solar/PV & Wärmepumpe",
    "tickerLabel": "Solar (Photovoltaik) & Wärmepumpe"
  },
  {
    "key": "edelmetalle",
    "slug": "edelmetalle",
    "name": "Edelmetalle",
    "short": "Werte verstehen. Bewusst entscheiden.",
    "featured": true,
    "eyebrow": "Werte & Weitblick",
    "headline": "Substanz beginnt mit Verständnis.",
    "intro": "Gold, Silber und weitere Edelmetalle verständlich einordnen. Gemeinsam sprechen wir über Möglichkeiten, Kosten und Risiken – ohne Renditeversprechen.",
    "checks": [
      "Physische Metalle und andere Formen unterscheiden",
      "Kaufpreise, Aufschläge und Lagerung verstehen",
      "Risiken und Ihren Zeithorizont besprechen",
      "Seriöse Angebote nachvollziehbar einordnen"
    ],
    "forWhom": [
      "Menschen, die Vermögen langfristig absichern möchten",
      "Sparer, die eine Alternative zum reinen Konto suchen",
      "Familien mit Blick auf Generationen"
    ],
    "faq": [
      {
        "q": "Ist Gold immer eine gute Idee?",
        "a": "Nein. Edelmetalle sind ein Baustein, kein Allheilmittel. Wenn andere Themen Vorrang haben, sagen wir das offen."
      },
      {
        "q": "Garantiert ihr Wertsteigerungen?",
        "a": "Nein – niemand kann das seriös. Wir sprechen über Mechanik, Risiken und Zeithorizonte, nicht über Versprechen."
      }
    ],
    "seoTitle": "Gold & Edelmetalle verstehen | TarifWerk",
    "seoDescription": "Gold und Silber verständlich einordnen: Besprich Möglichkeiten, Kosten und Risiken ohne Renditeversprechen. Jetzt persönliches Erstgespräch anfragen.",
    "tickerLabel": "Edelmetalle"
  },
  {
    "key": "immobilien",
    "slug": "immobilien",
    "name": "Immobilien",
    "short": "Raum für den nächsten Schritt.",
    "featured": true,
    "eyebrow": "Wohnen & Vermögen",
    "headline": "Ein neues Kapitel. Gut durchdacht.",
    "intro": "Eigenheim, Kapitalanlage oder erste Orientierung: Fragen werden strukturiert und bei Bedarf mit passenden Fachpartnern weitergeführt.",
    "checks": [
      "Ziele, Budget und Nebenkosten einordnen",
      "Lage, Zustand und laufende Kosten mitdenken",
      "Finanzierungsbausteine verständlich besprechen",
      "Passende Fachpartner für Bewertung und Finanzierung finden"
    ],
    "forWhom": [
      "Erstkäufer mit vielen offenen Fragen",
      "Kapitalanleger mit Renditeziel",
      "Eigentümer, die verkaufen oder umschulden möchten"
    ],
    "faq": [
      {
        "q": "Vermittelt ihr auch Objekte?",
        "a": "Wir arbeiten mit ausgewählten Marktteilnehmern zusammen und zeigen passende Optionen transparent auf. Die Entscheidung bleibt immer beim Kunden."
      },
      {
        "q": "Was kostet die Erstberatung?",
        "a": "Nichts. Das erste Gespräch ist kostenlos und unverbindlich."
      }
    ],
    "seoTitle": "Immobilien: Persönliche Orientierung | TarifWerk",
    "seoDescription": "Immobilienfragen rund um Eigenheim oder Kapitalanlage strukturieren und passende nächste Fachschritte einordnen.",
    "tickerLabel": "Immobilien"
  }
];

export const SERVICE_IMAGES: Partial<Record<ServiceKey, { src: string; alt: string }>> = {
  "versicherungen": { "src": "/assets/architecture.webp", "alt": "Illustratives Wohnhaus als Symbol für Absicherung und Schutz" },
  "solar": {
    "src": "/assets/energy.webp",
    "alt": "Illustratives Wohnhaus mit Photovoltaikanlage und Wärmepumpe"
  },
  "edelmetalle": {
    "src": "/assets/metals.webp",
    "alt": "Illustratives Motiv mit Gold- und Silberbarren"
  },
  "immobilien": {
    "src": "/assets/architecture.webp",
    "alt": "Illustratives Motiv eines modernen Wohnhauses"
  }
};

export const FEATURED_SERVICES = SERVICES.filter((s) => s.featured);
export const OTHER_SERVICES = SERVICES.filter((s) => !s.featured);
export const SERVICE_NAMES = SERVICES.map((s) => s.name);

export function normalizeTopic(topic: string): string {
  return ({
    "Internet, Glasfaser & TV": "Internet, Mobilfunk, TV",
    "Internet": "Internet, Mobilfunk, TV",
    "Mobilfunk": "Internet, Mobilfunk, TV",
    "TV": "Internet, Mobilfunk, TV",
    "Solar & Photovoltaik": "Solar (Photovoltaik) & Wärmepumpe",
    "Solar": "Solar (Photovoltaik) & Wärmepumpe",
    "Photovoltaik": "Solar (Photovoltaik) & Wärmepumpe",
    "Wärmepumpe": "Solar (Photovoltaik) & Wärmepumpe",
    "Wärmepumpen": "Solar (Photovoltaik) & Wärmepumpe",
  } as Record<string, string>)[topic] || topic;
}
export function normalizeTopics(topics: string[]): string[] {
  return [...new Set(topics.map(normalizeTopic))];
}


export function getService(slug: string) {
  const canonical = ({ mobilfunk: "internet-glasfaser-tv", waermepumpe: "solar-photovoltaik", solar: "solar-photovoltaik" } as Record<string, string>)[slug] || slug;
  return SERVICES.find((s) => s.slug === canonical);
}

/* ------------------------------------------------------------------ */
/*  Regionen                                                           */
/* ------------------------------------------------------------------ */

export const REGIONS = [
  "Wiesbaden",
  "Mainz",
  "Frankfurt am Main",
  "Worms",
  "München",
  "Dortmund",
  "Kassel",
  "Hamburg",
  "Deutschlandweit (digital)",
] as const;

export const LOCATION_OPTIONS = ["Augsburg", "Bad Homburg vor der Höhe", "Berlin", "Bielefeld", "Bonn", "Bremen", "Darmstadt", "Deutschlandweit (digital)", "Dortmund", "Dresden", "Düsseldorf", "Erfurt", "Essen", "Frankfurt am Main", "Freiburg im Breisgau", "Hamburg", "Hannover", "Heidelberg", "Karlsruhe", "Kassel", "Kiel", "Koblenz", "Köln", "Leipzig", "Limburg an der Lahn", "Lübeck", "Magdeburg", "Mainz", "Mannheim", "München", "Münster", "Nürnberg", "Offenbach am Main", "Osnabrück", "Potsdam", "Regensburg", "Rostock", "Rüsselsheim am Main", "Saarbrücken", "Stuttgart", "Trier", "Wiesbaden", "Worms", "Würzburg"];

export type Region = (typeof REGIONS)[number];

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */

export const FAQ = [
  {
    "q": "Was kostet das erste Gespräch?",
    "a": "Erstorientierung und Tarifcheck sind kostenlos und unverbindlich. Vor einer konkreten Vermittlung werden Konditionen und Vergütung transparent erklärt."
  },
  {
    "q": "Vergleicht TarifWerk den gesamten Markt?",
    "a": "Nein. TarifWerk arbeitet mit verschiedenen großen und kleineren Marktteilnehmern, aber nicht mit jedem Anbieter. Verfügbare Partner und Optionen werden offen benannt."
  },
  {
    "q": "Bleibt mein Berater auch nach dem Abschluss erreichbar?",
    "a": "Ja. Der persönliche Berater bleibt Ansprechpartner – auch bei Rückfragen, Änderungen und späteren Themen."
  },
  {
    "q": "Wie läuft eine Terminanfrage ab?",
    "a": "Anliegen und Wunschzeit werden übermittelt. Ein Mitarbeiter meldet sich persönlich und bestätigt den Termin; die Anfrage selbst ist noch keine verbindliche Buchung."
  },
  {
    "q": "Beratet ihr auch Selbstständige und Unternehmen?",
    "a": "Ja. TarifWerk begleitet Privatkunden, Selbstständige und Unternehmen und stimmt die nächsten Schritte passend zum konkreten Bedarf ab."
  },
  {
    "q": "Kann ich mich deutschlandweit beraten lassen?",
    "a": "Ja, eine Beratung ist deutschlandweit per Zoom möglich. Persönliche Treffen stimmen wir individuell ab. Die Auswahl einer Region bedeutet nicht, dass sich dort ein TarifWerk-Standort befindet."
  },
  {
    "q": "Wie verdient TarifWerk Geld?",
    "a": "Bei erfolgreicher Vermittlung erhält TarifWerk in vielen Bereichen eine Provision vom jeweiligen Anbieter. Erstorientierung und Tarifcheck sind kostenfrei; relevante Vergütung und Empfehlungskriterien werden transparent erläutert."
  },
  {
    "q": "Wie entscheidet ihr, was ihr empfehlt?",
    "a": "Ausgangspunkt ist immer die konkrete Situation. Danach werden Kriterien wie Leistung, Gesamtkosten, Laufzeit, Bedarf und Umsetzbarkeit festgelegt und verfügbare Optionen nachvollziehbar eingeordnet."
  },
  {
    "q": "Muss ich mich sofort entscheiden?",
    "a": "Nein. Ziel des ersten Gesprächs ist Klarheit über Situation und Möglichkeiten. Ob anschließend etwas umgesetzt wird, bleibt vollständig offen."
  }
];

/* ------------------------------------------------------------------ */
/*  Prozess                                                            */
/* ------------------------------------------------------------------ */

export const PROCESS = [
  { step: "01", title: "Situation schildern", text: "Kurz klären, worum es geht, was heute besteht und welche Kriterien wichtig sind." },
  { step: "02", title: "Wir sortieren die Fakten", text: "Bedarf, bestehende Verträge, relevante Kosten, Fristen und Rahmenbedingungen kommen auf den Tisch." },
  { step: "03", title: "Unterschiede verstehen", text: "Konkrete Optionen werden verständlich eingeordnet – inklusive Grenzen und Bedingungen." },
  { step: "04", title: "Nächsten Schritt begleiten", text: "Wenn eine Entscheidung getroffen ist, koordinieren wir die Umsetzung und bleiben erreichbar." },
];

/* ------------------------------------------------------------------ */
/*  Lead-Optionen                                                      */
/* ------------------------------------------------------------------ */

export const SITUATIONS = [
  { value: "orientierung", label: "Ich möchte mich erst einmal orientieren" },
  { value: "konkret", label: "Ich habe ein konkretes Vorhaben" },
  { value: "vergleich", label: "Ich habe ein Angebot und möchte eine zweite Meinung" },
  { value: "bestand", label: "Ich möchte bestehende Verträge prüfen lassen" },
];

export const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telefon", label: "Telefon" },
  { value: "email", label: "E-Mail" },
  { value: "video", label: "Video-Call" },
  { value: "vor_ort", label: "Vor Ort" },
];

export const TIME_SLOTS = [
  { value: "vormittag", label: "Vormittags (08–12 Uhr)" },
  { value: "nachmittag", label: "Nachmittags (12–17 Uhr)" },
  { value: "abend", label: "Abends (17–22 Uhr)" },
  { value: "wochenende", label: "Am Wochenende" },
  { value: "flexibel", label: "Ich bin flexibel" },
];

export const LEAD_STATUS_LABELS: Record<string, string> = {
  neu: "Neu",
  kontaktiert: "Angerufen",
  termin_bestaetigt: "Terminiert",
  in_beratung: "In Beratung",
  abgeschlossen: "Abgeschlossen",
  verloren: "Nicht zustande gekommen",
};

export const LEAD_PRIORITY_LABELS: Record<string, string> = {
  low: "Niedrig",
  normal: "Normal",
  high: "Hoch",
  hot: "Hot Lead",
};

export const LEAD_CONTACT_OUTCOME_LABELS: Record<string, string> = {
  open: "Noch nicht angerufen",
  reached: "Erreicht",
  no_answer: "Keine Antwort",
  callback: "Rückruf vereinbart",
  voicemail: "Mailbox",
  wrong_number: "Falsche Nummer",
  not_interested: "Kein Interesse",
};

export const LEAD_TYPE_LABELS: Record<string, string> = {
  beratung: "Beratungsanfrage",
  termin: "Terminwunsch",
  tarifcheck: "Tarifcheck",
  bewerbung: "Bewerbung",
  kontakt: "Kontakt",
};
