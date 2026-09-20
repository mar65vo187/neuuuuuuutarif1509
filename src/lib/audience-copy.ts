import type { AudienceMode } from "@/components/home/AudienceProvider";

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
      body: "Sie haben einen bestehenden Vertrag, ein konkretes Angebot oder mehrere Themen gleichzeitig? Wir ordnen Ihre Situation ein, erklären die Unterschiede verständlich und sagen offen, welcher nächste Schritt sinnvoll ist – und welcher nicht.",
      primary: "Kostenlose Einschätzung anfragen",
      primaryHref: "/anfrage",
      secondary: "Zweite Meinung einholen",
      whatsapp: "Hallo TarifWerk, ich möchte kurz meine Situation besprechen.",
      checks: ["kostenlos & unverbindlich", "persönliche Rückmeldung", "Sie entscheiden selbst"],
      cardEyebrow: "So läuft es ab",
      cardTitle: "In drei Schritten zu Klarheit.",
      cardBadge: "persönlich",
      cardSteps: [
        { label: "Anliegen schildern", sub: "kurz und ohne Unterlagen-Chaos" },
        { label: "Persönliche Einschätzung", sub: "Optionen und Unterschiede verständlich" },
        { label: "Sie entscheiden", sub: "ohne Abschlussdruck" },
      ],
      person: "Marvin · Ihr Ansprechpartner",
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
      text: "Strom & Gas, Internet & Mobilfunk sowie Versicherungen sind häufig der erste Kontaktpunkt. Weitere Bereiche bleiben vollständig verfügbar – aber die Startseite führt zuerst zu den häufigsten Fragen.",
    },
    everyday: {
      eyebrow: "Alle weiteren Leistungen",
      title: "Ein Ansprechpartner – auch wenn das Thema größer wird.",
      text: "Solar, Wärmepumpe, Immobilien, Edelmetalle, Klima und Sicherheit bleiben Teil des Gesamtblicks.",
      cardCta: "Leistung ansehen",
    },
    manifesto: {
      eyebrow: "So arbeiten wir",
      titleA: "Erst verstehen.",
      titleEm: "Dann empfehlen.",
      text: "Keine große Show und kein Verkaufsdruck. Wir klären zuerst, was Sie wirklich brauchen, und erklären danach die Optionen so, dass Sie selbst entscheiden können.",
      principles: [
        { t: "Zuhören", d: "Wir starten mit Ihrer Situation – nicht mit einem Produkt." },
        { t: "Einordnen", d: "Wir zeigen Ihnen Unterschiede, Kosten und wichtige Bedingungen verständlich." },
        { t: "Klar sagen, was Sinn ergibt", d: "Wenn ein Wechsel oder Abschluss nicht sinnvoll ist, sagen wir das genauso." },
      ],
      transparency: "Erstgespräch und Tarifcheck sind kostenfrei. Kommt eine Vermittlung zustande, erhalten wir in vielen Bereichen eine Provision vom jeweiligen Anbieter. Welche Partner verfügbar sind und warum wir etwas empfehlen, erklären wir Ihnen offen.",
    },
    proof: {
      eyebrow: "Was Sie von uns erwarten können",
      title: "Persönlich, nachvollziehbar und ohne unnötiges Drumherum.",
      text: "Sie bekommen eine klare Einordnung statt einer Liste voller Optionen ohne Erklärung.",
      items: [
        { k: "Ein Kontakt", v: "Sie wissen, wer für Sie zuständig ist" },
        { k: "Klare Gründe", v: "Sie verstehen, warum wir etwas empfehlen" },
        { k: "Offene Grenzen", v: "wir sagen auch, wenn etwas nicht passt" },
      ],
    },
    process: {
      eyebrow: "So funktioniert TarifWerk",
      title: "Anfrage. Einschätzung. Entscheidung.",
      steps: [
        { step: "01", title: "Anfrage in wenigen Minuten", text: "Sie nennen Thema, Ausgangslage und wie wir Sie am besten erreichen." },
        { step: "02", title: "Persönliche Einschätzung", text: "Wir prüfen Bedarf, bestehende Verträge oder Angebote und erklären die relevanten Unterschiede." },
        { step: "03", title: "Sie entscheiden", text: "Sie erhalten einen klaren nächsten Schritt. Eine Umsetzung erfolgt nur, wenn Sie das möchten." },
      ],
    },
    finder: {
      eyebrow: "Direkt starten",
      titleA: "Worum geht es",
      titleEm: "bei Ihnen?",
      text: "Thema auswählen, Region angeben und passenden Ansprechpartner finden. Mehr brauchen wir für den ersten Schritt nicht.",
      topicLabel: "Thema auswählen",
      locationLabel: "Region (optional)",
      note: "Kostenlos · unverbindlich · persönlich",
      button: "Ansprechpartner finden",
    },
    faq: {
      eyebrow: "Häufige Fragen",
      title: "Kurz erklärt.",
      text: "Wenn Ihre Frage nicht dabei ist, schreiben Sie uns einfach.",
      whatsapp: "WhatsApp",
      items: [
        { q: "Was kostet das erste Gespräch?", a: "Nichts. Erstorientierung und Tarifcheck sind kostenlos und unverbindlich." },
        { q: "Vergleicht TarifWerk den gesamten Markt?", a: "Nein. Wir arbeiten mit verschiedenen Marktteilnehmern, aber nicht mit jedem Anbieter. Welche Partner für Ihr Thema verfügbar sind, sagen wir Ihnen offen." },
        { q: "Wie entscheidet ihr, was ihr empfehlt?", a: "Wir schauen zuerst auf Ihren Bedarf, die Gesamtkosten, Leistung, Laufzeit und Umsetzbarkeit. Danach erklären wir Ihnen, welche verfügbare Option warum passt." },
        { q: "Wie verdient TarifWerk Geld?", a: "Bei erfolgreicher Vermittlung erhalten wir in vielen Bereichen eine Provision vom jeweiligen Anbieter. Für Sie erklären wir transparent, wie die jeweilige Vermittlung funktioniert." },
        { q: "Muss ich nach dem Gespräch etwas abschließen?", a: "Nein. Sie bekommen eine Einschätzung und entscheiden danach selbst, ob Sie etwas umsetzen möchten." },
      ],
    },
    final: {
      line1: "Sagen Sie uns, worum es geht.",
      line2: "Wir bringen Klarheit rein.",
      text: "Ein kurzes Gespräch reicht, um herauszufinden, was sich lohnt und welcher nächste Schritt sinnvoll ist.",
      primaryEyebrow: "Kostenlos starten",
      primary: "Ansprechpartner finden",
      primarySub: "Thema wählen und loslegen",
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
