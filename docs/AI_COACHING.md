# Interner KI-Coach

## Gesprächsrahmen

Der Coach kombiniert SPIN-Bedarfsermittlung, aktives Zuhören, belegte Challenger-Perspektiven und eine kybernetische Schleife: Ist-Zustand beobachten, Ziel und Grenzen klären, einen nächsten Schritt vorschlagen, Reaktion prüfen und den Plan anpassen. Die Techniken sind Leitlinien; der Coach soll offene Fragen stellen, unbekannte Fakten kennzeichnen und bei fehlendem Bedarf vom Angebot abraten. Falsche Verknappung, Angst- und Drucktaktiken sowie unbelegte Versprechen sind ausgeschlossen.

## Rückkopplung

Nach einer Antwort kann ein Mitarbeiter deren Nützlichkeit und ein grobes Gesprächsergebnis melden. Gespeichert werden nur die Antwort-ID, der Modus, eine Hilfreich-Markierung und ein Ergebniscode. Frage und KI-Antwort werden nicht gespeichert. Rückmeldungen sind pro Mitarbeiter geschützt, änderbar und bilden erst ab acht Antworten innerhalb von 90 Tagen einen vorsichtigen Hinweis für denselben Arbeitsmodus. Die Stichprobe ist selbstselektiert und kein belastbarer Erfolgs- oder Kausalitätsnachweis.

## Aktivierung und Fehlerdiagnose

Der Server braucht einen gültigen `GEMINI_API_KEY` oder `OPENROUTER_API_KEY`. Setze den Schlüssel als serverseitige Vercel-Umgebungsvariable für Preview und/oder Production; niemals mit `NEXT_PUBLIC_` und niemals im Browser. Unterstützte optionale Einstellungen stehen in `.env.example`. Das Portal zeigt an, ob ein Schlüssel vorhanden ist; erst eine echte Anfrage bestätigt, dass der externe Provider erreichbar ist und das Modell verfügbar ist.

Die neue Rückmeldungstabelle wird durch Migration `0021_ai_coaching_feedback.sql` angelegt. Der Produktionsbuild führt vorhandene Migrationen aus und verifiziert sie, bevor er fortfährt. Bis die Migration verfügbar ist, kann der Coach weiter antworten; nur adaptive Rückkopplung bleibt aus.

## Prüfung

`npm test`, `npm run typecheck`, `npm run lint`, `npm run perf:guard`, `npm run audit:repo` und `npm run build`. Laufzeitprüfungen kontrollieren Anmeldung, Zugriff auf eigene KI-Antworten, speicherarme Rückmeldung und Aktualisierung des Feedbacks.
