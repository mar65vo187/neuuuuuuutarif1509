import type { AudienceMode } from "@/lib/audience";

type ProofItem = { k: string; v: string };
type Principle = { t: string; d: string };
type Step = { step: string; title: string; text: string };
type FaqItem = { q: string; a: string };

type AudienceCopy = {
  hero: {
    eyebrow: string;
    lines: [string, string, string];
    emphasis: string;
    body: string;
    primary: string;
    primaryHref: string;
    secondary: string;
    secondaryHref: string;
    whatsapp: string;
    checks: string[];
    cardEyebrow: string;
    cardTitle: string;
    cardBadge: string;
    cardSteps: { label: string; sub: string }[];
    person: string;
    personSub: string;
    floatingTitle: string;
    floatingSub: string;
  };
  trust: ProofItem[];
  focus: { eyebrow: string; titleA: string; titleEm: string; titleB: string; text: string };
  everyday: { eyebrow: string; title: string; text: string; cardCta: string };
  manifesto: {
    eyebrow: string;
    titleA: string;
    titleEm: string;
    text: string;
    principles: Principle[];
    transparency: string;
  };
  proof: { eyebrow: string; title: string; text: string; items: ProofItem[] };
  process: { eyebrow: string; title: string; steps: Step[] };
  finder: {
    eyebrow: string;
    titleA: string;
    titleEm: string;
    text: string;
    topicLabel: string;
    locationLabel: string;
    note: string;
    button: string;
  };
  faq: { eyebrow: string; title: string; text: string; items: FaqItem[]; whatsapp: string };
  final: {
    line1: string;
    line2: string;
    text: string;
    primaryEyebrow: string;
    primary: string;
    primarySub: string;
    whatsappEyebrow: string;
    phoneEyebrow: string;
  };
};

export const AUDIENCE_COPY: Record<AudienceMode, AudienceCopy> = {
  b2c: {
    hero: {
      eyebrow: "Beratung auf Augenhöhe · persönlich · deutschlandweit",
      lines: ["Ein Haushalt.", "", "Ein Gesamtblick."],
      emphasis: "Ein Berater.",
      body: "Du hast einen bestehenden Vertrag, ein konkretes Angebot oder mehrere Themen gleichzeitig? Wir bringen Struktur rein, erklären dir die entscheidenden Unterschiede verständlich und sagen offen, welcher nächste Schritt wirklich sinnvoll ist – und welcher nicht.",
      primary: "Kostenlose Einschätzung starten",
      primaryHref: "/anfrage",
      secondary: "Zweite Meinung einholen",
      secondaryHref: "/anfrage?situation=vergleich",
      whatsapp: "Hallo TarifWerk, ich möchte kurz meine Situation besprechen.",
      checks: ["kostenlos & unverbindlich", "persönliche Rückmeldung", "Du entscheidest selbst"],
      cardEyebrow: "So läuft es ab",
      cardTitle: "In drei Schritten zu Klarheit.",
      cardBadge: "persönlich",
      cardSteps: [
        { label: "Anliegen schildern", sub: "kurz und ohne Unterlagen-Chaos" },
        { label: "Persönliche Einschätzung", sub: "Optionen und Unterschiede verständlich" },
        { label: "Du entscheidest", sub: "ohne Abschlussdruck" },
      ],
      person: "Marvin · dein Ansprechpartner",
      personSub: "persönlich erreichbar",
      floatingTitle: "",
      floatingSub: "",
    },
    trust: [
      { k: "Kostenlos", v: "unverbindlich starten" },
      { k: "Persönlich", v: "ein fester Ansprechpartner" },
      { k: "Mehrere Partner", v: "mehr als eine Standardlösung" },
      { k: "Deutschlandweit", v: "digital & nach Absprache vor Ort" },
    ],
    focus: {
      eyebrow: "Die drei häufigsten Anliegen",
      titleA: "Dort anfangen, wo",
      titleEm: "der nächste Schritt zählt.",
      titleB: "",
      text: "Strom & Gas, Internet & Mobilfunk sowie Versicherungen sind oft der erste Einstieg. Weitere Bereiche bleiben vollständig verfügbar – du startest einfach dort, wo gerade der größte Hebel liegt.",
    },
    everyday: {
      eyebrow: "Alle weiteren Leistungen",
      title: "Ein Ansprechpartner – auch wenn dein Thema größer wird.",
      text: "Solar, Wärmepumpe, Immobilien, Edelmetalle, Klima und Sicherheit bleiben Teil deines Gesamtblicks.",
      cardCta: "Leistung ansehen",
    },
    manifesto: {
      eyebrow: "So arbeiten wir",
      titleA: "Erst verstehen.",
      titleEm: "Dann empfehlen.",
      text: "Keine große Show und kein Verkaufsdruck. Wir klären zuerst, was du wirklich brauchst, und erklären dir danach die Optionen so, dass du selbst sicher entscheiden kannst.",
      principles: [
        { t: "Zuhören", d: "Wir starten mit deiner Situation – nicht mit einem Produkt." },
        { t: "Einordnen", d: "Wir zeigen dir Unterschiede, Kosten und wichtige Bedingungen verständlich." },
        { t: "Klar sagen, was Sinn ergibt", d: "Wenn ein Wechsel oder Abschluss nicht sinnvoll ist, sagen wir das genauso." },
      ],
      transparency: "Erstgespräch und Tarifcheck sind kostenfrei. Kommt eine Vermittlung zustande, erhalten wir in vielen Bereichen eine Provision vom jeweiligen Anbieter. Welche Partner verfügbar sind und warum wir etwas empfehlen, erklären wir dir offen.",
    },
    proof: {
      eyebrow: "Was du von uns erwarten kannst",
      title: "Persönlich, nachvollziehbar und ohne unnötiges Drumherum.",
      text: "Du bekommst eine klare Einordnung statt einer Liste voller Optionen ohne Erklärung.",
      items: [
        { k: "Ein Kontakt", v: "Du weißt, wer für dich zuständig ist" },
        { k: "Klare Gründe", v: "Du verstehst, warum wir etwas empfehlen" },
        { k: "Offene Grenzen", v: "wir sagen auch, wenn etwas nicht passt" },
      ],
    },
    process: {
      eyebrow: "So funktioniert TarifWerk",
      title: "Anfrage. Einschätzung. Entscheidung.",
      steps: [
        { step: "01", title: "Anfrage in wenigen Minuten", text: "Du nennst Thema, Ausgangslage und wie wir dich am besten erreichen." },
        { step: "02", title: "Persönliche Einschätzung", text: "Wir prüfen Bedarf, bestehende Verträge oder Angebote und erklären die relevanten Unterschiede." },
        { step: "03", title: "Du entscheidest", text: "Du bekommst einen klaren nächsten Schritt. Umgesetzt wird nur, was du wirklich möchtest." },
      ],
    },
    finder: {
      eyebrow: "Direkt starten",
      titleA: "Worum geht es",
      titleEm: "bei dir?",
      text: "Thema auswählen, Region angeben und passenden Ansprechpartner finden. Mehr brauchen wir für den ersten Schritt nicht.",
      topicLabel: "Thema auswählen",
      locationLabel: "Region (optional)",
      note: "Kostenlos · unverbindlich · persönlich",
      button: "Ansprechpartner finden",
    },
    faq: {
      eyebrow: "Häufige Fragen",
      title: "Kurz erklärt.",
      text: "Wenn deine Frage nicht dabei ist, schreib uns einfach.",
      whatsapp: "WhatsApp",
      items: [
        { q: "Was kostet das erste Gespräch?", a: "Nichts. Erstorientierung und Tarifcheck sind kostenlos und unverbindlich." },
        { q: "Vergleicht TarifWerk den gesamten Markt?", a: "Nein. Wir arbeiten mit verschiedenen Marktteilnehmern, aber nicht mit jedem Anbieter. Welche Partner für dein Thema verfügbar sind, sagen wir dir offen." },
        { q: "Wie entscheidet ihr, was ihr empfehlt?", a: "Wir schauen zuerst auf deinen Bedarf, die Gesamtkosten, Leistung, Laufzeit und Umsetzbarkeit. Danach erklären wir dir, welche verfügbare Option warum passt." },
        { q: "Wie verdient TarifWerk Geld?", a: "Bei erfolgreicher Vermittlung erhalten wir in vielen Bereichen eine Provision vom jeweiligen Anbieter. Dir erklären wir transparent, wie die jeweilige Vermittlung funktioniert." },
        { q: "Muss ich nach dem Gespräch etwas abschließen?", a: "Nein. Du bekommst eine Einschätzung und entscheidest danach selbst, ob du etwas umsetzen möchtest." },
      ],
    },
    final: {
      line1: "Sag uns, worum es geht.",
      line2: "Wir bringen Klarheit rein.",
      text: "Ein kurzes Gespräch reicht, um herauszufinden, was sich für dich lohnt und welcher nächste Schritt sinnvoll ist.",
      primaryEyebrow: "Kostenlos starten",
      primary: "Ansprechpartner finden",
      primarySub: "Thema wählen und Klarheit bekommen",
      whatsappEyebrow: "Schreiben",
      phoneEyebrow: "Anrufen",
    },
  },
  b2b: {
    hero: {
      eyebrow: "Business-Beratung für Telekommunikation, Energie & mehr",
      lines: ["Weniger Abstimmung.", "", "Mehr Überblick."],
      emphasis: "Ein Ansprechpartner.",
      body: "Wir bündeln Telekommunikation, Energie, Absicherung und weitere laufende Themen Ihres Unternehmens. Sie haben einen direkten Ansprechpartner, statt jedes Thema mit einem neuen Dienstleister von vorne zu beginnen.",
      primary: "Business-Anfrage starten",
      primaryHref: "/anfrage?audience=b2b",
      secondary: "Leistungen ansehen",
      secondaryHref: "/leistungen",
      whatsapp: "Hallo TarifWerk, ich möchte kurz den Bedarf meines Unternehmens besprechen.",
      checks: ["unverbindliche Bedarfsklärung", "direkter Ansprechpartner", "deutschlandweit"],
      cardEyebrow: "So läuft es ab",
      cardTitle: "Bedarf klar strukturieren.",
      cardBadge: "Business",
      cardSteps: [
        { label: "Ausgangslage aufnehmen", sub: "Verträge, Standorte und Ziele" },
        { label: "Optionen einordnen", sub: "Kosten, Leistung und Umsetzbarkeit" },
        { label: "Nächste Schritte bündeln", sub: "zentral statt über viele Kontakte" },
      ],
      person: "Marvin · Ihr Ansprechpartner",
      personSub: "direkter Kontakt für Ihre Anfrage",
      floatingTitle: "",
      floatingSub: "",
    },
    trust: [
      { k: "1 Kontakt", v: "für mehrere Themenfelder" },
      { k: "B2B", v: "Bedarf statt Standardpaket" },
      { k: "Mehrere Partner", v: "verfügbare Optionen einordnen" },
      { k: "Deutschlandweit", v: "digitale Betreuung" },
    ],
    focus: {
      eyebrow: "Business-Bereiche",
      titleA: "Ein Ansprechpartner für Themen,",
      titleEm: "die sonst Zeit kosten.",
      titleB: "",
      text: "Wir bündeln Anforderungen und Angebote, damit Sie nicht jede Anfrage, Rückfrage und Abstimmung über mehrere Stellen verteilen müssen.",
    },
    everyday: {
      eyebrow: "Weitere Themen",
      title: "Auch laufende Verträge gehören auf den Prüfstand.",
      text: "Wir schauen, was besteht, wo sich Anforderungen geändert haben und wo tatsächlich Handlungsbedarf besteht.",
      cardCta: "Mehr dazu",
    },
    manifesto: {
      eyebrow: "So arbeiten wir",
      titleA: "Erst Anforderungen klären.",
      titleEm: "Dann Angebote bewerten.",
      text: "Wir beginnen nicht mit einem Produktkatalog. Wir beginnen mit Ihrer Ausgangslage und den Kriterien, die für Ihr Unternehmen wirklich relevant sind.",
      principles: [
        { t: "Zentral bündeln", d: "Ein Ansprechpartner hält mehrere Themen und Rückfragen zusammen." },
        { t: "Sauber vergleichen", d: "Kosten, Leistung, Laufzeit, Standorte und Umsetzbarkeit werden gemeinsam betrachtet." },
        { t: "Klar empfehlen", d: "Sie sehen, welche Option warum passt – und wo ihre Grenzen liegen." },
      ],
      transparency: "Die erste Bedarfsklärung ist unverbindlich. Je nach Leistungsbereich erhalten wir Anbieterprovisionen oder arbeiten mit projektbezogenen Konditionen. Was für Ihren Fall gilt, erläutern wir vor einer Beauftragung.",
    },
    proof: {
      eyebrow: "Was Sie erwarten können",
      title: "Weniger Schnittstellen. Klarere Entscheidungen.",
      text: "Ein direkter Ansprechpartner bündelt Anforderungen, Optionen und nächste Schritte.",
      items: [
        { k: "Zentral", v: "mehrere Themen über einen Kontakt" },
        { k: "Nachvollziehbar", v: "klare Kriterien statt Bauchgefühl" },
        { k: "Pragmatisch", v: "kein Handlungsbedarf ist ebenfalls ein Ergebnis" },
      ],
    },
    process: {
      eyebrow: "So läuft es ab",
      title: "Vom Bedarf zur Entscheidung in vier klaren Schritten.",
      steps: [
        { step: "01", title: "Ausgangslage", text: "Sie nennen Ziele, Standorte und bestehende Verträge." },
        { step: "02", title: "Bedarf", text: "Wir strukturieren Kosten, Leistung und Prioritäten." },
        { step: "03", title: "Optionen", text: "Sie sehen die verfügbaren Lösungen und die relevanten Unterschiede." },
        { step: "04", title: "Umsetzung", text: "Auf Wunsch koordinieren wir die nächsten Schritte zentral." },
      ],
    },
    finder: {
      eyebrow: "Business-Anfrage",
      titleA: "Welches Thema",
      titleEm: "können wir bündeln?",
      text: "Themenfeld und Region auswählen. Wir melden uns persönlich und klären, welche Informationen für den nächsten Schritt wirklich nötig sind.",
      topicLabel: "Themenfeld auswählen",
      locationLabel: "Unternehmensstandort (optional)",
      note: "Unverbindlich · persönlich · deutschlandweit",
      button: "Business-Anfrage starten",
    },
    faq: {
      eyebrow: "Häufige Fragen",
      title: "Kurz erklärt.",
      text: "Ihre Frage ist nicht dabei? Schreiben Sie uns direkt.",
      whatsapp: "WhatsApp",
      items: [
        { q: "Für welche Unternehmen ist TarifWerk gedacht?", a: "Für Selbstständige und Unternehmen, die mehrere Vertrags-, Energie-, Absicherungs- oder Investitionsthemen strukturiert prüfen möchten." },
        { q: "Können mehrere Standorte berücksichtigt werden?", a: "Ja. Anforderungen mehrerer Standorte können gemeinsam aufgenommen und strukturiert bearbeitet werden." },
        { q: "Vergleicht TarifWerk den gesamten Markt?", a: "Nein. Wir arbeiten mit verschiedenen Marktteilnehmern, aber nicht mit jedem Anbieter. Welche Optionen verfügbar sind, zeigen wir transparent." },
        { q: "Wie wird eine Empfehlung begründet?", a: "Wir definieren zuerst die relevanten Kriterien und zeigen anschließend, welche verfügbare Option diese Anforderungen wie erfüllt." },
        { q: "Wie wird TarifWerk vergütet?", a: "Je nach Leistungsbereich erhalten wir Anbieterprovisionen oder arbeiten mit projektbezogenen Konditionen. Was für Ihren Fall gilt, erläutern wir vor einer Beauftragung." },
      ],
    },
    final: {
      line1: "Ein Thema weniger auf Ihrer Liste.",
      line2: "Wir kümmern uns um den Überblick.",
      text: "Schildern Sie uns kurz die Ausgangslage. Wir strukturieren den Bedarf und zeigen die sinnvollen nächsten Schritte.",
      primaryEyebrow: "Business",
      primary: "Anfrage starten",
      primarySub: "unverbindlich Bedarf klären",
      whatsappEyebrow: "Schreiben",
      phoneEyebrow: "Anrufen",
    },
  },
};

export const SERVICE_AUDIENCE_COPY: Record<AudienceMode, Record<string, string>> = {
  b2c: {
    internet: "Anschluss, Netz, Laufzeit und Kosten verständlich vergleichen.",
    energie: "Verbrauch, Preise und Fristen prüfen – und nur wechseln, wenn es Sinn ergibt.",
    versicherungen: "Bestehenden Schutz, mögliche Lücken und Doppelungen sauber einordnen.",
    sicherheit: "Passende Sicherheitslösungen für Objekt und tatsächlichen Bedarf finden.",
    klima: "Raum, Nutzung, Verbrauch und Budget gemeinsam betrachten.",
    solar: "Solar und Wärmepumpe als Gesamtprojekt betrachten – vom Bedarf bis zum Angebot.",
    edelmetalle: "Kosten, Risiken, Lagerung und Zeithorizont verständlich einordnen.",
    immobilien: "Budget, Nebenkosten und nächste Schritte rund um die Immobilie strukturieren.",
  },
  b2b: {
    internet: "Standorte, Bandbreite, Mobilfunk und Vertragsbedingungen gemeinsam betrachten.",
    energie: "Verbrauch, Preisstruktur und Laufzeiten sauber einordnen.",
    versicherungen: "Policen, betriebliche Risiken und mögliche Lücken strukturiert prüfen.",
    sicherheit: "Standorte, Zugänge und Technik passend zu den Abläufen betrachten.",
    klima: "Flächen, Nutzung und Energiebedarf als Gesamtbild erfassen.",
    solar: "Gebäude, Verbrauch, Investition und Umsetzbarkeit gemeinsam bewerten.",
    edelmetalle: "Kosten, Risiken und Liquidität im Unternehmenskontext einordnen.",
    immobilien: "Nutzung, Investitionsziel, Budget und nächste Fachschritte strukturieren.",
  },
};

const BUSINESS_SERVICE_FOR_WHOM: Record<string, string[]> = {
  internet: [
    "Unternehmen mit mehreren Standorten oder gewachsenem Kommunikationsbedarf",
    "Teams mit Homeoffice-, Mobilfunk- oder Glasfaserbedarf",
    "Betriebe mit auslaufenden oder unübersichtlichen Verträgen",
  ],
  energie: [
    "Unternehmen mit höherem Strom- oder Gasverbrauch",
    "Betriebe mit mehreren Standorten",
    "Unternehmen, die Preisstruktur und Laufzeiten prüfen möchten",
  ],
  versicherungen: [
    "Selbstständige und Unternehmen",
    "Betriebe mit gewachsenen Policen",
    "Unternehmen mit veränderten Risiken, Teams oder Standorten",
  ],
  sicherheit: [
    "Unternehmen mit Zutritts-, Kamera- oder Objektsicherheitsbedarf",
    "Betriebe mit mehreren Zugängen oder Standorten",
  ],
  klima: [
    "Büros, Praxen und Gewerbeflächen",
    "Unternehmen mit Kühl- oder Klimatisierungsbedarf",
  ],
  solar: [
    "Unternehmen mit geeigneten Dach- oder Freiflächen",
    "Betriebe mit höherem Stromverbrauch",
    "Eigentümer gewerblich genutzter Immobilien",
  ],
  edelmetalle: [
    "Unternehmen, die Sachwerte als möglichen Baustein prüfen",
    "Selbstständige mit langfristigem Anlagehorizont",
  ],
  immobilien: [
    "Unternehmen mit Flächen- oder Investitionsbedarf",
    "Kapitalanleger und Bestandshalter",
    "Eigentümer mit Verkaufs- oder Finanzierungsfragen",
  ],
};

export function serviceForWhomForAudience(serviceKey: string, items: string[], audience: AudienceMode) {
  if (audience === "b2b") return BUSINESS_SERVICE_FOR_WHOM[serviceKey] ?? items;
  return items;
}

const BUSINESS_SERVICE_QUESTION_OVERRIDES: Record<string, string> = {
  "Prüft ihr die Verfügbarkeit für mich?": "Prüfen Sie die Verfügbarkeit für uns?",
  "Verkauft ihr mir Verträge, die ich nicht brauche?": "Vermitteln Sie auch Verträge, die wir nicht brauchen?",
  "Kommt ihr vorbei?": "Kommen Sie auch vor Ort?",
  "Garantiert ihr Wertsteigerungen?": "Garantieren Sie Wertsteigerungen?",
  "Vermittelt ihr auch Objekte?": "Vermitteln Sie auch Objekte?",
};

export function serviceFaqForAudience(items: Array<{ q: string; a: string }>, audience: AudienceMode) {
  if (audience === "b2c") return items;
  return items.map((item) => ({
    ...item,
    q: BUSINESS_SERVICE_QUESTION_OVERRIDES[item.q] ?? item.q,
  }));
}

export function serviceChecksForAudience(items: string[], audience: AudienceMode) {
  return items.map((item) => {
    if (audience === "b2b") return item;
    return item
      .replace("Ihren Strombedarf", "deinen Strombedarf")
      .replace("Ihren Zeithorizont", "deinen Zeithorizont");
  });
}

