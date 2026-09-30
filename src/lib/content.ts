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
    "short": "Anschluss, Preis und Laufzeit im Blick.",
    "featured": false,
    "eyebrow": "Verbunden im Alltag",
    "headline": "Passt der Internetvertrag noch?",
    "intro": "Verfügbarkeit an der Adresse, benötigte Bandbreite und die Kosten über die ganze Laufzeit werden gemeinsam geprüft. Passt der bestehende Tarif, bleibt es dabei.",
    "checks": [
      "Verfügbarkeit an der Adresse prüfen (DSL, Kabel, Glasfaser)",
      "Bandbreite, Datenvolumen und TV-Bedarf bestimmen",
      "Gesamtkosten über die Laufzeit statt nur den Monatspreis vergleichen",
      "Kündigungsfrist und Vertragsende festhalten",
      "Umzug, Glasfaserausbau und Wechsel vorbereiten"
    ],
    "forWhom": [
      "Haushalte mit Homeoffice und Streaming",
      "Umzügler",
      "Alle, die seit Jahren denselben Tarif haben"
    ],
    "faq": [
      {
        "q": "Prüft ihr die Verfügbarkeit für mich?",
        "a": "Ja, das gehört zur Erstprüfung. Wir schauen, welche Anschlüsse an der Adresse tatsächlich buchbar sind."
      },
      {
        "q": "Was passiert mit meinem Vertrag, wenn ich umziehe?",
        "a": "Der Anbieter muss die Leistung am neuen Wohnort in der Regel weiterführen. Kann er dort nicht liefern, besteht ein Sonderkündigungsrecht. Wir sehen uns den konkreten Fall an."
      },
      {
        "q": "Bei mir wird Glasfaser verlegt. Soll ich schon unterschreiben?",
        "a": "Bei einer Vorvermarktung wird oft ein Anschluss gebucht, der erst später geschaltet wird. Wir klären, ab wann er realistisch läuft und wie der bisherige Vertrag bis dahin weiterläuft."
      },
      {
        "q": "Lohnt sich ein Wechsel nur wegen des Neukundenbonus?",
        "a": "Nicht immer. Entscheidend sind die Kosten über die gesamte Laufzeit, auch nach der Aktionsphase. Genau das rechnen wir gemeinsam durch."
      }
    ],
    "seoTitle": "Internet, Glasfaser, Mobilfunk & TV prüfen | TarifWerk",
    "seoDescription": "Anschluss, Verfügbarkeit, Laufzeit und Gesamtkosten gemeinsam ansehen. Kostenloses Erstgespräch, die Entscheidung bleibt bei dir.",
    "tickerLabel": "Internet, Mobilfunk, TV"
  },
  {
    "key": "energie",
    "slug": "strom-gas",
    "name": "Strom & Gas",
    "short": "Rechnung, Tarif und Frist verständlich.",
    "featured": false,
    "eyebrow": "Energie im Alltag",
    "headline": "Stromrechnung oder Angebot? Gemeinsam draufschauen.",
    "intro": "Der Abschlag allein sagt nicht, was ein Tarif übers Jahr kostet. Verbrauch, Grundpreis, Arbeitspreis, Bonus, Laufzeit und Vertragsende werden gemeinsam angesehen. Passt der Vertrag schon, sagen wir das.",
    "checks": [
      "Jahresverbrauch und letzte Rechnung einordnen",
      "Grundpreis, Arbeitspreis und Einmalkosten vergleichen",
      "Laufzeit, Preisgarantie und Vertragsbedingungen prüfen",
      "Bonusbedingungen nachrechnen",
      "Grundversorgung, Umzug oder Wechsel klären"
    ],
    "forWhom": [
      "Haushalte in der Grundversorgung",
      "Eigentümer mit Wärmepumpe oder E-Auto",
      "Unternehmen mit höherem Verbrauch"
    ],
    "faq": [
      {
        "q": "Mein Anbieter erhöht die Preise. Was kann ich tun?",
        "a": "Bei einer Preiserhöhung besteht in der Regel ein Sonderkündigungsrecht. Welche Frist gilt, steht in der Ankündigung und im Vertrag. Am besten das Schreiben mitschicken, dann sehen wir es uns gemeinsam an."
      },
      {
        "q": "Worauf muss ich beim Bonus achten?",
        "a": "Viele Boni werden erst nach einer Mindestlaufzeit gezahlt oder entfallen bei vorzeitiger Kündigung. Wir rechnen deshalb den Preis mit und ohne Bonus, damit beide Zahlen auf dem Tisch liegen."
      },
      {
        "q": "Ich bin in der Grundversorgung. Ist das schlecht?",
        "a": "Nicht automatisch, aber oft teurer als ein Sondervertrag. Dafür lässt sie sich kurzfristig kündigen. Wir vergleichen den aktuellen Preis mit passenden Alternativen."
      },
      {
        "q": "Ich ziehe um. Muss ich den Vertrag kündigen?",
        "a": "Das hängt vom Vertrag ab. Wir prüfen, ob der Tarif an die neue Adresse mitgeht oder ob dort ein neuer Vertrag sinnvoller ist."
      },
      {
        "q": "Begleitet TarifWerk auch den Wechsel?",
        "a": "Ja. Die Kündigung beim bisherigen Anbieter übernimmt in der Regel der neue Anbieter, die Versorgung läuft ohne Unterbrechung weiter. Auf Wunsch begleiten wir den gesamten Ablauf."
      }
    ],
    "seoTitle": "Strom- und Gasvertrag prüfen lassen | TarifWerk",
    "seoDescription": "Rechnung, Tarif, Bonus und Frist einordnen. Erstgespräch kostenlos, kein Wechselzwang. Persönlich aus Wiesbaden, deutschlandweit.",
    "tickerLabel": "Alltagstarife (Strom & Gas)"
  },
  {
    "key": "versicherungen",
    "slug": "versicherungen",
    "name": "Versicherungen",
    "short": "Bestand, Bedarf und Lücken im Blick.",
    "featured": true,
    "eyebrow": "Sicherheit & Vorsorge",
    "headline": "Policen einmal sauber sortiert.",
    "intro": "Bestehende Versicherungen werden nach Bedarf, Lücken und Doppelungen sortiert. Auch Beibehalten oder Kündigen kann das richtige Ergebnis sein.",
    "checks": [
      "Bestehende Verträge und Beiträge auflisten",
      "Lücken und doppelte Absicherung erkennen",
      "Leistungen statt nur Beiträge vergleichen",
      "Änderungen in Familie, Job oder Wohnsituation berücksichtigen"
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
      },
      {
        "q": "Welche Unterlagen brauche ich?",
        "a": "Am besten die letzten Beitragsrechnungen oder Versicherungsscheine. Fehlt etwas, klären wir das im Gespräch."
      },
      {
        "q": "Wie wird TarifWerk bei Versicherungen bezahlt?",
        "a": "Kommt ein Vertrag über uns zustande, zahlt in der Regel der Versicherer eine Provision. Den Vermittlerstatus und die Art der Vergütung legen wir vor der Beratung offen."
      }
    ],
    "seoTitle": "Versicherungen prüfen und sortieren | TarifWerk",
    "seoDescription": "Policen und Bedarf ordnen, Lücken und Doppelungen erkennen. Vermittlerstatus und Vergütung legen wir offen. Erstgespräch kostenlos.",
    "tickerLabel": "Versicherungen"
  },
  {
    "key": "sicherheit",
    "slug": "sicherheitsloesungen",
    "name": "Sicherheitslösungen",
    "short": "Erst klären, was geschützt werden soll.",
    "featured": false,
    "eyebrow": "Zuhause & Sicherheit",
    "headline": "Erst klären, was geschützt werden soll.",
    "intro": "Alarmanlage, Kamera oder Smart Home: Zuerst wird geklärt, welche Bereiche geschützt werden sollen und welche Technik dazu passt. Planung und Montage übernimmt ein Fachbetrieb.",
    "checks": [
      "Bedarf und mögliche Schwachstellen besprechen",
      "Funk, Kabel und Smart Home vergleichen",
      "Datenschutz bei Kameras und Cloud mitdenken",
      "Montage mit einem Fachbetrieb abstimmen",
      "Wartung und Zuständigkeit nach der Montage klären"
    ],
    "forWhom": [
      "Privatkunden mit passendem Bedarf",
      "Selbstständige und Unternehmen"
    ],
    "faq": [
      {
        "q": "Wie läuft die erste Beratung ab?",
        "a": "Wir klären den Bedarf und stimmen die nächsten sinnvollen Schritte persönlich ab."
      },
      {
        "q": "Wer montiert die Anlage?",
        "a": "Ein Fachbetrieb. Wer montiert, wer für die Ausführung haftet und wer später Ansprechpartner für Wartung ist, steht vor der Beauftragung fest."
      },
      {
        "q": "Darf eine Kamera auch den Gehweg filmen?",
        "a": "Grundsätzlich soll eine private Kamera nur das eigene Grundstück erfassen, nicht öffentliche Wege oder Nachbargrundstücke. Darauf achten wir bei der Planung."
      }
    ],
    "seoTitle": "Alarmanlage und Sicherheit planen | TarifWerk",
    "seoDescription": "Bedarf für Haus oder Betrieb klären, Technik einordnen, Fachbetrieb und Zuständigkeiten vorab festlegen. Erstgespräch kostenlos.",
    "tickerLabel": "Rund um Sicherheit"
  },
  {
    "key": "klima",
    "slug": "klimaanlagen",
    "name": "Klimaanlagen",
    "short": "Passend zu Raum, Nutzung und Einbau.",
    "featured": false,
    "eyebrow": "Wohnen & Komfort",
    "headline": "Welche Klimaanlage passt zum Raum?",
    "intro": "Welche Anlage passt, hängt von Raumgröße, Nutzung, Lautstärke und Einbau ab. Das wird vorab geklärt, die Montage übernimmt ein Fachbetrieb.",
    "checks": [
      "Raumgröße und Nutzung berücksichtigen",
      "Lautstärke und Energieverbrauch vergleichen",
      "Einbauort und Montage besprechen",
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
      },
      {
        "q": "Brauche ich für eine Split-Klimaanlage einen Fachbetrieb?",
        "a": "Ja. Bei fest installierten Split-Geräten wird mit Kältemittel gearbeitet. Das darf nur ein zertifizierter Fachbetrieb."
      },
      {
        "q": "Wer ist nach dem Einbau Ansprechpartner?",
        "a": "Das wird vor der Beauftragung festgelegt. Für Gewährleistung und Wartung ist in der Regel der ausführende Fachbetrieb zuständig."
      }
    ],
    "seoTitle": "Klimaanlage passend zum Raum planen | TarifWerk",
    "seoDescription": "Nutzung, Raum, Lautstärke, Verbrauch und Einbau gemeinsam klären. Montage durch einen zertifizierten Fachbetrieb.",
    "tickerLabel": "Klimaanlagen"
  },
  {
    "key": "solar",
    "slug": "solar-photovoltaik",
    "name": "Solar (Photovoltaik) & Wärmepumpe",
    "short": "Dach, Verbrauch und Angebot zusammen.",
    "featured": true,
    "eyebrow": "Energie & Zukunft",
    "headline": "Vor der PV-Anlage: Passen Dach, Verbrauch und Angebot?",
    "intro": "Vor einer PV-Anlage oder Wärmepumpe sollten Dach, Gebäude, Verbrauch und Angebot zusammenpassen. Wir ordnen das gemeinsam, Planung und Montage übernimmt ein Fachbetrieb.",
    "checks": [
      "Dachfläche, Ausrichtung und Verschattung einordnen",
      "Stromverbrauch und Speicher zusammen betrachten",
      "Gebäude und bestehende Heizung für die Wärmepumpe berücksichtigen",
      "Angebote vergleichbar machen: Leistung, Komponenten, Gesamtpreis",
      "Mögliche Förderungen durch den Fachbetrieb prüfen lassen"
    ],
    "forWhom": [
      "Eigenheimbesitzer mit steigenden Stromkosten",
      "Familien mit E-Auto oder Wärmepumpe",
      "Vermieter, die Objekte aufwerten möchten"
    ],
    "faq": [
      {
        "q": "Kommt ihr vorbei?",
        "a": "In unseren Regionen sind Vor-Ort-Termine nach Absprache möglich. Alternativ prüfen wir per Video."
      },
      {
        "q": "Ich habe schon ein Angebot. Könnt ihr es prüfen?",
        "a": "Ja. Wir sehen uns Anlagengröße, Komponenten, Gesamtpreis und die Annahmen zur Wirtschaftlichkeit an."
      },
      {
        "q": "Wer plant, montiert und haftet?",
        "a": "Wer plant, montiert, für die Ausführung haftet und später wartet, steht vor der Unterschrift schriftlich fest. TarifWerk ordnet die Angebote ein, die Ausführung übernimmt ein Fachbetrieb."
      },
      {
        "q": "Muss ich mich für einen Anbieter entscheiden?",
        "a": "Nein. TarifWerk arbeitet mit mehreren Partnern und ordnet verfügbare Optionen transparent ein."
      }
    ],
    "seoTitle": "Photovoltaik & Wärmepumpe einordnen | TarifWerk",
    "seoDescription": "Dach, Verbrauch und Angebot besprechen. Wer plant, montiert und haftet, klären wir vorher. Erstgespräch kostenlos.",
    "shortLabel": "Solar/PV & Wärmepumpe",
    "tickerLabel": "Solar (Photovoltaik) & Wärmepumpe"
  },
  {
    "key": "edelmetalle",
    "slug": "edelmetalle",
    "name": "Edelmetalle",
    "short": "Kosten und Risiken vor dem Kauf klären.",
    "featured": true,
    "eyebrow": "Werte & Weitblick",
    "headline": "Erst Kosten und Risiken, dann Gold.",
    "intro": "Gold und Silber können im Wert steigen oder fallen. Aufschläge, Lagerung, Verkauf und Zeithorizont werden vorab besprochen, ohne Renditeversprechen.",
    "checks": [
      "Physische Metalle und andere Formen unterscheiden",
      "Kaufpreis, Aufschlag und Rückkaufpreis verstehen",
      "Lagerung und Versicherung klären",
      "Verkauf und Verfügbarkeit des Geldes mitdenken",
      "Risiken und Zeithorizont besprechen"
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
        "a": "Nein, niemand kann das seriös. Wir sprechen über Mechanik, Risiken und Zeithorizonte, nicht über Versprechen."
      },
      {
        "q": "Was kostet der Kauf wirklich?",
        "a": "Zwischen Kauf- und Rückkaufpreis liegt ein Aufschlag, dazu kommen je nach Lösung Lager- und Versicherungskosten. Die Gesamtkosten liegen vor der Entscheidung auf dem Tisch."
      }
    ],
    "seoTitle": "Gold: Kosten und Risiken verstehen | TarifWerk",
    "seoDescription": "Aufschläge, Lagerung, Verfügbarkeit und Risiken einordnen. Keine Renditegarantie. Persönliches Erstgespräch kostenlos.",
    "tickerLabel": "Edelmetalle"
  },
  {
    "key": "immobilien",
    "slug": "immobilien",
    "name": "Immobilien",
    "short": "Budget, Nebenkosten und nächste Schritte.",
    "featured": true,
    "eyebrow": "Wohnen & Vermögen",
    "headline": "Kauf oder Verkauf? Erst Zahlen und Schritte ordnen.",
    "intro": "Budget, Nebenkosten und die nächsten Schritte eines Vorhabens werden gemeinsam geordnet. Bewertung, Finanzierung oder Verkauf übernehmen Fachpartner, deren Rolle vorher offengelegt wird.",
    "checks": [
      "Ziele, Budget und Nebenkosten einordnen",
      "Lage, Zustand und laufende Kosten mitdenken",
      "Finanzierungsbausteine verständlich besprechen",
      "Passende Fachpartner für Bewertung, Finanzierung oder Verkauf finden"
    ],
    "forWhom": [
      "Erstkäufer mit vielen offenen Fragen",
      "Kapitalanleger mit Renditeziel",
      "Eigentümer, die verkaufen oder umschulden möchten"
    ],
    "faq": [
      {
        "q": "Vermittelt ihr auch Objekte?",
        "a": "Ob TarifWerk selbst vermittelt oder an einen Fachpartner übergibt, legen wir vor jedem Schritt offen, ebenso wer dafür eine Vergütung erhält. Die Entscheidung bleibt beim Kunden."
      },
      {
        "q": "Welche Nebenkosten fallen beim Kauf an?",
        "a": "Zum Kaufpreis kommen Grunderwerbsteuer, Notar- und Grundbuchkosten und gegebenenfalls eine Maklerprovision. Die Grunderwerbsteuer hängt vom Bundesland ab. Wir rechnen das für das konkrete Vorhaben durch."
      },
      {
        "q": "Was kostet die Erstberatung?",
        "a": "Nichts. Das erste Gespräch ist kostenlos und unverbindlich."
      }
    ],
    "seoTitle": "Immobilienvorhaben strukturiert besprechen | TarifWerk",
    "seoDescription": "Budget, Nebenkosten und nächste Fachschritte rund um Kauf oder Verkauf ordnen. Rollen der Fachpartner legen wir offen.",
    "tickerLabel": "Immobilien"
  }
];

export const SERVICE_IMAGES: Partial<Record<ServiceKey, { src: string; alt: string }>> = {
  internet: {
    src: "https://images.pexels.com/photos/28348054/pexels-photo-28348054.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Moderner WLAN-Router als Symbol für Internet, Mobilfunk und vernetztes Zuhause",
  },
  energie: {
    src: "https://images.pexels.com/photos/13785838/pexels-photo-13785838.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Digitaler Stromzähler als Symbol für Stromverbrauch und Energiekosten",
  },
  versicherungen: {
    src: "https://images.pexels.com/photos/7433848/pexels-photo-7433848.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Persönliches Beratungsgespräch mit Unterlagen als Symbol für Versicherungsberatung",
  },
  sicherheit: {
    src: "https://images.pexels.com/photos/27662922/pexels-photo-27662922.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Moderne Smart-Home-Sicherheitskamera und Sensoren",
  },
  klima: {
    src: "https://images.pexels.com/photos/7587368/pexels-photo-7587368.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Moderne Klimaanlage in einem hellen Wohnraum",
  },
  solar: {
    src: "https://images.pexels.com/photos/16427010/pexels-photo-16427010.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Wohnhäuser mit Photovoltaikanlagen unter blauem Himmel",
  },
  edelmetalle: {
    src: "/assets/metals.webp",
    alt: "Illustratives Motiv mit Gold- und Silberbarren",
  },
  immobilien: {
    src: "https://images.pexels.com/photos/8134821/pexels-photo-8134821.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Modernes Wohnhaus als Symbol für Immobilien und Eigentum",
  },
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
  attempted: "Angerufen · Ergebnis offen",
  reached: "Erreicht",
  no_answer: "Keine Antwort",
  callback: "Rückruf vereinbart",
  voicemail: "Mailbox",
  wrong_number: "Falsche Nummer",
  not_interested: "Kein Interesse",
};

export const LEAD_LOST_REASONS = ["price", "competitor", "no_need", "unreachable", "timing", "not_eligible", "other"] as const;
export type LeadLostReason = (typeof LEAD_LOST_REASONS)[number];

export const LEAD_LOST_REASON_LABELS: Record<LeadLostReason, string> = {
  price: "Preis zu hoch",
  competitor: "Anderer Anbieter gewählt",
  no_need: "Kein Bedarf",
  unreachable: "Nicht erreichbar",
  timing: "Falscher Zeitpunkt",
  not_eligible: "Voraussetzungen fehlen",
  other: "Sonstiges",
};

export const LEAD_TYPE_LABELS: Record<string, string> = {
  beratung: "Beratungsanfrage",
  termin: "Terminwunsch",
  tarifcheck: "Tarifcheck",
  bewerbung: "Bewerbung",
  kontakt: "Kontakt",
};
