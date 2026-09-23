-- Curated internal sales coaching modules for the TarifWerk AI assistant.
-- Idempotent by title. Content is internal-only and never exposed by the public chatbot.

INSERT INTO training_modules (title, category, description, content, required, active)
SELECT *
FROM (VALUES
  (
    'Discovery Mastery: Bedarf vor Produkt',
    'Vertrieb · Discovery',
    'Gespräche strukturiert eröffnen, Bedarf diagnostizieren und den echten Entscheidungsgrund finden.',
    'Ziel: nicht zu früh präsentieren. 1) Rahmen setzen: kurz erklären, dass zuerst Situation und Ziel verstanden werden. 2) Ausgangslage klären: Was besteht heute? Was funktioniert gut? Was stört? 3) Problem vertiefen: Seit wann, wie oft, welche Folgen entstehen? 4) Bedeutung klären: Was kostet Zeit, Geld, Nerven oder Flexibilität? 5) Priorität prüfen: Was wäre anders, wenn das Thema sauber gelöst ist? 6) Kriterien sammeln: Preis, Leistung, Laufzeit, Sicherheit, Service, Geschwindigkeit, Flexibilität. 7) Zusammenfassen und bestätigen lassen. 8) Erst danach passende Optionen erklären. Gute Verkäufer reden weniger, hören genauer zu und stellen eine starke Folgefrage statt drei oberflächlicher Fragen. Niemals Bedarf erfinden oder künstlich vergrößern.',
    true,
    true
  ),
  (
    'Einwandbehandlung: Verstehen vor Antworten',
    'Vertrieb · Einwände',
    'Einwände diagnostizieren, ohne zu drücken oder reflexartig zu argumentieren.',
    'Arbeitslogik: Antizipieren → Zuhören → Anerkennen → Erkunden → Antworten → nächsten Schritt prüfen. Ein Einwand ist zuerst Information. Nicht sofort kontern. Beispiel Preis: erst fragen, ob es um absolute Kosten, Preis-Leistung, Budget, Vergleich oder fehlende Sicherheit geht. Beispiel "ich überlege": fragen, welcher Punkt noch unklar ist. Beispiel "kein Interesse": freundlich prüfen, ob Thema, Zeitpunkt oder bisherige Erfahrung der Grund ist. Gute Antworten sind kurz, spezifisch und greifen genau den bestätigten Kern auf. Danach Rückfrage: "Trifft das deinen Punkt?" Keine Rabatte ohne Grund, keine künstliche Verknappung, kein Schuldgefühl, kein Druck.',
    true,
    true
  ),
  (
    'Kommunikation & Verhandlung: Ruhe, Empathie, Führung',
    'Vertrieb · Kommunikation',
    'Vertrauen aufbauen, Informationen gewinnen und Gespräche souverän führen.',
    'Nutze aktives Zuhören: Schlüsselwörter aufgreifen, Emotionen oder Unsicherheit neutral benennen, paraphrasieren und bestätigen lassen. Stelle offene Was-/Wie-Fragen, wenn du Denkprozesse anregen willst. Nutze bewusste Pausen, statt jede Stille zu füllen. Trenne Position von Interesse: "zu teuer" kann Unsicherheit, Vergleichsbedarf oder Risiko bedeuten. Sprich ruhig, konkret und ohne Rechtfertigungsmodus. Gib dem Kunden jederzeit Entscheidungsfreiheit. Ziel ist Klarheit und tragfähige Zustimmung, nicht Überrumpelung.',
    true,
    true
  ),
  (
    'Value Selling: Nutzen konkret und glaubwürdig machen',
    'Vertrieb · Nutzenargumentation',
    'Von Produktmerkmalen zu relevanten Kundennutzen übersetzen.',
    'Nutzen entsteht nur relativ zum bestätigten Bedarf. Struktur: Kundenproblem → gewünschtes Ergebnis → relevante Eigenschaft → konkrete Wirkung → Beleg/Einordnung → Rückfrage. Beispiel statt "wir haben mehrere Partner": "Dadurch können wir verfügbare Optionen anhand deiner Kriterien einordnen, statt dir nur eine Standardlösung zu zeigen." Nutze verständliche Kontraste und Gesamtkosten statt isolierter Monatswerte. Keine erfundenen Ersparnisse, Referenzen oder Garantien. Bei fehlendem Beleg offen sagen, dass geprüft werden muss.',
    true,
    true
  ),
  (
    'Abschluss & Next Step: Entscheidungen sauber führen',
    'Vertrieb · Abschluss',
    'Nächste Schritte klar machen, ohne Druck oder künstliche Abschlussmethoden.',
    'Ein Abschluss ist die logische Fortsetzung eines geklärten Bedarfs. Vor dem nächsten Schritt zusammenfassen: Ausgangslage, wichtigste Kriterien, empfohlene Option, offene Punkte. Dann eine klare Entscheidungsfrage stellen. Wenn noch Unsicherheit besteht, nicht drängen, sondern die fehlende Information identifizieren. Kleine Commitment-Schritte sind sinnvoll: Unterlagen prüfen, Vergleich terminieren, Rückruf festhalten, Angebot gemeinsam durchgehen. Kein falscher Zeitdruck, keine erfundene Knappheit. Ein ehrliches "noch nicht" ist besser als ein späterer Widerruf oder unzufriedener Kunde.',
    true,
    true
  ),
  (
    'B2C Gesprächsführung: kurz, persönlich, relevant',
    'Vertrieb · B2C',
    'Telefon, Haustür und Beratungsgespräch natürlich und respektvoll führen.',
    'Einstieg kurz halten: wer du bist, warum das Gespräch relevant sein könnte und eine einfache Erlaubnisfrage. Innerhalb der ersten Minute herausfinden, ob überhaupt Bedarf besteht. Alltagssprache statt Fachjargon. Bei Skepsis transparent erklären, wie TarifWerk arbeitet und verdient. Bei Interesse gezielt vertiefen. Immer eine klare nächste Aktion vereinbaren. Sympathie entsteht durch Aufmerksamkeit, Tempo-Anpassung, ehrliche Aussagen und das Gefühl, dass der Kunde nicht in ein Produkt gedrückt wird.',
    true,
    true
  ),
  (
    'B2B Discovery & Qualification',
    'Vertrieb · B2B',
    'Geschäftskunden nach Problem, Wirkung, Entscheidung und Umsetzung qualifizieren.',
    'Klärfelder: aktueller Zustand, Standorte, bestehende Verträge, operative Probleme, finanzielle/zeitliche Wirkung, Zielbild, Entscheidungskriterien, beteiligte Personen, Freigabeprozess, Budgetrahmen wenn relevant, gewünschter Zeitpunkt, technische/vertragliche Risiken. Nicht nur "Bedarf vorhanden?" fragen. Verstehen, warum jetzt gehandelt werden könnte und was passieren würde, wenn nichts geändert wird. Danach nächsten Schritt mit Verantwortlichem, Inhalt und Termin konkret festhalten. Professionelle Sie-Ansprache und präzise Zusammenfassungen.',
    true,
    true
  ),
  (
    'Follow-up, Empfehlungen & langfristige Beziehung',
    'Vertrieb · Follow-up',
    'Nachfassen, Empfehlungen und Bestandskunden professionell entwickeln.',
    'Jedes Follow-up braucht Kontext und Wert: kurz erinnern, worum es ging, einen relevanten Punkt aufgreifen und eine konkrete nächste Option anbieten. Kein "wollte nur mal nachfragen" ohne Mehrwert. Empfehlungen erst ansprechen, wenn echter Nutzen oder Zufriedenheit erkennbar ist. Bestandskunden regelmäßig prüfen, aber keine künstlichen Probleme erzeugen. Gute Beziehung bedeutet erreichbar bleiben, Zusagen einhalten, sauber dokumentieren und auch sagen, wenn kein Wechsel nötig ist.',
    false,
    true
  ),
  (
    'Rollenspiel-Scorecard für starke Beratung',
    'Vertrieb · Coaching',
    'Einheitliche Bewertung für KI-Rollenspiele und Gesprächsanalysen.',
    'Bewerte Übungsgespräche auf einer Skala von 1 bis 10 in: Einstieg & Rahmen, Zuhören, Qualität der Fragen, Bedarfstiefe, Nutzenargumentation, Einwanddiagnose, Verständlichkeit, Gesprächsführung, Vertrauen, nächster Schritt. Gib immer zuerst 2 konkrete Stärken, dann maximal 3 Hebel mit besseren Formulierungen. Zeige anschließend eine Beispielantwort und eine neue Übungsrunde. Streng bewerten, aber respektvoll coachen. Nicht auf Lautstärke oder Druck optimieren, sondern auf Klarheit, Relevanz, Vertrauen und Abschlussqualität.',
    true,
    true
  )
) AS module(title, category, description, content, required, active)
WHERE NOT EXISTS (
  SELECT 1 FROM training_modules existing WHERE existing.title = module.title
);
