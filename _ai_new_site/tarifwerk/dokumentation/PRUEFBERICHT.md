# Prüfbericht – TarifWerk neu.zip

Stand: 15.09.2026. Grundlage ist die bereitgestellte neu.zip mit 92 Dateien. Alle ursprünglichen Dateien sind im Paket enthalten. Änderungen betreffen funktionale Reparaturen und die ausdrücklich angeforderten neuen Bereiche.

## Nachgewiesen

- Produktionsbuild mit Next.js 16.2.6 erfolgreich, einschließlich TypeScript und aller neuen API-/Seitenrouten.
- ESLint: keine Fehler; zwei bestehende Hinweise zu nativen Logo-Bildern. Diese wurden nicht umgebaut.
- Fünf Authentifizierungs-Testgruppen bestanden: Passwortprüfung, manipulierte/abgelaufene Tokens, fehlende Geheimnisse, Cookie-/Kontostatus und Herkunftsprüfung.
- 21 Server-Integrationstestgruppen bestanden. Verwendet wurden eine isolierte PGlite-Datenbank mit PostgreSQL-Protokoll und ein echter Next.js-Produktionsserver. Keine Kundendaten und keine produktiven Konten wurden verwendet.
- 24 öffentliche Seiten bzw. URL-Varianten einschließlich acht Leistungsseiten, Empfehlungsseiten, wiederholter Query-Parameter und Sitemap geprüft; Beraterprofil und Portal separat geprüft.
- Authentifizierte API-Aufrufe und Portal-HTML wurden geprüft. Sitzungen, Empfehlungszugänge und gespeicherte Bilder überstehen einen Next.js-Serverneustart.

## Integrationstests

1. Migration installs empty database and repeats without changes
2. Explicit administrator setup is idempotent
3. Anonymous requests cannot access portal or administration; deep links are preserved
4. Case-insensitive login, persistent cookie and admin page
5. User and public profile created atomically; duplicate emails roll back
6. RBAC, self-demotion prevention and CSRF rejection
7. Multipart upload, real image decoding, durable storage, profile display and ETag
8. Corrupt images and unauthorized uploads rejected
9. Lead submission, confirmation validation, ownership and audit notes
10. Advisors cannot read applications or take another advisor’s assigned lead
11. Team chat saves and retrieves messages
12. Referral registration requires consent; private token is hashed and public code cannot read status
13. Referral attribution is optional, excludes self-referrals and counts duplicate email once
14. Referral dashboard counts follow actual portal status; shared routes render
15. 24 public pages, services, repeated query parameters, admin alias and genuine 404
16. Server restart preserves authenticated sessions and profile image storage
17. Password changes revoke existing sessions
18. Image removal clears both profile reference and stored data
19. Admin deletion rejects unauthorized/self requests, revokes sessions, removes sole profile and retains private leads and chat
20. Referral links and counts survive server restart and unrelated account deletion
21. Logout expires the session cookie

## Design- und Marketingabgleich

- index.html, ursprüngliche CSS-Dateien, Bilder und Schriften sind bytegleich zum Original.
- Alle ursprünglichen className-, style-, Animations-, href-, src- und action-Attribute in 43 vorhandenen TSX-Dateien bleiben in derselben Reihenfolge erhalten. Die ergänzte Profilbildquelle gehört zur Uploadfunktion innerhalb des bestehenden Avatars.
- Zusätzlich eingefügt wurden der Footer-Link „Freunde werben“ und eine freiwillige Zuordnungscheckbox, die nur bei einer Empfehlung erscheint. Die neue Benutzerverwaltung und die Empfehlungsseiten verwenden die vorhandene Gestaltung. Es wird deshalb keine absolute Pixelidentität aller Seiten behauptet.
- Marketinginhalte in src/lib/content.ts sowie bestehende Werbe-/Kontaktlinks bleiben unverändert. Trackingdienste wurden nicht deaktiviert oder umgestellt. Es wurde kein neuer Marketing-Tracker eingebaut.
- Bilder wurden beibehalten; keine erfundenen Beraterfotos, Bewertungen, Verknappungen oder Erfolgszahlen ergänzt.
- Bestehende Telefonnummernanzeige im Beraterprofil verwendet nun die Nummer des jeweiligen Beraters; Fehler-/Erfolgszustände verwenden vorhandene Flächen.

## Reparaturen und Ergänzungen

Datenbankmigration und explizite sichere Erstanlage; serverseitige Rollenprüfung; transaktionale Benutzer-/Berateranlage; eindeutige E-Mail-Adressen ohne Groß-/Kleinschreibungsabweichungen; Schutz aktiver Administratoren; Benutzerlöschung mit Erhalt und privater Übertragung von Kundenanfragen; signierte Cookies; Entwertung bei Passwortänderung und Kontolöschung; CSRF-Prüfung; begrenzte Request-Bodies; berechtigungsgesteuerte Lead-Listen und Details; konsistente Terminbestätigung; abgesicherte Multipart-Bildverarbeitung und persistente Bildspeicherung; korrigierte Formularzustände, Zeitlimits und Doppelklicksperren; Query-Parameter und Deep-Link-Rückkehr; mobile Menüereignisse und korrekte Button-Ref-/Linkweitergabe.

Empfehlungsprogramm mit zufälligen öffentlichen Links, getrenntem privaten Statuszugriff, freiwilliger Zuordnung, Ausschluss von Eigenempfehlungen, E-Mail-Deduplizierung und tatsächlichen aggregierten Bearbeitungsständen. Keine automatischen Auszahlungen und keine unbestätigten Rabattzusagen. Optionale Vorteilskonditionen sind dokumentiert und standardmäßig nicht gesetzt.

Eine zusätzliche direkte Abhängigkeit: sharp 0.34.5 zur vollständigen Bilddekodierung und Normalisierung. Sie war bereits transitiv installiert; keine weitere neue Laufzeitbibliothek.

## Noch offen / vor Livebetrieb erforderlich

- Keine Veröffentlichung auf tarifwerk.eu, Vercel oder Sites; kein GitHub-Push. Produktive PostgreSQL-Verbindung, dauerhaftes Session-Geheimnis und eigenes Admin-Passwort müssen gesetzt werden. Es wurden keine Zugangsdaten erfunden.
- Kein vollständiger Browserdurchlauf mit echten Klicks, Drag-and-drop, Back/Forward oder mehreren Viewports; kein gerenderter Pixelvergleich und kein produktiver Last-/Mehrinstanztest. Der Designabgleich bezieht sich auf Dateien und Quellcodeattribute.
- PostgreSQL-kompatible Tests ersetzen nicht den Test gegen den konkreten Datenbankdienst und dessen TLS-/Proxy-Konfiguration. Rate-Limits sind pro Prozess implementiert; verteilter Betrieb benötigt passende Infrastruktur.
- Die vollständige Geschäftsadresse fehlt im ursprünglichen Impressum. Sie muss vor Veröffentlichung ergänzt werden. Vorhandene Rechtstexte wurden nicht rechtlich geprüft; die Datenschutzinformation und Löschprozesse müssen das neue Empfehlungsprogramm berücksichtigen.
- Ein zweiseitiges monetäres Vorteilsprogramm benötigt reale Konditionen und Abwicklung. Die ZIP enthält das technisch funktionierende Empfehlungs- und Statussystem, keine erfundene Zahlungsintegration.
- Externe Telefon-, WhatsApp-, Werbe- und Trackingdienste wurden nicht durch Testanfragen ausgelöst.

Eine absolute Fehlerfreiheits- oder Sicherheitsgarantie lässt sich aus diesen Prüfungen nicht ableiten. Einrichtung und Betrieb stehen in quellcode/README.md. Die letzte Arbeitsphase wurde für Prüfung, Dokumentation und vollständige ZIP-Ausgabe reserviert.
