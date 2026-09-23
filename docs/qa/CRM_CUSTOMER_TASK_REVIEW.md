# Kunden- und Aufgabenabläufe

Diese Änderung ergänzt den integrierten Stand `b2935c7` und erhält Kundenportfolio, Servicefälle, Inbox und zentrale Fristenregeln.

## Verhalten

- Kundenakten geben Lead-, Auftrags- und Aufgabendaten nur mit den jeweiligen Bereichsrechten aus. Fremde, nicht zugewiesene Leads bleiben geschützt; ausdrücklich zugewiesene Leads bleiben gemäß aktueller Berechtigungsregel zugänglich.
- Leadübernahme und Auftragserstellung laufen in einer Transaktion. Ungültige Aufträge hinterlassen weder neue Kunden noch Zuordnungen. Kundenänderungen prüfen Dubletten und vollständige Namen.
- Direkte Auftragslinks berücksichtigen Kunden und Leads außerhalb des ersten Auswahlfensters.
- Aufgaben zeigen Kontext, verständliche Statuswerte, Priorität und Termin. Bearbeiten, Abschließen und Wiederöffnen aktualisieren die Ansicht; Sammelauswahl gilt nur für sichtbare Ergebnisse.
- Termine werden unabhängig von der Browserzeitzone in Berliner Zeit eingegeben. Nicht existente oder mehrdeutige Uhrzeiten bei Zeitumstellungen werden erklärt und abgewiesen.
- Gleichzeitige Übernahmen desselben Aufgabenvorschlags erzeugen nur eine aktive Aufgabe. Wiederholtes Abschließen bewahrt den ursprünglichen Abschlusszeitpunkt.
- Korrelierte Unterabfragen der Kundenübersicht verwenden ausdrücklich die äußere Kunden-ID.

## Reproduzierbare Prüfung

`npm test`, `npm run typecheck`, `npm run lint`, `npm run perf:guard`, `npm run audit:repo` und `npm run build`.

Die zusätzliche Laufzeitsuite `scripts/runtime-crm-workflows.mjs` prüft 13 Abläufe mit echten HTTP-Anfragen und synthetischen Datensätzen. Sie erfordert einen isolierten lokalen Server, eine lokale Datenbank und `CRM_SMOKE_ALLOW_WRITE=1`. Der GitHub-Workflow führt sie gegen PostgreSQL 17 aus. Lokal wurde sie mit einer isolierten PostgreSQL-kompatiblen PGlite-Datenbank geprüft.

Lokales Ergebnis: 221 automatisierte Tests, 13 HTTP-/Datenbankprüfungen sowie 32 integrierte Browser-/API-Prüfungen erfolgreich. Browserprüfung mit Chromium 153, einschließlich 320/390-Pixel-Mobilansichten und Browserzeitzone America/New_York. Typprüfung, Lint, Performance-Guard, Repository-Audit und Produktionsbuild erfolgreich.

Die Tests ersetzen weder eine Produktionsabnahme noch eine Lastprüfung mit realem Datenvolumen.
