# TarifWerk – vollständiges Next.js-Serverprojekt

## Warum die veröffentlichten Unterseiten 404 zeigten

Das überprüfte Repository mar65vo187/tarifwerkneuu veröffentlicht über GitHub Pages eine einzelne statische index.html. Die tatsächlichen Seiten und APIs lagen im Unterordner quellcode. GitHub Pages führt keinen Next.js-Server aus. Deshalb kann es /berater, /leistungen, /anfrage und /portal nicht aus diesem Quellcode bereitstellen.

Dieses Paket legt package.json, next.config.ts, src und public direkt in die Projektwurzel. vercel.json legt Next.js als Framework fest. Das vereinfacht den korrekten Import. Es macht die Anwendung NICHT mit GitHub Pages kompatibel. Die Domain wurde noch nicht umgestellt.

## Veröffentlichung über einen Next.js-Host

1. ZIP entpacken. Den Inhalt als vollständiges Projekt in ein neues GitHub-Repository hochladen; package.json muss direkt in der Repository-Wurzel liegen. Die ZIP selbst hochzuladen entpackt oder veröffentlicht nichts. Das bestehende Repository und seine Veröffentlichung bleiben bis zur erfolgreichen Umstellung erhalten.
2. Das neue Repository beim Next.js-Host importieren. Für Vercel: Framework Next.js, Root Directory ./, Installation npm ci, Build npm run build; kein statisches Ausgabeverzeichnis angeben. GitHub Pages nicht für dieses Projekt aktivieren.
3. Eine echte PostgreSQL-Datenbank verbinden. DATABASE_URL und ein dauerhaftes zufälliges SESSION_SECRET mit mindestens 32 Zeichen ausschließlich in den Server-Umgebungsvariablen hinterlegen. Ein Secret kann mit node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))" erzeugt werden. Keine Servergeheimnisse als NEXT_PUBLIC_-Variablen anlegen.
4. Zur Erstanlage zusätzlich PORTAL_ADMIN_EMAIL und ein eigenes PORTAL_ADMIN_PASSWORD mit mindestens 12 Zeichen setzen. In einer vertrauenswürdigen Node.js-Umgebung mit denselben Datenbankvariablen npm ci, npm run db:migrate und npm run db:seed ausführen. Dafür ist keine Installation mit Administratorrechten erforderlich, wenn eine Browser-Entwicklungsumgebung genutzt wird. Nach erfolgreicher Erstanlage PORTAL_ADMIN_PASSWORD dort entfernen.
5. Das Projekt bauen und auf seiner vom Host vergebenen Adresse prüfen: /leistungen, /berater, /anfrage, /portal/login, /api/health. Danach im Portal Anmeldung, Benutzeranlage und Profilbild-Upload prüfen. /api/health muss die konfigurierte Datenbank erreichen.
6. Erst nach erfolgreicher Prüfung www.tarifwerk.eu beim neuen Host hinzufügen und beim DNS-Anbieter exakt dessen angezeigte Einträge setzen. Die bestehenden GitHub-Pages-Einträge dann durch diese Zielwerte ersetzen. DNS-Werte werden hier nicht erfunden. Vor der Domainumstellung bleibt die alte Veröffentlichung unverändert erreichbar.

Benutzerverwaltung: /portal/verwaltung, alternativ /admin. Empfehlungsprogramm: /freund-werben. Auf allen Serverinstanzen dieselbe Datenbank und dasselbe Session-Geheimnis verwenden.

## Eigener Node.js-Server

Nach npm ci, Konfiguration, Migration und Erstanlage: npm run build und npm start. HTTPS und Reverse Proxy müssen vom Host korrekt eingerichtet werden. PostgreSQL benötigt dauerhaftes Speichervolumen. Das Veröffentlichen nur von HTML-Dateien reicht nicht.

## Prüfungen und unveränderte Gestaltung

Vorhandene Design-Tokens, Layoutklassen, Bilder, Kontaktlinks und Werbeinhalte bleiben erhalten. Ergänzt wurden CSP-Schutz, sichere JSON-LD-Ausgabe, Reduced-Motion-Unterstützung, Tastaturfokus im mobilen Menü und Metadaten. Es wurden keine neuen Laufzeitabhängigkeiten installiert.

Aktuelle Annahmen und nicht nachgewiesene Anforderungen: ASSUMPTIONS.md. Aktueller Prüfstatus: FINAL_CHECKLIST.md. Historische Berichte unter dokumentation/ beziehen sich auf frühere Prüfläufe und werden durch den aktuellen Bericht ergänzt.

Die auditierbaren Quelltext-/Konfigurationsinventare liegen unter data/. Mit node scripts/audit-content.mjs werden sie aus dem Quellcode neu erzeugt. Laufzeitdaten wie Kundennamen oder private Portalstatistiken sind darin nicht enthalten.

Prüfbefehle: npm run check sowie node --test scripts/tests/auth.test.mjs scripts/tests/security.test.mjs.

Nonce-basierte CSP erfordert dynamisches HTML und verhindert gemeinsamen HTML-Cache. Bilder, Schriftdateien und andere Assets sind davon ausgenommen. Hintergrund: https://nextjs.org/docs/app/guides/content-security-policy . Die Reduced-Motion-Umsetzung nutzt https://motion.dev/docs/react-accessibility .

## Noch erforderlich

Produktive Hosting-/Datenbankkonfiguration und Domainumschaltung. Die vollständige Geschäftsadresse und die zum Empfehlungsprogramm passende Datenschutzinformation müssen vor Livebetrieb vervollständigt bzw. geprüft werden. Ein vollständiger Browser- und Live-Integrationstest bleibt notwendig. Es wurden weder produktive Konten erfunden noch Zahlungen oder Hostingverträge abgeschlossen.

Details zu Rollen, Uploadformaten, Empfehlungen und Wartung: dokumentation/BISHERIGE-ANLEITUNG.md. Deren frühere Ordnerangabe quellcode gilt in diesem neu angeordneten Paket nicht mehr; Befehle werden direkt in der Projektwurzel ausgeführt.

Quellen zur Hostingursache:
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://nextjs.org/docs/app/guides/static-exports

## Schnellstart und API

Für die lokale Oberfläche: npm install && npm run dev, anschließend http://localhost:3000 öffnen. Für Datenbankfunktionen müssen vorher die oben beschriebenen Servervariablen, Migrationen und Erstanlage gesetzt sein. Direktes Öffnen einer HTML-Datei startet die Serveranwendung nicht.

Die vollständige Liste der tatsächlich implementierten API-Routen und HTTP-Methoden steht in data/config.json unter endpoints. Eckige Klammern bezeichnen dynamische Pfadsegmente, die durch die ID des betreffenden Datensatzes ersetzt werden. Die Endpunkte für Portalverwaltung und Uploads prüfen Anmeldung und Rollen serverseitig.

Suggested Commit Message: feat: complete production build v1.0
