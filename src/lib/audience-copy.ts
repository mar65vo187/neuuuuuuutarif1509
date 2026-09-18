import type { AudienceMode } from "@/components/home/AudienceProvider";

type ProofItem = { k: string; v: string };
type Principle = { t: string; d: string };
type Step = { step: string; title: string; text: string };
type FaqItem = { q: string; a: string };

export const AUDIENCE_COPY: Record<AudienceMode, {
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
  proof: {
    eyebrow: string;
    title: string;
    text: string;
    items: ProofItem[];
  };
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
}> = {
  b2c: {
    hero: {
      eyebrow: "TarifWerk · Persönliche Beratung für Privatkunden · deutschlandweit",
      lines: ["Tarife, Energie & Verträge.", "Viele Themen.", "Deutschlandweit."],
      emphasis: "Ein Ansprechpartner.",
      body: "Von Internet und Mobilfunk über Strom, Gas und Versicherungen bis Solar, Wärmepumpe und Immobilien: Wir prüfen deine Möglichkeiten, erklären die Unterschiede und begleiten dich bei der Entscheidung.",
      primary: "Kostenlos prüfen lassen",
      primaryHref: "#berater-auswahl",
      secondary: "Persönlich per WhatsApp fragen",
      whatsapp: "Hallo TarifWerk, ich möchte kurz prüfen lassen, welche Möglichkeiten zu meiner Situation passen.",
      checks: [
        "Ein Ansprechpartner statt vieler einzelner Stellen",
        "Kostenlose Erstorientierung",
        "Du entscheidest danach selbst",
      ],
      cardEyebrow: "Das TarifWerk-Prinzip",
      cardTitle: "Erst verstehen. Dann entscheiden.",
      cardBadge: "persönlich",
      cardSteps: [
        { label: "Situation verstehen", sub: "Was hast du heute – und was stört dich?" },
        { label: "Bedarf einordnen", sub: "Was brauchst du wirklich?" },
        { label: "Optionen erklären", sub: "Unterschiede, Kosten und Bedingungen" },
        { label: "Entscheidung begleiten", sub: "Du weißt, warum du dich entscheidest." },
      ],
      person: "Marvin · dein Ansprechpartner",
      personSub: "kennt deine Anfrage und bleibt erreichbar",
      floatingTitle: "Viele Themen. Ein Ansprechpartner.",
      floatingSub: "statt bei jedem Thema wieder bei null anzufangen",
    },
    trust: [
      { k: "1 Kontakt", v: "fester Ansprechpartner" },
      { k: "Viele Themen", v: "von Tarifen bis größeren Vorhaben" },
      { k: "Mehrere Partner", v: "keine Bindung an nur einen Anbieter" },
      { k: "08–22 Uhr", v: "täglich erreichbar" },
    ],
    focus: {
      eyebrow: "Wenn eine Entscheidung mehr verdient als einen Preisvergleich",
      titleA: "Du musst nicht alles selbst",
      titleEm: "durchblicken.",
      titleB: "Du brauchst einen klaren Vergleich.",
      text: "Wir schauen nicht nur auf ein Produkt. Wir ordnen ein, welche Möglichkeiten zu deiner Situation passen, worin sie sich unterscheiden und was du guten Gewissens weglassen kannst.",
    },
    everyday: {
      eyebrow: "Auch bei den Dingen, die jeden Monat weiterlaufen",
      title: "Bestehende Verträge nicht einfach laufen lassen.",
      text: "Wir prüfen, was du heute hast, was sich verändert hat und ob Handlungsbedarf besteht. Wenn alles passt, sagen wir das genauso.",
      cardCta: "Optionen ansehen",
    },
    manifesto: {
      eyebrow: "Wie TarifWerk berät",
      titleA: "Nicht mit einem Produkt starten.",
      titleEm: "Mit deiner Situation.",
      text: "Gute Beratung bedeutet für uns nicht, möglichst schnell etwas Neues abzuschließen. Sie bedeutet, zuerst zu verstehen, welche Entscheidung vor dir liegt – und dir danach klar zu sagen, welche Optionen wir für sinnvoll halten und warum.",
      principles: [
        {
          t: "Ein Ansprechpartner",
          d: "Du musst deine Situation nicht bei jedem neuen Thema wieder von vorne erklären. Dein Ansprechpartner kennt den Kontext und bleibt erreichbar.",
        },
        {
          t: "Kriterien offenlegen",
          d: "Wir erklären, was wir vergleichen, welche Unterschiede relevant sind und warum wir eine bestimmte Option empfehlen.",
        },
        {
          t: "Auch ein Nein ist ein Ergebnis",
          d: "Wenn ein Wechsel oder Abschluss aus unserer Sicht gerade keinen Sinn ergibt, sagen wir dir das klar.",
        },
      ],
      transparency: "Erstorientierung und Tarifcheck sind kostenfrei. Kommt eine Vermittlung zustande, erhalten wir in vielen Bereichen eine Provision vom jeweiligen Anbieter. Welche Kriterien wir vergleichen, welche Partner verfügbar sind und warum wir etwas empfehlen, legen wir im Gespräch nachvollziehbar dar.",
    },
    proof: {
      eyebrow: "Vertrauen braucht mehr als ein Versprechen",
      title: "Du kannst nachvollziehen, wie eine Empfehlung zustande kommt.",
      text: "Nicht „vertrau uns einfach“, sondern ein klarer Ablauf: Ausgangslage verstehen, Kriterien festlegen, verfügbare Optionen einordnen und die Unterschiede erklären.",
      items: [
        { k: "Nachvollziehbar", v: "du erfährst, welche Kriterien für die Empfehlung ausschlaggebend sind" },
        { k: "Persönlich", v: "ein fester Ansprechpartner kennt deinen Fall und bleibt erreichbar" },
        { k: "Transparent", v: "Partner, Konditionen und Vergütungsweg werden offen eingeordnet" },
      ],
    },
    process: {
      eyebrow: "So entsteht eine Entscheidung",
      title: "Vier Schritte. Du weißt jederzeit, was als Nächstes passiert.",
      steps: [
        { step: "01", title: "Du schilderst deine Situation", text: "Kurz sagen, worum es geht, was heute besteht und was dir wichtig ist." },
        { step: "02", title: "Wir sortieren die Fakten", text: "Bedarf, bestehende Verträge, relevante Kosten, Fristen und Rahmenbedingungen kommen auf den Tisch." },
        { step: "03", title: "Du siehst die Unterschiede", text: "Wir erklären dir konkrete Optionen und warum sie zu deiner Situation passen – oder eben nicht." },
        { step: "04", title: "Wir begleiten den nächsten Schritt", text: "Wenn du dich entscheidest, koordinieren wir die Umsetzung und bleiben auch danach erreichbar." },
      ],
    },
    finder: {
      eyebrow: "Der einfachste Einstieg",
      titleA: "Finde deinen",
      titleEm: "persönlichen Ansprechpartner",
      text: "Wähle dein Thema und deine Region. Du bekommst einen passenden Kontakt und kannst deine Situation unverbindlich schildern.",
      topicLabel: "1 · Worum geht es?",
      locationLabel: "2 · Wo bist du?",
      note: "Kostenlos · unverbindlich · persönliche Rückmeldung",
      button: "Ansprechpartner anzeigen",
    },
    faq: {
      eyebrow: "Die Fragen, die wirklich zählen",
      title: "Was du vor einer Beratung wissen solltest.",
      text: "Keine Werbeantwort dabei? Schreib uns direkt – wir antworten persönlich.",
      whatsapp: "Frage per WhatsApp",
      items: [
        {
          q: "Was kostet das erste Gespräch?",
          a: "Erstorientierung und Tarifcheck sind kostenlos und unverbindlich. Entsteht daraus eine konkrete Vermittlung, erklären wir dir vorher, welche Konditionen für deinen Fall gelten.",
        },
        {
          q: "Vergleicht TarifWerk den gesamten Markt?",
          a: "Nein. Wir arbeiten mit verschiedenen großen und kleineren Marktteilnehmern, aber nicht mit jedem Anbieter am Markt. Welche Partner und Optionen für dein Anliegen verfügbar sind, sagen wir dir offen.",
        },
        {
          q: "Wie entscheidet ihr, was ihr empfehlt?",
          a: "Wir starten mit deiner Situation und legen die relevanten Kriterien fest – zum Beispiel Leistung, Gesamtkosten, Laufzeit, Bedarf und Umsetzbarkeit. Danach erklären wir dir, warum wir eine Option für passend halten.",
        },
        {
          q: "Wie verdient TarifWerk Geld?",
          a: "Bei erfolgreicher Vermittlung erhalten wir in vielen Bereichen eine Provision vom jeweiligen Anbieter. Erstorientierung und Tarifcheck sind kostenfrei. Den für dein Anliegen relevanten Vergütungsweg erklären wir transparent.",
        },
        {
          q: "Muss ich mich nach der Beratung entscheiden?",
          a: "Nein. Ziel des ersten Gesprächs ist, dass du deine Situation und die nächsten Möglichkeiten besser einschätzen kannst. Ob du etwas umsetzt, entscheidest du danach selbst.",
        },
      ],
    },
    final: {
      line1: "Du musst nicht jeden Tarif kennen.",
      line2: "Du brauchst Klarheit darüber, was zu dir passt.",
      text: "Schilder uns deine Situation. Danach weißt du, welche Möglichkeiten du hast, worauf du achten solltest und welcher nächste Schritt für dich Sinn ergibt.",
      primaryEyebrow: "Erster Schritt",
      primary: "Ansprechpartner finden",
      primarySub: "Thema wählen und kostenlos starten",
      whatsappEyebrow: "Persönlich",
      phoneEyebrow: "Direkt",
    },
  },
  b2b: {
    hero: {
      eyebrow: "TarifWerk Business · Für Selbstständige & Unternehmen · deutschlandweit",
      lines: ["Telekommunikation, Energie & Verträge.", "Viele Themen.", "Für Unternehmen."],
      emphasis: "Ein Ansprechpartner.",
      body: "Wir bündeln wiederkehrende Vertrags-, Versorgungs- und Investitionsthemen Ihres Unternehmens – von Telekommunikation und Energie bis zu Absicherung, Immobilien und technischen Lösungen.",
      primary: "Business-Bedarf prüfen lassen",
      primaryHref: "/anfrage?audience=b2b",
      secondary: "Business-Anfrage per WhatsApp",
      whatsapp: "Hallo TarifWerk, ich möchte den Bedarf meines Unternehmens unverbindlich mit Ihnen prüfen.",
      checks: [
        "Ein Ansprechpartner für mehrere Themenfelder",
        "Unverbindliche Bedarfsklärung",
        "Deutschlandweite Betreuung",
      ],
      cardEyebrow: "Das TarifWerk-Business-Prinzip",
      cardTitle: "Anforderungen klären. Dann Lösungen vergleichen.",
      cardBadge: "Business",
      cardSteps: [
        { label: "Ausgangslage erfassen", sub: "Verträge, Standorte und Anforderungen" },
        { label: "Prioritäten festlegen", sub: "Kosten, Leistung, Prozesse und Zeit" },
        { label: "Optionen einordnen", sub: "Unterschiede und Abhängigkeiten sichtbar machen" },
        { label: "Umsetzung koordinieren", sub: "Nächste Schritte zentral begleiten" },
      ],
      person: "Marvin · Ihr Ansprechpartner",
      personSub: "direkter Kontakt für Ihre Ausgangslage",
      floatingTitle: "Weniger Schnittstellen.",
      floatingSub: "mehr Überblick über Anforderungen und Entscheidungen",
    },
    trust: [
      { k: "1 Kontakt", v: "mehrere Themen zentral bündeln" },
      { k: "B2B-Fokus", v: "Bedarf statt Standardpaket" },
      { k: "Mehrere Partner", v: "verfügbare Optionen einordnen" },
      { k: "Deutschlandweit", v: "digitale Betreuung" },
    ],
    focus: {
      eyebrow: "Wenn mehrere Verträge und Dienstleister zusammenkommen",
      titleA: "Weniger Schnittstellen.",
      titleEm: "Mehr Überblick.",
      titleB: "Bessere Entscheidungen.",
      text: "TarifWerk schafft eine zentrale Anlaufstelle für Anforderungen, Angebote und nächste Schritte. So müssen Sie nicht jedes Thema mit einem neuen Ansprechpartner von Grund auf beginnen.",
    },
    everyday: {
      eyebrow: "Für laufende Verträge und neue Vorhaben",
      title: "Bedarf bündeln, statt Themen einzeln verwalten.",
      text: "Wir erfassen, was heute besteht, was sich verändert und wo tatsächlich Handlungsbedarf entsteht – über mehrere Themenfelder hinweg.",
      cardCta: "Business-Optionen ansehen",
    },
    manifesto: {
      eyebrow: "Wie wir mit Unternehmen arbeiten",
      titleA: "Nicht mit einem Produkt starten.",
      titleEm: "Mit Ihren Anforderungen.",
      text: "Ein gutes Angebot ist nur dann sinnvoll, wenn die Ausgangslage stimmt. Deshalb klären wir zuerst Bedarf, Prioritäten und Rahmenbedingungen – und ordnen danach die verfügbaren Lösungen nachvollziehbar ein.",
      principles: [
        {
          t: "Ein zentraler Ansprechpartner",
          d: "Sie bündeln Abstimmungen über mehrere Themenfelder und müssen Anforderungen nicht bei jedem neuen Anbieter erneut erklären.",
        },
        {
          t: "Kriterien vor Produkt",
          d: "Kosten, Leistung, Laufzeit, Standorte, Prozesse und Umsetzbarkeit werden zuerst geklärt. Erst danach bewerten wir Optionen.",
        },
        {
          t: "Empfehlungen mit Begründung",
          d: "Sie sehen, welche Kriterien den Ausschlag geben, welche Alternativen bestehen und welche Grenzen eine Lösung hat.",
        },
      ],
      transparency: "Die erste Bedarfsklärung ist unverbindlich. Je nach Leistungsbereich erhalten wir Anbieterprovisionen oder arbeiten mit projektbezogenen Konditionen. Welche Vergütung und welche verfügbaren Partner für Ihren konkreten Fall relevant sind, erläutern wir vor einer Beauftragung.",
    },
    proof: {
      eyebrow: "Prozessqualität statt Werbeversprechen",
      title: "Sie sehen, welche Anforderungen geprüft wurden und warum eine Option empfohlen wird.",
      text: "Ein fester Ansprechpartner, klar definierte Kriterien und nachvollziehbare nächste Schritte reduzieren Abstimmungsaufwand und schaffen eine belastbare Entscheidungsgrundlage.",
      items: [
        { k: "Zentral", v: "mehrere Themen, Anforderungen und Rückfragen über einen festen Ansprechpartner bündeln" },
        { k: "Nachvollziehbar", v: "Kriterien, Optionen und nächste Schritte werden konkret dokumentiert und erklärt" },
        { k: "Pragmatisch", v: "wenn kein sinnvoller Handlungsbedarf besteht, ist auch das ein verwertbares Ergebnis" },
      ],
    },
    process: {
      eyebrow: "Vom Bedarf zur Umsetzung",
      title: "Vier Schritte zu einer belastbaren Entscheidungsgrundlage.",
      steps: [
        { step: "01", title: "Ausgangslage erfassen", text: "Sie schildern Ziele, bestehende Verträge, Standorte und relevante Rahmenbedingungen." },
        { step: "02", title: "Anforderungen strukturieren", text: "Wir ordnen Kosten, Leistung, Prioritäten und Abhängigkeiten in einen klaren Bedarf." },
        { step: "03", title: "Optionen nachvollziehbar bewerten", text: "Sie sehen, welche Lösungen verfügbar sind, worin sie sich unterscheiden und warum wir etwas empfehlen." },
        { step: "04", title: "Umsetzung koordinieren", text: "Auf Wunsch begleiten wir Vermittlung, Übergaben und weitere Abstimmungen zentral." },
      ],
    },
    finder: {
      eyebrow: "Der richtige Einstieg für Ihr Unternehmen",
      titleA: "Finden Sie Ihren",
      titleEm: "Business-Ansprechpartner",
      text: "Wählen Sie Themenfeld und Region. Wir ordnen Ihre Anfrage ein und klären persönlich, welche Informationen für den nächsten Schritt tatsächlich benötigt werden.",
      topicLabel: "1 · Welches Thema ist relevant?",
      locationLabel: "2 · Wo sitzt Ihr Unternehmen?",
      note: "Unverbindlich · persönlich · deutschlandweit",
      button: "Business-Ansprechpartner anzeigen",
    },
    faq: {
      eyebrow: "Häufige Business-Fragen",
      title: "Was Sie vor der Bedarfsklärung wissen sollten.",
      text: "Ihre Frage ist nicht dabei? Schildern Sie uns kurz die Ausgangslage – wir antworten persönlich.",
      whatsapp: "Business-WhatsApp",
      items: [
        {
          q: "Für welche Unternehmen ist TarifWerk gedacht?",
          a: "Wir begleiten Selbstständige und Unternehmen, die Vertrags-, Energie-, Absicherungs- oder Investitionsthemen strukturiert prüfen möchten. Welche Bereiche konkret passen, klären wir anhand Ihrer Ausgangslage.",
        },
        {
          q: "Können mehrere Standorte berücksichtigt werden?",
          a: "Ja. Anforderungen mehrerer Standorte können gemeinsam aufgenommen und strukturiert bearbeitet werden. Welche Lösungen verfügbar sind, hängt vom jeweiligen Leistungsbereich und Anbieter ab.",
        },
        {
          q: "Vergleichen Sie den gesamten Markt?",
          a: "Nein. TarifWerk arbeitet mit verschiedenen Marktteilnehmern, aber nicht mit jedem Anbieter. Wir zeigen transparent, welche Partner und Optionen für Ihren konkreten Bedarf verfügbar sind.",
        },
        {
          q: "Wie wird eine Empfehlung begründet?",
          a: "Wir definieren zuerst die relevanten Kriterien – zum Beispiel Kosten, Leistung, Laufzeit, Standorte und Umsetzbarkeit. Danach erläutern wir, welche verfügbaren Optionen diese Anforderungen wie erfüllen.",
        },
        {
          q: "Wie wird TarifWerk vergütet?",
          a: "Je nach Leistungsbereich erhalten wir Anbieterprovisionen oder arbeiten mit projektbezogenen Konditionen. Welche Vergütung für Ihren konkreten Fall gilt, erläutern wir vor einer Beauftragung.",
        },
      ],
    },
    final: {
      line1: "Sie müssen nicht jede Option selbst koordinieren.",
      line2: "Sie brauchen eine klare Entscheidungsgrundlage.",
      text: "Schildern Sie uns Ihre Ausgangslage. Wir strukturieren den Bedarf, ordnen verfügbare Optionen ein und zeigen, welcher nächste Schritt für Ihr Unternehmen sinnvoll ist.",
      primaryEyebrow: "Business",
      primary: "Bedarf prüfen lassen",
      primarySub: "Ausgangslage unverbindlich klären",
      whatsappEyebrow: "Direkter Kontakt",
      phoneEyebrow: "Persönlich",
    },
  },
};

export const SERVICE_AUDIENCE_COPY: Record<AudienceMode, Record<string, string>> = {
  b2c: {
    internet: "Du weißt danach, welcher Anschluss zu deiner Nutzung passt, welche Unterschiede relevant sind und ob ein Wechsel überhaupt sinnvoll ist.",
    energie: "Verbrauch, Preise, Laufzeiten und Fristen werden so eingeordnet, dass du weißt, ob Handlungsbedarf besteht.",
    versicherungen: "Bestehende Absicherung, mögliche Lücken und Doppelungen werden verständlich sortiert – mit passenden Fachpartnern, wenn es konkret wird.",
    sicherheit: "Du bekommst Klarheit darüber, welche Sicherheitslösung zu Objekt, Alltag und tatsächlichem Bedarf passt.",
    klima: "Raumgröße, Nutzung, Verbrauch und Budget werden zusammen betrachtet, bevor eine konkrete Lösung ausgewählt wird.",
    solar: "Dach, Gebäude, Verbrauch, Budget und Umsetzung werden gemeinsam betrachtet, damit Angebote vergleichbar werden.",
    edelmetalle: "Kosten, Risiken, Aufschläge, Lagerung und Zeithorizont werden verständlich eingeordnet – ohne Renditeversprechen.",
    immobilien: "Ziele, Budget, Nebenkosten und nächste Fachschritte werden so sortiert, dass du fundierter entscheiden kannst.",
  },
  b2b: {
    internet: "Standorte, Nutzer, Bandbreite, Mobilfunk und Vertragsbedingungen werden als Gesamtbedarf betrachtet – nicht als einzelne Tarife.",
    energie: "Verbrauch, Preisstruktur, Laufzeiten und betriebliche Anforderungen werden erfasst, damit Handlungsbedarf und Optionen klar werden.",
    versicherungen: "Bestehende Policen, betriebliche Risiken und mögliche Lücken werden strukturiert eingeordnet und mit Fachpartnern weitergeführt.",
    sicherheit: "Standorte, Zugänge, Technik und betriebliche Abläufe werden gemeinsam betrachtet, bevor eine Sicherheitslösung ausgewählt wird.",
    klima: "Flächen, Nutzung, Energiebedarf und betriebliche Rahmenbedingungen werden als Grundlage für passende Klima- und Gebäudelösungen erfasst.",
    solar: "Gebäude, Verbrauch, Investition und Umsetzbarkeit werden gemeinsam betrachtet, damit Angebote belastbar verglichen werden können.",
    edelmetalle: "Kosten, Risiken, Liquidität und Unternehmenskontext werden nachvollziehbar eingeordnet – ohne Renditeversprechen.",
    immobilien: "Nutzung, Investitionsziel, Budget und Fachpartner werden strukturiert zusammengeführt, statt einzelne Schritte isoliert zu betrachten.",
  },
};
