export type PortalHelpTopic = {
  href: string;
  title: string;
  purpose: string;
  actions: string[];
  tips: string[];
};

export const PORTAL_HELP: PortalHelpTopic[] = [
  {
    href: "/portal/assistent",
    title: "Arbeitsassistent",
    purpose: "Erklärbare Priorisierung aus CRM-Daten: Der Assistent zeigt, was als Nächstes Aufmerksamkeit braucht und warum.",
    actions: ["Kritische Nacharbeit zuerst erkennen", "Direkt in betroffene Leads, Aufgaben, Aufträge oder Kunden springen", "Begründung jeder Empfehlung nachvollziehen", "Menschliche Freigabe bei wichtigen Änderungen beibehalten"],
    tips: ["Der Assistent verändert keine Kunden-, Auftrags- oder Provisionsdaten automatisch.", "Empfehlungen sind Arbeitsprioritäten und ersetzen keine fachliche Beratung oder Freigabe."],
  },
  {
    href: "/portal/verwaltung",
    title: "Mitarbeiter verwalten",
    purpose: "Interne Benutzer, Rollen, Profile und Zugänge zentral verwalten.",
    actions: ["Mitarbeiter anlegen oder deaktivieren", "Rollen und Beratungsbereiche pflegen", "Interne Profile und öffentliche Beraterprofile trennen", "Zugänge und Verantwortlichkeiten nachvollziehbar halten"],
    tips: ["Vergütungsstufen werden nicht hier, sondern im Bereich Vergütung & Karriere durch den Owner festgelegt.", "Deaktivieren Sie alte Zugänge statt historische Datensätze zu löschen."],
  },
  {
    href: "/portal/produkte",
    title: "Produkte & Partner",
    purpose: "Die zentrale Vertriebs-Wissensdatenbank: Was verkaufen wir, über wen, wie und unter welchen Bedingungen?",
    actions: ["Produkte und Partner anlegen", "Vertriebswege und Marketingfreigaben dokumentieren", "Provisionslisten versioniert importieren", "Abschlusswege, Unterlagen und Verkaufsargumente hinterlegen"],
    tips: ["Pflegen Sie Produktwissen so, dass ein neuer Mitarbeiter ohne WhatsApp-Rückfragen arbeiten kann.", "Owner-interne Provider- und Poolwerte bleiben vor normalen Mitarbeitern verborgen."],
  },
  {
    href: "/portal/betrieb",
    title: "Team & Betriebsqualität",
    purpose: "Teams, Incentives, Schulungen, Benefits, Dokumente und Provider-Abgleiche operativ steuern.",
    actions: ["Teams und Teamleads zuordnen", "Pflichtschulungen und Produktfreigaben pflegen", "Incentives und Mitarbeiter-Benefits verwalten", "Interne Dokumente hochladen", "Provider-Abrechnungen auf Differenzen prüfen"],
    tips: ["Pflichtschulungen sperren Produkte technisch, bis eine gültige Freigabe vorliegt.", "Provider-Abweichungen sollten zeitnah geklärt und dokumentiert werden."],
  },
  {
    href: "/portal/kampagnen",
    title: "Kampagnen",
    purpose: "Paid-Traffic-Landingpages, UTM-Links und CRM-Attribution zentral vorbereiten.",
    actions: ["Kampagnen-Landingpage öffnen", "Kanalgenauen Tracking-Link kopieren", "Anzeigen-Grundlage kopieren", "Ergebnisse anschließend in Auswertungen prüfen"],
    tips: ["Landingpages bleiben bewusst noindex und sind für bezahlte Kampagnen gedacht.", "UTM-Parameter werden first-party nur bei einer tatsächlichen Anfrage ins CRM übernommen.", "Keine pauschalen Spar-, Rendite- oder Erfolgsversprechen in Anzeigen verwenden."],
  },
  {
    href: "/portal/rennen",
    title: "Team-Challenges",
    purpose: "Monatliche Motivation aus echten CRM-Ereignissen: qualifizierte Leads, B2B-Arbeit, Abschlüsse und erfolgreiche Empfehlungen werden visuell dargestellt.",
    actions: ["Monatsstand der Rennstrecke ansehen", "Punktregeln transparent nachvollziehen", "Optionalen lokalen Sound aktivieren", "TV-Modus für das Büro starten", "Freiwilligen Empfehlungsturm beobachten"],
    tips: ["Es gibt keine negativen Punkte und keine manuellen Punktbuchungen.", "Qualität bleibt wichtiger als Menge: Ein Lead zählt nur mit Thema und verwertbarem Kontaktweg.", "Der Monatsstand beginnt am 1. automatisch neu; CRM-Historie wird nicht gelöscht."],
  },
  {
    href: "/portal/verguetung",
    title: "Vergütung & Karriere",
    purpose: "Provisionsstufen, Karriereentwicklung, Rücklagen und Treuebausteine nachvollziehbar steuern.",
    actions: ["Eigene Vergütungsdaten einsehen", "Owner: Stufen von 82–92 % festlegen", "Treue-Sparquote und Teamlevel pflegen", "Treueguthaben revisionssicher buchen"],
    tips: ["Vergütungsänderungen erfolgen niemals automatisch.", "Der 8-%-Stornoanteil und Owner-interne Unternehmensplanung sind getrennte Rechenebenen."],
  },
  {
    href: "/portal/finanzen",
    title: "Provisionsübersicht",
    purpose: "Erwartete, bestätigte und ausgezahlte Provisionen kontrollieren.",
    actions: ["Provisionsstatus nachvollziehen", "Bestätigte und ausgezahlte Werte vergleichen", "Eigene Vergütung bzw. Owner-Gesamtwerte prüfen", "Abweichungen über den Provider-Abgleich klären"],
    tips: ["Erwartete Provision ist noch keine Auszahlung.", "Nutzen Sie den Provider-Abgleich im Bereich Team & Betriebsqualität für externe Abrechnungen."],
  },
  {
    href: "/portal/reporting",
    title: "Auswertungen",
    purpose: "Leistung, Pipeline, Abschlussentwicklung und operative Trends auswerten.",
    actions: ["Zeiträume vergleichen", "Leads und Aufträge gemeinsam betrachten", "Engpässe und Auffälligkeiten erkennen", "Entscheidungen auf Daten statt Bauchgefühl stützen"],
    tips: ["Ein einzelner starker Monat ist kein langfristiger Trend.", "Qualität, Storno und Bearbeitungsdauer gehören neben Umsatz in jede Bewertung."],
  },
  {
    href: "/portal/auftraege",
    title: "Aufträge",
    purpose: "Kundenaufträge vom Entwurf bis zur Aktivierung und Provision sauber verfolgen.",
    actions: ["Neue Aufträge anlegen", "Produkt und Provider zuordnen", "Status aktualisieren", "Fehlende Unterlagen und externe Referenzen pflegen"],
    tips: ["Produkte mit Pflichtschulung können ohne gültige Freigabe nicht abgeschlossen werden.", "Externe Auftrags-IDs erleichtern später den Provider-Abgleich."],
  },
  {
    href: "/portal/leads",
    title: "Leads & Termine",
    purpose: "Neue Kontakte qualifizieren, zuordnen und in Beratung oder Auftrag überführen.",
    actions: ["Neue Anfragen priorisieren", "Kontaktstatus pflegen", "Berater zuweisen", "Termine und nächste Schritte dokumentieren"],
    tips: ["Jede offene Anfrage sollte einen klaren nächsten Schritt haben.", "Dokumentieren Sie Gesprächsergebnisse direkt statt später aus dem Gedächtnis."],
  },
  {
    href: "/portal/kunden",
    title: "Kunden",
    purpose: "Eine zentrale Sicht auf Kunden, Kontakte, Einwilligungen und laufende Vorgänge.",
    actions: ["Kundendaten prüfen", "Aufträge und Aufgaben zum Kunden öffnen", "Bedarfe und relevante Informationen dokumentieren", "Dubletten vermeiden"],
    tips: ["Speichern Sie nur Daten, die für Beratung und Abwicklung benötigt werden.", "Produktvorschläge sollten immer aus dem tatsächlichen Bedarf entstehen."],
  },
  {
    href: "/portal/aufgaben",
    title: "Aufgaben",
    purpose: "Nachfassaktionen, offene Unterlagen und interne To-dos zuverlässig abarbeiten.",
    actions: ["Aufgaben erstellen", "Prioritäten und Fälligkeiten setzen", "Kunden oder Aufträgen zuordnen", "Erledigte Arbeit dokumentieren"],
    tips: ["Nutzen Sie Aufgaben für alles, was sonst im Kopf oder Chat verloren gehen würde.", "Überfällige Aufgaben sind ein Frühwarnsignal für Prozessprobleme."],
  },
  {
    href: "/portal/inbox",
    title: "Benachrichtigungen",
    purpose: "Automationshinweise und persönliche Systemmeldungen an einem Ort bündeln.",
    actions: ["Neue Hinweise lesen", "Benachrichtigungen als gelesen markieren", "Automationsausgaben außerhalb von Team-Chats nachvollziehen"],
    tips: ["Die Inbox ist für operative Hinweise gedacht – dauerhafte Regeln gehören in System oder Dokumentcenter.", "Automationen sollten nur Meldungen erzeugen, die eine konkrete Handlung oder Information auslösen."],
  },
  {
    href: "/portal/chat",
    title: "Team-Chat",
    purpose: "Teamkommunikation von Kunden- und Auftragsdaten getrennt halten.",
    actions: ["Mit dem gesamten Team kommunizieren", "Admin-interne Themen im Admin-Kanal besprechen", "Wichtige operative Hinweise austauschen"],
    tips: ["Vertrauliche Owner-Zahlen gehören nicht in allgemeine Team-Chats.", "Dauerhafte Prozessregeln sollten zusätzlich im Produkt- oder Dokumentcenter stehen."],
  },
  {
    href: "/portal/empfehlungen",
    title: "Empfehlungen",
    purpose: "Empfehlungen nachvollziehen und das Empfehlungsprogramm kontrolliert steuern.",
    actions: ["Empfehlungen prüfen", "Status und Zuordnung kontrollieren", "Freigegebene Vorteile nachvollziehen", "Missbrauch oder Dubletten erkennen"],
    tips: ["Keine Prämie sollte nur aufgrund einer neuen Anfrage als verdient gelten.", "Bedingungen müssen vor einer Auszahlung eindeutig dokumentiert sein."],
  },
  {
    href: "/portal/system",
    title: "Automationen & Audit",
    purpose: "Katalog, sichere Automationen, Qualitäts-Wächter, Integrationen und Audit-Funktionen administrativ kontrollieren.",
    actions: ["Systemdaten und Kataloge prüfen", "Automationen verwalten", "Täglichen Qualitäts-Wächter kontrollieren", "Audit-Ereignisse nachvollziehen", "Technische Auffälligkeiten erkennen"],
    tips: ["Audit-Historien nicht manipulieren oder als normale Notizen verwenden.", "Ändern Sie Automationen nur mit klarer fachlicher Wirkung."],
  },
  {
    href: "/portal/sicherheit",
    title: "Sicherheit",
    purpose: "Anmeldungen, Sessions und sicherheitsrelevante Ereignisse kontrollieren.",
    actions: ["Login-Ereignisse prüfen", "Auffällige Zugriffe erkennen", "Zugangsstatus kontrollieren", "Sicherheitsmaßnahmen nachvollziehen"],
    tips: ["Unbekannte Anmeldungen sofort prüfen.", "Geteilte Benutzerkonten vermeiden – jede Person braucht einen eigenen Zugang."],
  },
  {
    href: "/portal/einstellungen",
    title: "Einstellungen",
    purpose: "Persönliche Zugangseinstellungen des eigenen Kontos verwalten.",
    actions: ["Eigenes Passwort ändern", "Persönliche Einstellungen pflegen"],
    tips: ["Verwenden Sie ein einzigartiges Passwort.", "Rollen und Vergütung werden bewusst nicht in den persönlichen Einstellungen geändert."],
  },
  {
    href: "/portal",
    title: "Übersicht & Fokus",
    purpose: "Prioritäten, Tagesarbeit, Kundenpflege, Qualität und nächste Aktionen als tägliche Arbeitsübersicht bündeln.",
    actions: ["Offene Arbeit priorisieren", "Neue Anfragen erkennen", "Pipeline und Aufgaben im Blick behalten", "Von hier in die Fachbereiche springen"],
    tips: ["Beginnen Sie den Arbeitstag mit offenen Anfragen und überfälligen Aufgaben.", "Kennzahlen sind Hinweise – Details und Ursachen finden Sie in den jeweiligen Fachbereichen."],
  },
];

export function getPortalHelp(pathname: string) {
  return [...PORTAL_HELP]
    .sort((a, b) => b.href.length - a.href.length)
    .find((topic) => topic.href === "/portal" ? pathname === "/portal" : pathname.startsWith(topic.href))
    ?? PORTAL_HELP[PORTAL_HELP.length - 1];
}
