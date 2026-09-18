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
      eyebrow: "TarifWerk · Persönliche Beratung · deutschlandweit",
      lines: ["Verträge verstehen.", "Klarheit", "Persönlich begleitet."],
      emphasis: "gewinnen.",
      body: "Von Alltagstarifen bis zu großen Entscheidungen: Wir prüfen deine Möglichkeiten, erklären verständlich und bleiben dein Ansprechpartner – auch danach.",
      primary: "Kostenlos beraten lassen",
      primaryHref: "#berater-auswahl",
      secondary: "Frage per WhatsApp stellen",
      whatsapp: "Hallo TarifWerk, ich hätte gern eine kurze Einschätzung.",
      checks: ["Erstgespräch kostenlos", "Du entscheidest in Ruhe", "Täglich 08–22 Uhr erreichbar"],
      cardEyebrow: "So läuft die Beratung",
      cardTitle: "Ein Gespräch. Ein klarer Plan.",
      cardBadge: "persönlich",
      cardSteps: [
        { label: "Deine Situation", sub: "Zuerst hören wir zu." },
        { label: "Dein Bedarf", sub: "Was ist dir wichtig?" },
        { label: "Deine Möglichkeiten", sub: "Optionen verständlich einordnen" },
        { label: "Dein nächster Schritt", sub: "Du entscheidest in Ruhe." },
      ],
      person: "Marvin · dein Ansprechpartner",
      personSub: "antwortet persönlich – nicht per Ticket",
      floatingTitle: "Ehrliche Einschätzung",
      floatingSub: "auch wenn sie „noch nicht“ lautet",
    },
    trust: [
      { k: "Kostenlos", v: "Erstgespräch & Prüfung" },
      { k: "Ein Mensch", v: "fester Ansprechpartner" },
      { k: "Mehrere Partner", v: "Optionen statt Einheitslösung" },
      { k: "08–22 Uhr", v: "täglich erreichbar" },
    ],
    focus: {
      eyebrow: "Wo sich ein zweiter Blick besonders lohnt",
      titleA: "Große Entscheidungen, bei denen",
      titleEm: "niemand",
      titleB: "allein entscheiden sollte.",
      text: "TarifWerk bringt Klarheit in deine Möglichkeiten. Mit einem Menschen, der an deiner Seite bleibt.",
    },
    everyday: {
      eyebrow: "Und alles, was den Alltag betrifft",
      title: "Dein Alltag. Verständlich sortiert.",
      text: "Ein Blick auf das Ganze. Und die richtige Unterstützung für jeden nächsten Schritt.",
      cardCta: "Mehr erfahren",
    },
    manifesto: {
      eyebrow: "Warum es TarifWerk gibt",
      titleA: "Beratung ist kein Verkauf mit",
      titleEm: "freundlichem Gesicht.",
      text: "Ein neuer Vertrag ist ein Anfang. Gute Beratung geht weiter. Wir kennen deine Situation, denken Zusammenhänge mit und sind erreichbar, wenn das Leben neue Fragen stellt.",
      principles: [
        { t: "Persönlich statt Hotline", d: "Du sprichst mit einem Menschen, der deine Situation kennt – vor, während und nach der Entscheidung." },
        { t: "Optionen statt Einheitslösung", d: "Wir arbeiten mit unterschiedlichen Marktteilnehmern und ordnen verfügbare Möglichkeiten passend zu deinem Bedarf ein." },
        { t: "Ehrlich statt überredet", d: "Wir sagen dir auch, wenn ein Wechsel oder Abschluss aus unserer Sicht gerade keinen Sinn ergibt." },
      ],
      transparency: "Erstorientierung und Tarifcheck sind kostenfrei. Bei erfolgreicher Vermittlung erhalten wir in vielen Bereichen eine Provision vom jeweiligen Anbieter. Die konkreten Bedingungen erklären wir vor deiner Entscheidung.",
    },
    proof: {
      eyebrow: "Vertrauen entsteht durch Klarheit",
      title: "Du weißt, mit wem du sprichst – und was als Nächstes passiert.",
      text: "Keine anonymen Tickets, kein versteckter Prozess. Beratung, Rückfragen und nächste Schritte bleiben nachvollziehbar.",
      items: [
        { k: "Persönlich", v: "fester Ansprechpartner statt wechselnder Hotline" },
        { k: "Deutschlandweit", v: "digitale Beratung unabhängig vom Wohnort" },
        { k: "Transparent", v: "Konditionen und nächste Schritte werden vorab erklärt" },
      ],
    },
    process: {
      eyebrow: "So läuft es ab",
      title: "Vier Schritte. Kein Kleingedrucktes.",
      steps: [
        { step: "01", title: "Du meldest dich", text: "Per Formular, WhatsApp oder Anruf – mit deinem Thema und wann es dir passt." },
        { step: "02", title: "Wir prüfen", text: "Dein Berater schaut auf deine Situation und bestehende Verträge. Nachvollziehbar, ohne Fachchinesisch." },
        { step: "03", title: "Du bekommst Klarheit", text: "Eine ehrliche Einschätzung und konkrete Optionen. Ob und was du umsetzt, entscheidest du." },
        { step: "04", title: "Wir bleiben", text: "Wenn du möchtest, begleiten wir die Umsetzung – und sind auch danach dein Ansprechpartner." },
      ],
    },
    finder: {
      eyebrow: "Die wichtigste Entscheidung heute",
      titleA: "Finde deinen",
      titleEm: "persönlichen",
      text: "Wähle dein Thema und deinen Ort. Du siehst, wer zu dir passt, und kannst unverbindlich ein erstes Gespräch anfragen.",
      topicLabel: "1 · Worum geht es?",
      locationLabel: "2 · Wo bist du?",
      note: "Kostenlos · unverbindlich · Antwort persönlich",
      button: "Passende Berater anzeigen",
    },
    faq: {
      eyebrow: "Häufige Fragen",
      title: "Was du vorher wissen willst.",
      text: "Nicht dabei? Schreib uns – die Antwort kommt persönlich.",
      whatsapp: "WhatsApp",
      items: [
        { q: "Was kostet das erste Gespräch?", a: "Erstorientierung und Tarifcheck sind kostenlos und unverbindlich. Bei einer konkreten Vermittlung erklären wir dir die jeweiligen Konditionen und die Vergütung vor deiner Entscheidung." },
        { q: "Bin ich an einen bestimmten Anbieter gebunden?", a: "Nein. Je nach Thema stehen unterschiedliche Marktpartner und Optionen zur Verfügung. Wir erklären transparent, welche Möglichkeiten wir konkret anbieten können." },
        { q: "Bleibt mein Berater nach dem Abschluss erreichbar?", a: "Ja. Dein persönlicher Ansprechpartner bleibt für Rückfragen, Änderungen und weitere Themen erreichbar." },
        { q: "Kann ich mich deutschlandweit beraten lassen?", a: "Ja. Digitale Beratung ist deutschlandweit möglich. Persönliche Treffen stimmen wir individuell ab." },
        { q: "Muss ich mich sofort entscheiden?", a: "Nein. Du bekommst eine verständliche Einschätzung und entscheidest in Ruhe, ob und wie es weitergeht." },
      ],
    },
    final: {
      line1: "Du musst nicht alles wissen.",
      line2: "Du musst nur jemanden kennen, der fragt.",
      text: "Ein Gespräch, keine Verpflichtung. Danach weißt du, wo du stehst – und was sich für dich lohnt.",
      primaryEyebrow: "Empfohlen",
      primary: "Berater finden",
      primarySub: "Passend zu Thema & Region",
      whatsappEyebrow: "Schnell",
      phoneEyebrow: "Direkt",
    },
  },
  b2b: {
    hero: {
      eyebrow: "TarifWerk Business · Persönliche Betreuung · deutschlandweit",
      lines: ["Betriebskosten verstehen.", "Potenziale", "Strukturiert begleitet."],
      emphasis: "heben.",
      body: "Von Telekommunikation und Energie bis zu Absicherung, Immobilien und technischen Lösungen: Wir strukturieren Ihren Bedarf, koordinieren passende Optionen und schaffen einen klaren Entscheidungsweg.",
      primary: "Unternehmensangebot anfragen",
      primaryHref: "/anfrage?audience=b2b",
      secondary: "Business-Anfrage per WhatsApp",
      whatsapp: "Hallo TarifWerk, ich möchte eine unverbindliche Beratung für mein Unternehmen anfragen.",
      checks: ["Bedarfsklärung unverbindlich", "Fester Ansprechpartner", "Deutschlandweit betreut"],
      cardEyebrow: "So läuft die Business-Beratung",
      cardTitle: "Ein Ansprechpartner. Ein strukturierter Prozess.",
      cardBadge: "Business",
      cardSteps: [
        { label: "Ihre Ausgangslage", sub: "Verträge, Standorte und Bedarf erfassen" },
        { label: "Ihre Prioritäten", sub: "Kosten, Prozesse und Anforderungen ordnen" },
        { label: "Ihre Optionen", sub: "Lösungen und Partner nachvollziehbar vergleichen" },
        { label: "Ihre Umsetzung", sub: "Nächste Schritte klar koordinieren" },
      ],
      person: "Marvin · Ihr Ansprechpartner",
      personSub: "direkter Kontakt statt anonymer Ticketkette",
      floatingTitle: "Klare Entscheidungsgrundlage",
      floatingSub: "vor Vertragsabschluss und Umsetzung",
    },
    trust: [
      { k: "Unverbindlich", v: "Bedarf & Ausgangslage klären" },
      { k: "Ein Kontakt", v: "fester Ansprechpartner" },
      { k: "Mehrere Partner", v: "bedarfsgerechte Optionen" },
      { k: "Deutschlandweit", v: "digitale Betreuung" },
    ],
    focus: {
      eyebrow: "Wo strukturierte Entscheidungen Wirkung entfalten",
      titleA: "Komplexe Themen, bei denen",
      titleEm: "Übersicht",
      titleB: "Zeit und Fehlentscheidungen spart.",
      text: "TarifWerk bündelt Anforderungen, Optionen und nächste Schritte in einem nachvollziehbaren Beratungsprozess für Ihr Unternehmen.",
    },
    everyday: {
      eyebrow: "Leistungen für den laufenden Betrieb",
      title: "Ihr Bedarf. Strukturiert gebündelt.",
      text: "Von laufenden Verträgen bis zu größeren Investitionsentscheidungen: ein zentraler Ansprechpartner für mehrere Themenfelder.",
      cardCta: "Business-Lösung ansehen",
    },
    manifesto: {
      eyebrow: "Warum Unternehmen TarifWerk einsetzen",
      titleA: "Gute Beschaffung beginnt mit",
      titleEm: "klaren Anforderungen.",
      text: "Unser Ziel ist nicht, möglichst viele Einzelprodukte zu platzieren. Wir strukturieren Ihren Bedarf, machen Optionen verständlich und begleiten die Umsetzung über mehrere Themenfelder hinweg.",
      principles: [
        { t: "Ein Ansprechpartner", d: "Sie bündeln Rückfragen und Abstimmung bei einem festen Kontakt statt über mehrere anonyme Kanäle." },
        { t: "Bedarf vor Produkt", d: "Wir starten mit Ihrer Ausgangslage, Ihren Prioritäten und den verfügbaren Optionen – nicht mit einer vorgefertigten Lösung." },
        { t: "Transparenz vor Abschluss", d: "Leistungsumfang, Konditionen und nächste Schritte werden nachvollziehbar eingeordnet, bevor Sie entscheiden." },
      ],
      transparency: "Die erste Bedarfsklärung ist unverbindlich. Je nach Leistungsbereich entstehen Anbieterprovisionen oder projektbezogene Konditionen. Welche Vergütung für Ihren konkreten Fall gilt, wird vor einer Beauftragung transparent erläutert.",
    },
    proof: {
      eyebrow: "B2B-Vertrauen durch Prozessqualität",
      title: "Weniger Schnittstellen. Mehr Übersicht über Entscheidungen und nächste Schritte.",
      text: "Ein klarer Ansprechpartner, dokumentierte Anforderungen und strukturierte Übergaben schaffen Verlässlichkeit – vom Erstgespräch bis zur Umsetzung.",
      items: [
        { k: "Zentral", v: "mehrere Themen über einen Ansprechpartner koordinieren" },
        { k: "Skalierbar", v: "auch mehrere Standorte und wiederkehrende Bedarfe strukturiert erfassen" },
        { k: "Nachvollziehbar", v: "Anforderungen, Angebote und nächste Schritte klar dokumentieren" },
      ],
    },
    process: {
      eyebrow: "Business-Funnel",
      title: "Vier Schritte bis zur belastbaren Entscheidungsgrundlage.",
      steps: [
        { step: "01", title: "Bedarf aufnehmen", text: "Sie schildern Ziele, aktuelle Verträge, Standorte und Prioritäten." },
        { step: "02", title: "Strukturieren & prüfen", text: "Wir ordnen Anforderungen und identifizieren die relevanten Handlungsfelder." },
        { step: "03", title: "Optionen abstimmen", text: "Sie erhalten nachvollziehbare Lösungswege und die dazugehörigen nächsten Schritte." },
        { step: "04", title: "Umsetzung begleiten", text: "Auf Wunsch koordinieren wir Vermittlung, Übergabe und weitere Abstimmungen." },
      ],
    },
    finder: {
      eyebrow: "Der richtige Einstieg für Ihr Unternehmen",
      titleA: "Finden Sie Ihren",
      titleEm: "Business-Ansprechpartner",
      text: "Wählen Sie Themenfeld und Region. Wir ordnen Ihre Anfrage ein und stimmen den passenden nächsten Schritt persönlich mit Ihnen ab.",
      topicLabel: "1 · Welches Thema ist relevant?",
      locationLabel: "2 · Wo sitzt Ihr Unternehmen?",
      note: "Unverbindlich · persönlich · deutschlandweit",
      button: "Business-Ansprechpartner anzeigen",
    },
    faq: {
      eyebrow: "Häufige Business-Fragen",
      title: "Was Sie vor dem Erstgespräch wissen sollten.",
      text: "Ihre Frage ist nicht dabei? Senden Sie uns Ihre Ausgangslage – wir antworten persönlich.",
      whatsapp: "Business-WhatsApp",
      items: [
        { q: "Beraten Sie auch Selbstständige und Unternehmen?", a: "Ja. Wir begleiten Selbstständige und Unternehmen bei unterschiedlichen Vertrags-, Energie-, Absicherungs- und Investitionsthemen. Welche Bereiche konkret passen, klären wir im Erstgespräch." },
        { q: "Können mehrere Standorte berücksichtigt werden?", a: "Ja. Anforderungen mehrerer Standorte können gemeinsam aufgenommen und strukturiert bearbeitet werden. Die konkrete Umsetzbarkeit hängt vom jeweiligen Leistungsbereich und Anbieter ab." },
        { q: "Wie läuft eine Angebotsanfrage ab?", a: "Sie übermitteln die wichtigsten Eckdaten. Wir klären offene Punkte, strukturieren den Bedarf und stimmen mit Ihnen ab, welche Optionen oder Partner sinnvoll geprüft werden." },
        { q: "Wie wird TarifWerk vergütet?", a: "Je nach Leistungsbereich erhalten wir Anbieterprovisionen oder arbeiten mit projektbezogenen Konditionen. Die für Ihren konkreten Fall relevante Vergütung erläutern wir transparent vor einer Beauftragung." },
        { q: "Ist eine deutschlandweite Betreuung möglich?", a: "Ja. Die Beratung und Abstimmung kann deutschlandweit digital erfolgen. Persönliche Termine werden individuell vereinbart." },
      ],
    },
    final: {
      line1: "Komplexität kostet Zeit.",
      line2: "Ein klarer Prozess schafft Entscheidungsfähigkeit.",
      text: "Schildern Sie uns Ihre Ausgangslage. Wir strukturieren den Bedarf und stimmen mit Ihnen den sinnvollsten nächsten Schritt ab.",
      primaryEyebrow: "Business",
      primary: "Angebot anfragen",
      primarySub: "Bedarf unverbindlich klären",
      whatsappEyebrow: "Direkter Kontakt",
      phoneEyebrow: "Persönlich",
    },
  },
};

export const SERVICE_AUDIENCE_COPY: Record<AudienceMode, Record<string, string>> = {
  b2c: {
    internet: "Internet, Mobilfunk und TV verständlich prüfen und passend zu deinem Alltag einordnen.",
    energie: "Strom und Gas nachvollziehbar vergleichen und bestehende Verträge bewusst prüfen.",
    versicherungen: "Absicherung verständlich einordnen und wichtige Lücken oder Doppelungen besprechen.",
    sicherheit: "Sicherheitslösungen passend zu Zuhause, Alltag und persönlichem Bedarf einordnen.",
    klima: "Klimatisierung passend zu Räumen, Nutzung und Budget strukturiert prüfen.",
    solar: "Photovoltaik und Wärmepumpe gemeinsam mit Verbrauch, Gebäude und Budget betrachten.",
    edelmetalle: "Gold und Silber mit Kosten, Risiken und Zeithorizont verständlich einordnen.",
    immobilien: "Eigenheim, Kapitalanlage oder Orientierung mit passenden nächsten Schritten strukturieren.",
  },
  b2b: {
    internet: "Business-Internet, Mobilfunk und Kommunikation passend zu Standorten, Nutzern und Anforderungen strukturieren.",
    energie: "Energieverträge und betriebliche Verbrauchssituationen nachvollziehbar erfassen und Optionen prüfen.",
    versicherungen: "Betriebliche Absicherung und bestehende Policen strukturiert in den Gesamtkontext einordnen.",
    sicherheit: "Sicherheitslösungen für Standorte, Zugänge und betriebliche Anforderungen passend koordinieren.",
    klima: "Klima- und Gebäudelösungen entlang von Nutzung, Flächen und betrieblichen Anforderungen prüfen.",
    solar: "Photovoltaik und Wärmepumpe im Kontext von Gebäuden, Verbrauch, Investition und Umsetzung einordnen.",
    edelmetalle: "Sachwertthemen mit Kosten, Risiken und Unternehmenskontext nachvollziehbar besprechen.",
    immobilien: "Gewerbliche oder investitionsbezogene Immobilienfragen strukturiert mit passenden Fachpartnern weiterführen.",
  },
};
