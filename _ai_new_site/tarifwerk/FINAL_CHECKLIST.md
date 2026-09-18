# FINAL_CHECKLIST

Stand: 15.09.2026. ✅ bezeichnet den konkret dokumentierten Prüfumfang, keine allgemeine Fehlerfreiheitsgarantie. ❌ bedeutet nicht nachgewiesen oder nicht eingerichtet. Der vorhandene Next.js-Stack bleibt bestehen; keine zusätzlichen funktionslosen Vanilla-Dateien.

| Status | Prüfung | Nachweis / Grenze |
|---|---|---|
| ✅ | Vollständiger Next.js-Dateibaum | Anwendung, APIs, Migrationen, Assets und Dokumentation enthalten. |
| ✅ | Syntax und TypeScript | npm run typecheck und Produktionsbuild bestanden. |
| ✅ | Produktionsbuild | npm run build erfolgreich. |
| ✅ | Lint | Keine Fehler; zwei bestehende Hinweise zu nativen Logo-Bildern. |
| ✅ | Auth-/Security-Modultests | 8 Testgruppen bestanden. |
| ✅ | Serverintegration | 23 Testgruppen gegen isolierte PostgreSQL-kompatible Testdatenbank bestanden. |
| ✅ | Import-Referenzen | 201 lokale Imports aus 83 Quelldateien auf vorhandene Ziele geprüft. |
| ✅ | Feste interne Links | 34 statische Linkreferenzen auf Routen/Dateien geprüft. |
| ✅ | Unterseiten im Serverbetrieb | 24 öffentliche URL-Varianten sowie Portal-/Profilrouten geprüft. |
| ✅ | 404 und Guards | Unbekannte URLs liefern 404; geschützte Bereiche prüfen Anmeldung. |
| ✅ | RBAC und Kontoverwaltung | Anlage, Änderungen, Löschung, CSRF und Schutz des eigenen Adminzugangs geprüft. |
| ✅ | Sitzungserhalt und Entwertung | Serverneustart, Passwortwechsel, Kontolöschung und Logout geprüft. |
| ✅ | Bildverarbeitung und Storage | Multipart, Bilddekodierung, ungültige Dateien, Rechte, ETag und Löschung geprüft. |
| ✅ | Formular-/Datenfluss | Lead-Speicherung, Terminvalidierung, Eigentümerrechte und Auditnotizen geprüft. |
| ✅ | Empfehlungsprogramm | Zustimmung, private Zugriffsschlüssel, Eigenempfehlung, Duplikate und reale Statuszählung geprüft. |
| ✅ | CSP | Zufälliger Nonce je Antwort; alle ausgelieferten Scripts besitzen den passenden Nonce; manipulierte Requestwerte werden ersetzt. |
| ✅ | Sichere JSON-LD-Ausgabe | Eingeschleuste Script-Endtags bleiben Daten; echter Profildatensatz und Parser-Rundlauf geprüft. |
| ✅ | Reduced Motion implementiert | Motion-Kontext, Reveal, Mausbewegung, Karussell-Timer, Akkordeon und CSS-Dauerschleifen berücksichtigen die Präferenz. |
| ✅ | Tastatur-/ARIA-Verbindungen implementiert | Menüfokus und Rückgabe; eindeutige FAQ-IDs, Zustände und Panelzuordnung. |
| ✅ | SEO-Quelldaten | Titel, Beschreibungen, Canonicals, strukturierte Daten und Suchmaschinen-Sperre des Portals vorhanden. |
| ✅ | Dateninventare | 950 Quelltext-Einträge, SEO- und API-Verzeichnis sowie Annahmen dokumentiert. |
| ✅ | Marketing-/Asset-Erhalt | 25 öffentliche/archivierte Assets und zentrale Marketingdateien bytegleich zum vorherigen Paket. |
| ✅ | Abhängigkeiten und Geheimnisse | Keine neue Laufzeitabhängigkeit; Lockfile enthalten; produktive Geheimnisse und lokale Testumgebung nicht verpackt. |
| ✅ | README und .gitignore | Setup, Run, API-Liste, Commit-Nachricht und Ausschlüsse vorhanden. |
| ❌ | Vollständiger Browserdurchlauf | Konsole, Hydration, tatsächliche Klicks, Drag-and-drop sowie Back/Forward nicht im Browser nachgewiesen. |
| ❌ | Vollständiger A11y-Nachweis | Kein Screenreader-, Kontrast- oder vollständiger Tastaturtest in echten Viewports. |
| ❌ | Core Web Vitals / Pixelvergleich | Keine LCP-/CLS-/INP-Messung, kein gerenderter Vergleich aller Viewports. |
| ❌ | Livebetrieb und Domain | Next.js-Host, produktive Datenbank und Domainumschaltung nicht eingerichtet. GitHub Pages führt diesen Server nicht aus. |
| ❌ | Rechtliche Vollständigkeit | Geschäftsadresse fehlt im Input; Pflichtangaben und Datenschutzprozesse benötigen Betreiberprüfung. |
| ❌ | Unabhängige Claim-/Lastprüfung | Mitgelieferte Geschäftsaussagen, produktive Last und verteilte Rate-Limits nicht unabhängig nachgewiesen. |

## Integrationsergebnisse

1. Migration installs empty database and repeats without changes
2. Explicit administrator setup is idempotent
3. Anonymous requests cannot access portal or administration; deep links are preserved
4. Per-response CSP nonce matches every script, cannot be supplied by clients and is not cached
5. Case-insensitive login, persistent cookie and admin page
6. User and public profile created atomically; duplicate emails roll back
7. RBAC, self-demotion prevention and CSRF rejection
8. Multipart upload, real image decoding, durable storage, profile display and ETag
9. Stored advisor content cannot break out of JSON-LD; repeated profile query parameters render safely
10. Corrupt images and unauthorized uploads rejected
11. Lead submission, confirmation validation, ownership and audit notes
12. Advisors cannot read applications or take another advisor’s assigned lead
13. Team chat saves and retrieves messages
14. Referral registration requires consent; private token is hashed and public code cannot read status
15. Referral attribution is optional, excludes self-referrals and counts duplicate email once
16. Referral dashboard counts follow actual portal status; shared routes render
17. 24 public pages, services, repeated query parameters, admin alias and genuine 404
18. Server restart preserves authenticated sessions and profile image storage
19. Password changes revoke existing sessions
20. Image removal clears both profile reference and stored data
21. Admin deletion rejects unauthorized/self requests, revokes sessions, removes sole profile and retains private leads and chat
22. Referral links and counts survive server restart and unrelated account deletion
23. Logout expires the session cookie

## Übergabe

Alle Dateien sind vollständig; keine Datei wurde wegen eines Budgets abgebrochen. Offene Live-/Prüfvoraussetzungen sind oben aufgeführt. Details und begründete Abweichungen vom allgemeinen Masterprompt: ASSUMPTIONS.md. Historische Berichte in dokumentation/ bleiben erhalten und stellen keinen neu durchgeführten Live-Test dar.
