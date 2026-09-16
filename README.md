# TarifWerk – Next.js mit PostgreSQL, ohne Vercel

Der vollständige Projektcode liegt in der Repository-Wurzel. GitHub speichert den Code; zum Ausführen werden Node.js und PostgreSQL benötigt. Eine ZIP-Datei auf GitHub startet keinen Server. Die vorhandene `tarifwerk new.zip` im Repository ist das unveränderte Eingangsarchiv; der aktuelle ausführbare Stand sind die entpackten Dateien in der Wurzel. GitHub Pages führt weder diese APIs noch das Portal aus.

## Lokaler Start mit eigener Datenbank

Voraussetzungen: Node.js ab 20.9 (unterstützte LTS-Version empfohlen), npm und Docker mit Compose v2 einschließlich `--wait`.

```bash
npm ci
npm run env:init
npm run db:up
npm run db:setup
npm run dev
```

Danach http://localhost:3000 öffnen. Anmeldung: http://localhost:3000/portal/login. Die Admin-E-Mail und das zufällig erzeugte Admin-Passwort stehen in der lokalen `.env.local`. Dort die gewünschte E-Mail **vor** `db:setup` einstellen. Verwaltung: `/portal/verwaltung`, Kurzadresse `/admin`.

`env:init` erzeugt eine vollständige lokale Verbindung, ein individuelles Datenbankpasswort, ein Session-Geheimnis und ein Admin-Passwort. Es überschreibt weder `.env` noch `.env.local` und gibt keine Geheimnisse aus. Diese Dateien niemals hochladen. `.env.example` ist die sichere, absichtlich unausgefüllte Vorlage für eine andere Datenbank; keine produktiven Zugangsdaten sind im Repository oder ZIP enthalten.

`db:up` startet PostgreSQL **17.11-bookworm**, wartet auf dessen Bereitschaft und bindet Port 5432 nur an 127.0.0.1. Das feste Image stellt die benötigte echte PostgreSQL-Datenbank bereit; neue npm-Abhängigkeiten sind dafür nicht nötig. Belegt bereits eine andere Datenbank Port 5432, deren Verbindung verwenden oder Port in `compose.yaml` und `DATABASE_URL` zusammen anpassen.

`db:setup` prüft die Konfiguration, führt Migrationen aus, legt den Admin an und prüft den Datenbankstand. Bereits angewendete Migrationen und bestehende Passwörter bleiben bei Wiederholung erhalten. Nach Erstanlage darf `PORTAL_ADMIN_PASSWORD` entfernt werden. Für eine ausdrücklich gewünschte Rücksetzung `PORTAL_ADMIN_RESET_PASSWORD=true` und ein neues Passwort setzen, `npm run db:seed` ausführen, anschließend beide Passwortvariablen entfernen. Das entwertet bestehende Sitzungen dieses Kontos.

## Vorhandene PostgreSQL-Datenbank verwenden

Docker ist dann nicht nötig:

1. `.env.example` als `.env.local` kopieren.
2. `DATABASE_URL` mit der tatsächlichen PostgreSQL-Verbindung des Betreibers ausfüllen. TLS-Einstellungen des Datenbankanbieters übernehmen; Zertifikatsprüfung nicht abschalten. Der Datenbankbenutzer benötigt für die Einrichtung Rechte zum Erstellen von Tabellen, Typen und Indizes.
3. `SESSION_SECRET` mit mindestens 32 zufälligen Zeichen setzen, beispielsweise mit `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`. Dauerhaft speichern und auf allen App-Instanzen identisch verwenden.
4. `PORTAL_ADMIN_EMAIL` und ein individuelles `PORTAL_ADMIN_PASSWORD` mit 12 bis 200 Zeichen setzen.
5. `npm ci`, `npm run db:setup`, danach `npm run dev` ausführen.

Server-Umgebungsvariablen haben Vorrang vor `.env.local`, diese vor `.env`. Keine Geheimnisse als `NEXT_PUBLIC_` definieren. In Next.js-Umgebungsdateien enthaltene Dollarzeichen müssen als `\$` maskiert werden; Passwörter in Verbindungs-URLs außerdem URL-kodieren. Der lokale Generator verwendet deshalb ausschließlich URL-sichere Zeichen ohne Dollarzeichen.

Die Einzelschritte bleiben verfügbar:

```bash
npm run env:check
npm run db:migrate
npm run db:seed
npm run db:check
```

`env:check` validiert Werte ohne Verbindungsaufbau. `db:check` verbindet sich tatsächlich und prüft Migrationsprüfsummen, Portaltabellen sowie das aktive Admin-Konto. Ein erfolgreicher Build allein bestätigt keine Datenbankverbindung.

## Betrieb mit STRATO und GitHub

Dieses Projekt benötigt einen dauerhaft laufenden Node.js-Prozess. Auf einem vorhandenen STRATO-Server/VPS mit Node.js und PostgreSQL kann es ohne Vercel betrieben werden. Ob dein gebuchter Tarif das unterstützt, ist nicht bekannt. Reiner Webspace oder eine Domain allein genügt für diese Next.js-Anwendung nicht. Ein zusätzlicher Server wird durch diese Dateien weder gebucht noch bezahlt; vollständig kostenloser Dauerbetrieb ist mit dem unbekannten Tarif nicht zugesichert.

Auf einem geeigneten Server den Repository-Inhalt auschecken und die echten Variablen setzen. Nach `npm ci` und `npm run db:setup`:

```bash
npm run build
npm start -- --hostname 127.0.0.1
```

Next.js läuft standardmäßig auf Port 3000. Einen dauerhaft überwachten Prozess und einen HTTPS-Reverse-Proxy davor einrichten, einschließlich Weiterleitung von Host und Protokoll. Zugangsdaten, DNS und Zertifikate müssen zum eigenen Server gehören. Das Repository enthält keine erfundenen Zieladressen. `vercel.json` ist nur eine unveränderte Alt-Konfiguration und wird beim beschriebenen Node.js-Betrieb nicht benutzt.

Vor der Domainumschaltung `/api/health`, `/leistungen`, `/berater`, `/anfrage` und `/portal/login` auf dem Zielserver prüfen; anschließend Anmeldung, Benutzeranlage und Profilbild-Upload. Erst danach die Domain beim DNS-Anbieter auf diesen Server zeigen lassen. GitHub Pages nicht als Host für diesen Servercode verwenden.

## Daten erhalten

`npm run db:stop` hält die lokale Datenbank an, erhält aber das Volume. `npm run db:up` startet sie erneut. Auch `docker compose --env-file .env.local down` erhält das Volume; **`down -v` löscht die Datenbank**. Vor Serverwechseln und Updates Datenbank und lokale Zugangsdaten getrennt und sicher sichern. Profilbilder liegen ebenfalls in PostgreSQL und sind dadurch Bestandteil der Datenbanksicherung.

`POSTGRES_PASSWORD` initialisiert nur ein **neues** Volume. Eine spätere Änderung in der Datei ändert kein bestehendes Datenbankpasswort. Passwörter bei Bedarf zuerst in PostgreSQL ändern und anschließend die Verbindung angleichen; nicht das Datenvolume löschen. Die lokale Docker-Datenbank ist für Entwicklung gedacht; auf öffentlich betriebenen Systemen getrennte Datenbankrollen, Backups und Zugriffsschutz einrichten.

## APIs und Prüfungen

Die implementierten API-Routen und HTTP-Methoden stehen vollständig in `data/config.json` unter `endpoints`. Dynamische IDs in eckigen Klammern durch reale Datensatz-IDs ersetzen. Portal- und Upload-Endpunkte prüfen Session und Rolle serverseitig. `/api/health` meldet den Datenbankzustand ohne Zugangsdaten.

```bash
npm test
npm run check
npm run db:check
```

Der fehlerhafte statische Export und die automatisch gesetzten GitHub-Unterpfade wurden aus `next.config.ts` entfernt; der Serverbetrieb einschließlich `/admin`-Weiterleitung und Sicherheitsheadern ist wiederhergestellt.

CSS, Layoutklassen, sichtbare Texte, bestehende Bilddateien sowie Marketing- und Trackinglinks bleiben erhalten. Das anschließende SEO-Update ergänzt Metadaten und korrigiert semantische Überschriftentags und Porträt-Alttexte; Details stehen unten. Keine neue npm-Abhängigkeit. Prüfgrenzen und Ergebnisse: `FINAL_CHECKLIST.md`; frühere Berichte bleiben unter `dokumentation/` erhalten. Der lokale Docker-Container wurde in der Bearbeitungsumgebung mangels Docker nicht gestartet; Datenbanklogik und Serverflüsse werden dort separat mit einer isolierten PostgreSQL-kompatiblen Testdatenbank geprüft. Ein echter Live-Test auf deinem STRATO-Server bleibt erforderlich.

Rechtliche Inhalte und Geschäftsdaten nicht erfinden: Die bereits dokumentierten fehlenden Betreiberangaben müssen vor dem öffentlichen Start mit echten Angaben vervollständigt werden; siehe `ASSUMPTIONS.md`.

Suggested Commit Message: `feat: complete production build v1.0`

## Dokumentation der Plattformen

- Next.js auf eigenem Server: https://nextjs.org/docs/app/guides/self-hosting
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- PostgreSQL-Container: https://hub.docker.com/_/postgres
- Docker-Umgebungsdateien: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/

## Technisches SEO-Update

Vollständig integrierte Metadaten und die drei Schritte zur Sitemap-Einreichung stehen in [GOOGLE-SEARCH-CONSOLE.md](GOOGLE-SEARCH-CONSOLE.md). Layoutklassen, CSS, sichtbare Texte, bestehende Bilddateien und Marketinglinks bleiben erhalten; Überschriftentags und Porträt-Alternativtexte wurden semantisch korrigiert. Die XML- und robots-Dateien in der Wurzel sind Exportkopien. Maßgeblich sind im Serverbetrieb die dynamischen Next.js-Routen.
