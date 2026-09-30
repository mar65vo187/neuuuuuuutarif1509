export type LocalPage = {
  slug: string;
  city: string;
  region: string;
  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  introPrivate: string;
  localText: string;
  localTextPrivate: string;
  contactText: string;
};

export const LOCAL_PAGES: Record<string, LocalPage> = {
  wiesbaden: {
    slug: "wiesbaden",
    city: "Wiesbaden",
    region: "Hessen",
    eyebrow: "TarifWerk in Wiesbaden",
    title: "Vertrag oder Angebot in Wiesbaden persönlich prüfen lassen.",
    description: "TarifWerk Beratung in Wiesbaden zu Strom, Gas, Internet, Mobilfunk, Versicherungen und weiteren Themen. Kostenlos und unverbindlich starten.",
    intro: "TarifWerk hat seinen Ausgangspunkt in Wiesbaden. Wenn Sie Verträge prüfen, ein Angebot einordnen oder mehrere Themen gemeinsam sortieren möchten, haben Sie einen persönlichen Ansprechpartner statt wechselnder Hotlines.",
    introPrivate: "Du wohnst in Wiesbaden und willst einen Vertrag oder ein Angebot einordnen? Wir besprechen mit dir, worauf es ankommt. TarifWerk sitzt in Wiesbaden, du hast einen festen Ansprechpartner statt wechselnder Hotlines.",
    localText: "Ob Strom- und Gasvertrag, Internetanschluss, Mobilfunk, Versicherungen oder ein größeres Vorhaben: Wir starten mit Ihrer Situation und erklären die verfügbaren nächsten Schritte verständlich.",
    localTextPrivate: "Ob Strom- und Gasvertrag, Internetanschluss, Mobilfunk, Versicherungen oder ein größeres Vorhaben: Wir starten mit deiner Situation und erklären die verfügbaren nächsten Schritte verständlich.",
    contactText: "Die Erstorientierung kann digital oder nach individueller Absprache persönlich erfolgen.",
  },
  mainz: {
    slug: "mainz",
    city: "Mainz",
    region: "Rheinland-Pfalz",
    eyebrow: "TarifWerk für Mainz",
    title: "Angebot aus Mainz? Preis, Laufzeit und offene Punkte klären.",
    description: "Persönliche TarifWerk Beratung für Mainz: Strom, Gas, Internet, Mobilfunk, Versicherungen und mehr verständlich prüfen und einordnen.",
    intro: "Für Selbstständige und Unternehmen in Mainz bietet TarifWerk eine persönliche Anlaufstelle für Vertrags-, Tarif- und Versorgungsthemen. Sie schildern die Ausgangslage – wir helfen, die relevanten Kriterien zu sortieren.",
    introPrivate: "Du bist in Mainz und hast einen Vertrag oder ein Angebot vor dir? Schick es uns. Wir sehen uns Preis, Laufzeit und offene Punkte an und sagen dir ehrlich, ob sich etwas ändern sollte.",
    localText: "Gerade bei bestehenden Verträgen oder einem bereits vorliegenden Angebot ist eine zweite Einordnung oft der einfachste Start. Dabei geht es nicht um ein pauschales Wechselversprechen, sondern um Kosten, Leistung, Laufzeit und tatsächlichen Bedarf.",
    localTextPrivate: "Gerade bei bestehenden Verträgen oder einem bereits vorliegenden Angebot ist eine zweite Einordnung oft der einfachste Start. Dabei geht es nicht um ein pauschales Wechselversprechen, sondern um Kosten, Leistung, Laufzeit und deinen tatsächlichen Bedarf.",
    contactText: "Die Beratung ist digital deutschlandweit möglich; persönliche Termine in der Region werden individuell abgestimmt.",
  },
  "frankfurt-am-main": {
    slug: "frankfurt-am-main",
    city: "Frankfurt am Main",
    region: "Hessen",
    eyebrow: "TarifWerk für Frankfurt am Main",
    title: "Frankfurt am Main: Verträge digital einordnen, vor Ort nach Absprache.",
    description: "TarifWerk Beratung für Frankfurt am Main zu Telekommunikation, Energie, Versicherungen, Solar und weiteren Themen – persönlich und unverbindlich.",
    intro: "In Frankfurt am Main bündeln wir mehrere Beratungsfelder über einen persönlichen Ansprechpartner. Das ist besonders sinnvoll, wenn nicht nur ein einzelner Tarif, sondern mehrere laufende Verträge oder ein größeres Vorhaben betrachtet werden sollen.",
    introPrivate: "In Frankfurt am Main bündeln wir mehrere Beratungsfelder über einen persönlichen Ansprechpartner. Das ist besonders sinnvoll, wenn du nicht nur einen einzelnen Tarif, sondern mehrere laufende Verträge oder ein größeres Vorhaben betrachten möchtest.",
    localText: "Sie erhalten keine endlose Liste von Optionen, sondern eine verständliche Einordnung der verfügbaren Möglichkeiten und ihrer Grenzen. Welche Partner für Ihr Anliegen verfügbar sind, wird transparent besprochen.",
    localTextPrivate: "Du erhältst keine endlose Liste von Optionen, sondern eine verständliche Einordnung der verfügbaren Möglichkeiten und ihrer Grenzen. Welche Partner für dein Anliegen verfügbar sind, besprechen wir transparent.",
    contactText: "Digitale Beratung ist jederzeit möglich; persönliche Termine in Frankfurt am Main werden nach Vereinbarung abgestimmt.",
  },
};

export const LOCAL_PAGE_LIST = Object.values(LOCAL_PAGES);
