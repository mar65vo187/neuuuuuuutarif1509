# TarifWerk – Next.js auf Firebase App Hosting

Der vollständige Projektcode liegt in der Repository-Wurzel. GitHub ist die Code- und Versionsverwaltung; Firebase App Hosting stellt den Next.js-Server bereit. Firebase Data Connect/Cloud SQL PostgreSQL ist als Firebase-Projekt-Datenbank vorgesehen. GitHub Pages kann diese dynamische Website, die APIs und das Portal nicht ausführen. Die vorhandene `tarifwerk new.zip` ist ein Eingangsarchiv; produktiv ist ausschließlich der Code in der Repository-Wurzel.

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

## Produktion mit GitHub und Firebase

Für diese Next.js-Anwendung ist **Firebase App Hosting** erforderlich (Firebase Hosting allein ist für den Next.js-Server und seine APIs nicht ausreichend). App Hosting baut Next.js und kann bei jedem Push auf den verbundenen GitHub-Branch ausrollen. Dafür muss das Firebase-Projekt den **Blaze-Tarif mit aktivierter Google-Cloud-Abrechnung** verwenden; Kosten sind nutzungsabhängig und nicht garantiert kostenlos. Ein Budgetalarm sollte vor dem Livegang gesetzt werden.

Die App verwendet aktuell PostgreSQL (`pg` und Drizzle) mit direkten SQL-Abfragen, Migrationen und Transaktionen. Sie kann deshalb nicht einfach auf Firestore umgestellt werden. Für den Firebase-Betrieb ist eine PostgreSQL-Datenbank im selben Firebase-Projekt nötig, z. B. eine von Firebase SQL Connect verwaltete Cloud-SQL-PostgreSQL-Instanz. Da Drizzle die Tabellen verwaltet, SQL Connect beim Verbinden so konfigurieren, dass es die Schema-Migrationen nicht eigenständig überschreibt. App Hosting braucht private VPC-Erreichbarkeit und der Backend-Service-Account braucht Cloud SQL-Zugriff; niemals `0.0.0.0/0` als Datenbankzugriff freigeben. Projekt-ID, Region, Datenbank und Zugangsdaten sind betreiberspezifisch und werden nicht in Git gespeichert.

### Einmalige Einrichtung im Firebase-Konto

1. Im Firebase Console ein Projekt auswählen oder erstellen, Blaze aktivieren und einen Budgetalarm einrichten.
2. Unter **App Hosting** einen Backend für dieses GitHub-Repository und den Branch `main` anlegen. Die Firebase GitHub-App und Developer Connect im Dialog autorisieren. Nach Merge auf `main` übernimmt App Hosting den Build und Rollout; ein separater Netlify-/Vercel-Deploy wird nicht verwendet.
3. Im selben Firebase-Projekt eine PostgreSQL-Instanz über Firebase SQL Connect/Cloud SQL bereitstellen oder verknüpfen. SQL Connect darf die Drizzle-Schemamigrationen nicht selbst verwalten. Dieselbe Region bzw. VPC für Datenbank und App-Hosting-Backend verwenden. Der App-Hosting-Service-Account benötigt `roles/cloudsql.client` und einen PostgreSQL-Datenbankbenutzer mit den für Migrationen erforderlichen Rechten. In `apphosting.yaml` stehen zunächst die `default`-Netzwerk-IDs; falls das Projekt ein eigenes Netz nutzt, dort die echten `network`- und `subnetwork`-IDs eintragen. Private VPC-Erreichbarkeit für die Datenbank aktivieren.
4. Im App Hosting Backend unter **Settings → Environment** sichere Runtime-Variablen konfigurieren: `DATABASE_URL` (private PostgreSQL-Adresse und Datenbankname), `SESSION_SECRET` (mindestens 32 zufällige Zeichen), `PORTAL_ADMIN_EMAIL` und `PORTAL_ADMIN_PASSWORD` (nur für Erstsetup/Passwortwechsel). Für echte Produktionsdaten muss vorher ein geprüftes Backup der aktuellen Produktionsdatenbank importiert werden. Der Startup-Provisioner lädt den Repository-Snapshot ausschließlich dann, wenn keine Anwendungsdaten vorhanden sind, und verweigert den Seed bei vorhandenen Daten.
5. Zusätzlich `CRON_SECRET` einrichten, wenn der interne Operations-Sweep verwendet wird. Optionale KI-Provider-Schlüssel nur dann setzen, wenn diese externen KI-Dienste ausdrücklich gewünscht und erlaubt sind.
6. Nach erfolgreichem Rollout `/api/health`, `/api/ready`, Startseite, Anfrageformular und Portal-Login prüfen. Erst nach der Datenbank- und Admin-Prüfung in Firebase die Produktionsdomain verbinden und die DNS-Einträge beim Domainanbieter umstellen. TLS wird von Firebase bereitgestellt.

App Hosting stellt `PORT` zur Verfügung. `apphosting.yaml` startet deshalb `scripts/firebase-start.mjs`: Der Server prüft die Konfiguration, führt idempotente Migrationen erst zur Laufzeit (mit VPC-Zugriff) aus, validiert Schema und Admin-Konto und startet Next.js nur bei erfolgreicher Bereitschaft. GitHub Actions sind separate Codeprüfungen; Firebase App Hosting kann unabhängig davon direkt mit GitHub deployen. Wenn GitHub Actions wegen Account-Abrechnung blockiert sind, müssen diese Prüfungen trotzdem vor einer Freigabe wieder aktiviert werden.

**Wichtig:** Firebase-Projekt, Firebase-GitHub-Verbindung, private Datenbank, Domain-DNS und Billing lassen sich nicht allein durch Dateien in diesem Repository erstellen. Der Livegang ist erst abgeschlossen, wenn `/api/ready` auf der echten Firebase-Domain `ok: true` liefert und eine echte Anmeldung sowie Anfrage erfolgreich geprüft wurden.

## Daten erhalten

`npm run db:stop` hält die lokale Datenbank an, erhält aber das Volume. `npm run db:up` startet sie erneut. Auch `docker compose --env-file .env.local down` erhält das Volume; **`down -v` löscht die Datenbank**. Vor Serverwechseln und Updates Datenbank und lokale Zugangsdaten getrennt und sicher sichern. Profilbilder liegen ebenfalls in PostgreSQL und sind dadurch Bestandteil der Datenbanksicherung.

`POSTGRES_PASSWORD` initialisiert nur ein **neues** Volume. Eine spätere Änderung in der Datei ändert kein bestehendes Datenbankpasswort. Passwörter bei Bedarf zuerst in PostgreSQL ändern und anschließend die Verbindung angleichen; nicht das Datenvolume löschen. Die lokale Docker-Datenbank ist für Entwicklung gedacht; auf öffentlich betriebenen Systemen getrennte Datenbankrollen, Backups und Zugriffsschutz einrichten.

### Datenbanksicherung und Wiederherstellung

Mitarbeiter, Leads, Kunden, Bilder und Dokumente liegen in PostgreSQL – nicht im Code. `npm run db:backup` legt einen konsistenten, verschlüsselbaren Daten-Snapshot an:

```bash
npm run db:backup            # → backups/<Zeitstempel>/ (meta.json + data/*.csv)
```

Jedes Backup enthält alle Tabellen als CSV (bytea-Bilder base64-kodiert), Prüfsummen, Zeilenzahlen und den Migrationsstand. Die letzten 7 Backups werden automatisch behalten; das Verzeichnis `backups/` bleibt **außerhalb von Git** (keine personenbezogenen Daten im Repository).

```bash
npm run db:restore backups/<Zeitstempel>                  # Verifikation in neuer Scratch-DB
npm run db:restore backups/<Zeitstempel> --drop           # Scratch-DB danach löschen
npm run db:restore backups/<Zeitstempel> --url <PG-URL>   # in eine bestehende DB wiederherstellen
```

Der Restore prüft vor dem Einlesen die Prüfsummen, wendet das aktuelle Migrations-Schema an und vergleicht danach Zeilenzahl für Zeilenzahl. Die Produktion wird ohne explizites `--url` nie berührt. Bei Firebase Cloud SQL greift der Restore bei fehlenden Serverdateirechten automatisch auf Client-Streaming zurück.

Empfehlung: Nach jeder größeren Änderung im Portal und vor jedem Update ein Backup anlegen und die Backup-Verzeichnisse zusätzlich auf einem zweiten Speicherort ablegen (z. B. verschlüsselt beim Anbieter des Backups).

## Veröffentlichung und täglicher Betrieb

Firebase App Hosting stellt die Next.js-API und dynamischen Seiten bereit. `/api/health` prüft die Datenbankverbindung; `/api/ready` prüft zusätzlich die Migrationen und meldet nur bei erfolgreichem Datenbankstart `ok: true`. Der tägliche interne Sweep ist eine geschützte HTTP-Route und muss – falls benötigt – mit Firebase Cloud Scheduler und `CRON_SECRET` aufgerufen werden.

Backups bleiben verpflichtend: `npm run db:backup` auf einem Rechner mit autorisiertem Datenbankzugang ausführen und verschlüsselt außerhalb des Git-Repositories ablegen. Vor Änderungen an der Produktionsinstanz einen Restore in einer getrennten Firebase-Datenbank testen.

## APIs und Prüfungen

Die implementierten API-Routen und HTTP-Methoden stehen vollständig in `data/config.json` unter `endpoints`. Dynamische IDs in eckigen Klammern durch reale Datensatz-IDs ersetzen. Portal- und Upload-Endpunkte prüfen Session und Rolle serverseitig. `/api/health` meldet den Datenbankzustand ohne Zugangsdaten.

```bash
npm test
npm run check
npm run db:check
```

Der fehlerhafte statische Export und die automatisch gesetzten GitHub-Unterpfade wurden aus `next.config.ts` entfernt; der Serverbetrieb einschließlich `/admin`-Weiterleitung und Sicherheitsheadern ist wiederhergestellt.

CSS, Layoutklassen, sichtbare Texte, bestehende Bilddateien sowie Marketing- und Trackinglinks bleiben erhalten. Prüfgrenzen und frühere Ergebnisse stehen in `FINAL_CHECKLIST.md` und `dokumentation/`. Lokale Datenbanklogik wird mit einer isolierten PostgreSQL-kompatiblen Testdatenbank geprüft; der echte Firebase-Livebetrieb muss nach Einrichtung des Firebase-Projekts separat durch `/api/ready` und einen Browserdurchlauf bestätigt werden.

Rechtliche Inhalte und Geschäftsdaten nicht erfinden: Die bereits dokumentierten fehlenden Betreiberangaben müssen vor dem öffentlichen Start mit echten Angaben vervollständigt werden; siehe `ASSUMPTIONS.md`.

Suggested Commit Message: `feat: complete production build v1.0`

## Dokumentation der Plattformen

- Next.js auf eigenem Server: https://nextjs.org/docs/app/guides/self-hosting
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- PostgreSQL-Container: https://hub.docker.com/_/postgres
- Docker-Umgebungsdateien: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/

## Technisches SEO-Update

Vollständig integrierte Metadaten und die drei Schritte zur Sitemap-Einreichung stehen in [GOOGLE-SEARCH-CONSOLE.md](GOOGLE-SEARCH-CONSOLE.md). Layoutklassen, CSS, sichtbare Texte, bestehende Bilddateien und Marketinglinks bleiben erhalten; Überschriftentags und Porträt-Alternativtexte wurden semantisch korrigiert. Die XML- und robots-Dateien in der Wurzel sind Exportkopien. Maßgeblich sind im Serverbetrieb die dynamischen Next.js-Routen.

## Abschlussaudit

Der letzte Audit-Lauf und seine Grenzen sind in [dokumentation/FINAL-AUDIT.md](dokumentation/FINAL-AUDIT.md) dokumentiert. Nachgewiesen sind der Produktionsbuild, 16 Modultests und 29 isolierte Server-Integrationstests. Änderungen betreffen Sitzungserhalt bei Ausfällen, die erneute Prüfung von Adminrechten, den Login-Versuchszähler, Chat-Cleanup, Notizentwürfe und datensparsame Fehlerprotokolle.
