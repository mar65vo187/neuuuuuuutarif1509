# CRM-Arbeitsplatz: Änderungen und Prüfung

Stand: 22. September 2026. Basis: `404ace9735878d1e33fecd72da4f788d08f87789`.

## Verhalten

- Lead-Liste und Pipeline erreichen den gesamten berechtigten Bestand über serverseitige Seiten. Anzahl und Ergebnisse verwenden dieselben Filter und denselben Datenbank-Snapshot; Sortierungen besitzen einen stabilen ID-Tiebreaker.
- Die Liste stellt überfällige Kontakte, heute fällige Aktionen und fehlende nächste Schritte heraus. Filter bleiben beim Blättern erhalten. Eine Auswahl gilt nur für die sichtbare Ergebnisseite.
- Die Pipeline bietet direkte Telefon-/E-Mail-Verknüpfungen, Zuständigkeit, Produktkontext und nächste Schritte. Ein Anruf wird über die Lead-Akte ausdrücklich erfasst; die Oberfläche behauptet keinen erfolgten Kontakt durch einen schnellen Statusklick.
- Mobile Navigation verwendet einen beschrifteten modalen Dialog mit Suche. Größere Bedienelemente, sichtbarer Tastaturfokus und die korrigierte dunkle Farbpalette verbessern die Lesbarkeit.
- Abschließen oder Entfernen einer Wiedervorlage beendet alle aktiven automatischen CRM-Rückrufaufgaben, einschließlich älterer Duplikate. Historische und sachfremde Aufgaben bleiben erhalten. Ein abgeschlossener Lead benötigt eine ausdrückliche Wiederöffnung, bevor eine neue Wiedervorlage zulässig ist.
- Nachträglich erfasste ältere Anrufe überschreiben nicht den neuesten Kontaktstand. Ein Kontaktverbot beendet Rückrufe, ohne einen gewonnenen Vorgang nachträglich als verloren einzustufen.
- Die bestehenden Rechteprüfungen einschließlich Audit-Navigation bleiben erhalten. Ohne `lead.edit` öffnen sich die Lead-Arbeitsbereiche nicht; Berater sehen weiterhin nur selbst angelegte Leads. Unzulässige Massenaktionen liefern HTTP 403.

## Nachweise

| Prüfung | Ergebnis |
| --- | --- |
| `npm test` | 151 Tests bestanden, keine übersprungen |
| `npm run typecheck` | Bestanden |
| `npm run lint` | Bestanden, keine Warnungen |
| `npm run perf:guard` | Bestanden |
| `npm run build` | Sauberer Produktionsbuild mit Turbopack bestanden |
| Produktionsserver, API und Chromium | 22 Prüfungen bestanden |

Die Browserprüfung nutzte ausschließlich synthetische Daten: vier getrennte Konten, 335 Basis-Leads und zusätzliche Fälle für Sichtbarkeit, Schreibrechte und Wiedervorlagen. Geprüft wurden insbesondere:

- Anmeldung und Umleitung nicht angemeldeter Personen;
- Schutz fremder Leads auch bei abweichender Zuweisung sowie HTTP 403 für gesperrte Rollen;
- Erreichbarkeit des ältesten Leads auf Seite 14 und korrekte Gesamtzahl;
- Rücksetzen der Auswahl beim Blättern sowie robuste Behandlung mehrfacher URL-Parameter;
- Beenden doppelter Wiedervorlagen, Verhindern neuer Rückrufe nach Abschluss und gemeinsames Speichern von Status und Termin;
- Lead-Liste, Pipeline und Navigation bei 1440, 390 und 320 Pixeln, einschließlich Escape zum Schließen des Menüs;
- Administrator-Sichtbarkeit und ausbleibende JavaScript-Seitenfehler bei abweichender Browser-Zeitzone (`America/New_York`, Anzeige `Europe/Berlin`).

Die ausführbaren Regressionstests in `scripts/tests/lead-query-filters.test.mjs` und `lead-mutation.test.mjs` prüfen SQL-Erzeugung beziehungsweise Route-Verhalten. `crm-scale-integrity.test.mjs` prüft gerenderte Bedienelemente; die Lead-Prüfung in `rbac-read-boundaries.test.mjs` führt die Serverkomponenten bis zur verweigerten Datenzugriffsgrenze aus.

## Grenzen

Der lokale integrierte Lauf verwendete PGlite mit PostgreSQL-Protokoll und `pg_trgm`; alle Migrationen wurden dort erfolgreich angewendet. Das ist kein Lasttest und keine Bestätigung nativer PostgreSQL-Sperrkonkurrenz unter Produktionslast. Der vorhandene GitHub-Workflow enthält zusätzlich PostgreSQL-17-Prüfungen für Migrationen, Wiederherstellung und Laufzeitkonkurrenz; deren Ergebnis wird am Pull Request separat sichtbar.

Ein beschädigter lokaler Turbopack-Cache wurde vor dem erfolgreichen sauberen Build verworfen. Es wurden keine Produktionsdaten verwendet und keine zusätzlichen Projekt-Abhängigkeiten oder Datenbankmigrationen eingeführt. Diese Änderung wird als Pull Request zur Prüfung bereitgestellt; eine Produktionsveröffentlichung ist davon getrennt.
