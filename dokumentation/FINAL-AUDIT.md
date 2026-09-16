# Abschlussaudit vom 16.09.2026

Grundlage: GitHub-Commit `f10af4103501100f1c2fb20ccf21f81483ad00ef` in `mar65vo187/neuuuuuuutarif1509`.

## Nachgewiesene Fehler und Korrekturen

- `src/lib/auth.ts`, Chat- und Lead-APIs: Eine ausgefallene Datenbank wurde zuvor als ungültige Anmeldung behandelt. Sie liefert jetzt einen wiederholbaren Fehler; APIs antworten mit 503. Das Session-Cookie bleibt erhalten und funktioniert nach Wiederherstellung ohne neue Anmeldung.
- `src/lib/admin-server.ts` und Admin-/Upload-Routen: Kontoanlage und Bildänderungen prüften Rollen nur vor dem Einlesen beziehungsweise Verarbeiten der Anfrage. Alle administrativen Schreibtransaktionen verwenden jetzt dieselbe Sperre und prüfen den aktiven Admin erneut, bevor Daten geändert werden. Entzogene Rechte können so nicht über eine bereits laufende Anfrage weiterverwendet werden.
- `src/app/api/portal/login/route.ts`: Erfolgreiche Anmeldungen verbrauchten das IP-Limit und konnten Kollegen hinter derselben IP aussperren. Nur Fehlversuche bleiben im Zähler; laufende Versuche werden weiterhin reserviert und neue Zeitfenster nicht versehentlich verändert.
- `src/components/portal/ChatPanel.tsx`: Laufende Abrufe überlebten Seitenwechsel und konnten verspätete Login-Weiterleitungen auslösen. Cleanup bricht Abrufe ab; Antworten veralteter Requests werden ignoriert. Nach erfolgreichem Versand wird ein alter Poll abgebrochen und der Verlauf frisch geladen.
- `src/components/portal/LeadActions.tsx`: Während eines laufenden Notiz-Speichervorgangs ergänzter Text wurde anschließend gelöscht. Die Erfolgsantwort löscht jetzt nur den unveränderten, tatsächlich gesendeten Entwurf.
- Öffentliche und interne Lead-APIs: Datenbankfehler protokollieren keine vollständigen SQL-Fehlerobjekte mit möglicherweise enthaltenen Kunden- oder Notizdaten mehr. Der Fehlerzustand bleibt erkennbar.

## Prüfung

Produktionsbuild, TypeScript und ESLint bestanden; keine Lintfehler, zwei unveränderte Hinweise zu nativen Logo-Bildern. 16 Modultests und 29 Server-Integrationstests bestanden. Die Integration prüft unter anderem Adminanlage, Rollen, Multipart-Upload, Bilddekodierung, Storage, ETag, Löschung, Session-Erhalt, Berechtigungen, Unterseiten, echte 404 für unbekannte URLs, SEO und Datenbankausfälle. Tests für abgebrochene Chat-Abrufe und während des Speicherns bearbeitete Notizen verwenden die tatsächlichen Komponentenhandler mit kontrollierten Hook-/Fetch-Grenzen.

54 JSX-Dateien wurden auf unveränderte Klassen, Styles, Links, Bildreferenzen und sichtbare Texte abgeglichen. CSS, bestehende öffentliche Assets und zentrale Inhaltsdaten sind bytegleich zum Audit-Ausgangsstand. 217 lokale Imports und 34 feste interne Links sind aufgelöst. Keine neue Abhängigkeit und keine Änderung an Marketing-/Trackinglogik.

## Verbleibende Betriebsvoraussetzungen

Ein echter STRATO-Livebetrieb wurde nicht eingerichtet oder geprüft. Dafür werden ein geeigneter Node.js-Server, produktive PostgreSQL-Konfiguration und Domainzugang benötigt. Docker-Start, vollständige Browserkonsole, reale Drag-and-drop-/Back-Forward-Abläufe, Screenreader, Produktionslast und Pixelvergleich sind nicht vollständig nachgewiesen. Die Datenbankintegration lief isoliert über PGlite mit PostgreSQL-Protokoll.

Fehlende reale Betreiberangaben und die bereits dokumentierte Prüfung der Rechtstexte bleiben offen; sie werden nicht erfunden. Eingabehilfen in Formularen und absichtlich leere, lokal auszufüllende Geheimnisfelder in `.env.example` sind keine simulierten Produktfunktionen. Kein Fehler wird als gespeicherter Erfolg angezeigt. Die Prüfungen begründen keine universelle Fehlerfreiheitsgarantie.

Maschinenlesbare Ergebnisse: `FINAL-AUDIT.json`. Frühere Berichte dokumentieren vorherige Stände.
