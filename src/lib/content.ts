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
    "intro": "Internet inklusive Glasfaser, Mobilfunk und TV: Wir prüfen mit Ihnen Verfügbarkeit, Netz, Datenvolumen, Nutzung und Vertragsbedingungen. Damit Ihre Verbindung zu Ihrem Alltag oder Ihrem Unternehmen passt.",
    "checks": [
      "Verfügbarkeit an Ihrer Adresse klären",
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
    "seoDescription": "Internet, Glasfaser, Mobilfunk oder TV: Lassen Sie Verfügbarkeit und Vertragsbedingungen persönlich einordnen. Jetzt Beratung zu Ihrem Anschluss anfragen.",
    "tickerLabel": "Internet, Mobilfunk, TV"
  },
  {
    "key": "energie",
    "slug": "strom-gas",
    "name": "Strom & Gas",
    "short": "Ihre Energieverträge. Verständlich sortiert.",
    "featured": false,
    "eyebrow": "Energie im Alltag",
    "headline": "Klare Sicht auf Ihre Energiekosten.",
    "intro": "Wir schauen auf Verbrauch, Konditionen und Kündigungsfristen. Sie erfahren, welche Optionen zu Ihnen passen und ob ein Wechsel sinnvoll ist.",
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
        "q": "Kümmert ihr euch um den Wechsel?",
        "a": "Wenn Sie möchten, begleiten wir den kompletten Prozess."
      }
    ],
    "seoTitle": "Strom & Gas: Persönliche Tarifberatung | TarifWerk",
    "seoDescription": "Verbrauch, Preise und Kündigungsfristen verständlich prüfen: Finde heraus, ob ein Strom- oder Gaswechsel zu Ihnen passt. Jetzt Erstgespräch anfragen.",
    "tickerLabel": "Alltagstarife (Strom & Gas)"
  },
  {
    "key": "versicherungen",
    "slug": "versicherungen",
    "name": "Versicherungen",
    "short": "Schutz für das, was Ihnen wichtig ist.",
    "featured": true,
    "eyebrow": "Sicherheit & Vorsorge",
    "headline": "Absicherung mit Augenmaß.",
    "intro": "Welche Risiken möchten Sie absichern? Wir sortieren mit Ihnen vorhandene Verträge und Ihren Bedarf und binden passende Fachpartner ein.",
    "checks": [
      "Bestehende Verträge und Bedarf ordnen",
      "Mögliche Lücken und Doppelungen erkennen",
      "Beiträge und Leistungen verständlich vergleichen",
      "Veränderungen in Ihrem Leben berücksichtigen"
    ],
    "forWhom": [
      "Junge Familien",
      "Selbstständige",
      "Alle, die ihren Ordner seit Jahren nicht geöffnet haben"
    ],
    "faq": [
      {
        "q": "Verkauft ihr mir Verträge, die ich nicht brauche?",
        "a": "Nein. Wir sagen Ihnen auch, wenn Sie etwas kündigen sollten."
      }
    ],
    "seoTitle": "Versicherungen verständlich prüfen | TarifWerk",
    "seoDescription": "Lassen Sie bestehende Versicherungen und Ihren Absicherungsbedarf verständlich einordnen. Frage jetzt dein Erstgespräch mit TarifWerk an.",
    "tickerLabel": "Versicherungen"
  },
  {
    "key": "sicherheit",
    "slug": "sicherheitsloesungen",
    "name": "Sicherheitslösungen",
    "short": "Ein gutes Gefühl beginnt zu Hause.",
    "featured": false,
    "eyebrow": "Zuhause & Sicherheit",
    "headline": "Sicherheit, die zu Ihrem Objekt passt.",
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
        "a": "Wir klären Ihren Bedarf und stimmen die nächsten Schritte persönlich mit Ihnen ab."
      }
    ],
    "seoTitle": "Sicherheitslösungen: Persönliche Beratung | TarifWerk",
    "seoDescription": "Alarmanlage, Überwachung oder Smart Home: Klären Sie Ihren Bedarf und passende nächste Schritte mit Fachpartnern. Jetzt Beratung anfragen.",
    "tickerLabel": "Rund um Sicherheit"
  },
  {
    "key": "klima",
    "slug": "klimaanlagen",
    "name": "Klimaanlagen",
    "short": "Räume zum Wohlfühlen.",
    "featured": false,
    "eyebrow": "Wohnen & Komfort",
    "headline": "Ein gutes Klima. Nach Ihrem Maß.",
    "intro": "Raumgröße, Nutzung und Budget bestimmen, welche Klimaanlage passt. Wir helfen Ihnen bei der Orientierung und der Abstimmung mit Fachpartnern.",
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
        "a": "Wir klären Ihren Bedarf und stimmen die nächsten Schritte persönlich mit Ihnen ab."
      }
    ],
    "seoTitle": "Klimaanlagen: Bedarf & Optionen klären | TarifWerk",
    "seoDescription": "Welche Klimaanlage passt zu Raum, Nutzung und Budget? Lassen Sie Ihre Möglichkeiten mit passenden Fachpartnern einordnen. Jetzt Erstgespräch anfragen.",
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
    "intro": "Passt eine Solaranlage mit Wärmepumpe zu Ihrem Zuhause? Wir betrachten Dach, Gebäude, Verbrauch, Budget und Angebote gemeinsam und stimmen die nächsten Schritte mit passenden Fachpartnern ab.",
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
        "a": "Nein. Wir arbeiten unabhängig mit mehreren Partnern und zeigen Ihnen passende Optionen."
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
        "a": "Nein. Edelmetalle sind ein Baustein, kein Allheilmittel. Wir sagen Ihnen offen, wenn andere Themen für Sie Vorrang haben."
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
    "short": "Raum für Ihre nächsten Schritte.",
    "featured": true,
    "eyebrow": "Wohnen & Vermögen",
    "headline": "Ein neues Kapitel. Gut durchdacht.",
    "intro": "Eigenheim, Kapitalanlage oder eine erste Orientierung: Wir sortieren Ihre Fragen und bringen Sie mit passenden Fachpartnern zusammen.",
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
        "a": "Wir arbeiten mit ausgewählten Marktteilnehmern zusammen und zeigen Ihnen Optionen, die zu Ihrer Situation passen. Die Entscheidung bleibt immer bei Ihnen."
      },
      {
        "q": "Was kostet die Erstberatung?",
        "a": "Nichts. Das erste Gespräch ist kostenlos und unverbindlich."
      }
    ],
    "seoTitle": "Immobilien: Persönliche Orientierung | TarifWerk",
    "seoDescription": "Eigenheim oder Kapitalanlage? Sortieren Sie Ihre Immobilienfragen und finden Sie passende Fachpartner. Jetzt Ihre persönliche Erstorientierung anfragen.",
    "tickerLabel": "Immobilien"
  }
];

export const SERVICE_IMAGES: Partial<Record<ServiceKey, { src: string; alt: string }>> = {
  "versicherungen": { "src": "/assets/architecture.webp", "alt": "Illustratives Wohnhaus – Schutz für das, was Ihnen wichtig ist" },
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
    "a": "Erstorientierung und Tarifcheck sind kostenlos und unverbindlich. Bei einer konkreten Vermittlung erklären wir Ihnen die jeweiligen Konditionen und die Vergütung vor Ihrer Entscheidung."
  },
  {
    "q": "Vergleicht TarifWerk den gesamten Markt?",
    "a": "Nein. Wir arbeiten mit verschiedenen großen und kleineren Marktteilnehmern, aber nicht mit jedem Anbieter am Markt. Welche Partner und Optionen für Ihr Anliegen verfügbar sind, sagen wir Ihnen offen."
  },
  {
    "q": "Bleibt mein Berater auch nach dem Abschluss erreichbar?",
    "a": "Ja. Ihr persönlicher Berater bleibt Ihr Ansprechpartner – bei Rückfragen, Änderungen und weiteren Themen, die für Sie relevant werden."
  },
  {
    "q": "Wie läuft eine Terminanfrage ab?",
    "a": "Sie teilen uns Ihr Anliegen und Ihre Wunschzeit mit. Ein Mitarbeiter meldet sich und bestätigt den Termin persönlich. Ihre Anfrage ist noch keine verbindliche Terminbuchung."
  },
  {
    "q": "Beratet ihr auch Selbstständige und Unternehmen?",
    "a": "Ja. Wir begleiten Privatkunden, Selbstständige und Unternehmen. Wir sprechen über Ihren konkreten Bedarf und stimmen die passenden nächsten Schritte mit Ihnen ab."
  },
  {
    "q": "Kann ich mich deutschlandweit beraten lassen?",
    "a": "Ja, eine Beratung ist deutschlandweit per Zoom möglich. Persönliche Treffen stimmen wir individuell ab. Die Auswahl einer Region bedeutet nicht, dass sich dort ein TarifWerk-Standort befindet."
  },
  {
    "q": "Wie verdient TarifWerk Geld?",
    "a": "Bei erfolgreicher Vermittlung erhalten wir in vielen Bereichen eine Provision vom jeweiligen Anbieter. Erstorientierung und Tarifcheck sind kostenfrei. Welche Vergütung für Ihr Anliegen relevant ist und welche Kriterien wir für eine Empfehlung nutzen, erklären wir Ihnen nachvollziehbar."
  },
  {
    "q": "Wie entscheidet ihr, was ihr empfehlt?",
    "a": "Wir starten mit Ihrer Situation und legen die relevanten Kriterien fest – zum Beispiel Leistung, Gesamtkosten, Laufzeit, Bedarf und Umsetzbarkeit. Danach erklären wir Ihnen, warum wir eine verfügbare Option für passend halten."
  },
  {
    "q": "Muss ich mich sofort entscheiden?",
    "a": "Nein. Ziel des ersten Gesprächs ist, dass Sie Ihre Situation und die nächsten Möglichkeiten besser einschätzen können. Ob Sie etwas umsetzen, entscheiden Sie danach selbst."
  }
];

/* ------------------------------------------------------------------ */
/*  Prozess                                                            */
/* ------------------------------------------------------------------ */

export const PROCESS = [
  { step: "01", title: "Sie schildern Ihre Situation", text: "Kurz sagen, worum es geht, was heute besteht und was Ihnen wichtig ist." },
  { step: "02", title: "Wir sortieren die Fakten", text: "Bedarf, bestehende Verträge, relevante Kosten, Fristen und Rahmenbedingungen kommen auf den Tisch." },
  { step: "03", title: "Sie sehen die Unterschiede", text: "Wir erklären konkrete Optionen und warum sie zu Ihrer Situation passen – oder eben nicht." },
  { step: "04", title: "Wir begleiten den nächsten Schritt", text: "Wenn Sie sich entscheiden, koordinieren wir die Umsetzung und bleiben auch danach erreichbar." },
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
  kontaktiert: "Kontaktiert",
  termin_bestaetigt: "Termin bestätigt",
  in_beratung: "In Beratung",
  abgeschlossen: "Abgeschlossen",
  verloren: "Nicht zustande gekommen",
};

export const LEAD_TYPE_LABELS: Record<string, string> = {
  beratung: "Beratungsanfrage",
  termin: "Terminwunsch",
  tarifcheck: "Tarifcheck",
  bewerbung: "Bewerbung",
  kontakt: "Kontakt",
};
