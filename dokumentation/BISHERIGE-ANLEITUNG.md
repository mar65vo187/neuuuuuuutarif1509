# TarifWerk – Website und Mitarbeiterportal

Vollständiger Next.js-Quellcode auf Basis der gelieferten neu.zip. Bestehende Gestaltung, CSS, Schriftarten, Bilder, Animationen, Werbetexte und Marketinglinks wurden beibehalten. Neu hinzugekommen sind die Benutzerverwaltung und das Empfehlungsprogramm mit einem zusätzlichen Footer-Link sowie einer optionalen Zustimmung im Empfehlungsformular.

## Start und Betrieb

Die Anwendung benötigt Node.js ab 20.9, PostgreSQL und eine Serverumgebung, die Next.js mit Node.js ausführt. `index.html` im übergeordneten Ordner ist die unveränderte statische Startseiten-Vorschau. Portal, Datenbank und Upload laufen im hier enthaltenen Serverprojekt. Das bloße Hochladen der HTML-Datei aktiviert diese Funktionen nicht.

1. In diesem Ordner `npm ci` ausführen.
2. Die echte PostgreSQL-Verbindung als `DATABASE_URL` in der Serververwaltung oder `.env.local` setzen.
3. Ein dauerhaftes `SESSION_SECRET` mit mindestens 32 zufälligen Zeichen setzen. Zum Erzeugen: `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`. Auf allen Instanzen denselben Wert verwenden; ein Wechsel beendet bestehende Sitzungen.
4. `PORTAL_ADMIN_EMAIL` und ein eigenes `PORTAL_ADMIN_PASSWORD` mit 12 bis 200 Zeichen setzen. Es gibt kein Standardpasswort.
5. `npm run db:migrate` ausführen. Die Migration unterstützt das ursprüngliche Schema sowie eine leere Datenbank. Bestehende Datensätze werden nicht gelöscht. Migrationen vorab mit einer Sicherung der Produktionsdatenbank anwenden.
6. `npm run db:seed` einmalig ausführen. Wiederholungen erhalten vorhandene Profile und Passwörter. Anschließend `PORTAL_ADMIN_PASSWORD` aus der Serverkonfiguration entfernen.
7. `npm run build`, danach `npm start` ausführen. Lokal startet `npm run dev` den Entwicklungsserver. Produktiv HTTPS verwenden und den Proxy so konfigurieren, dass Host und Protokoll korrekt weitergegeben sowie vom Client gelieferte Forwarded-Header ersetzt werden.

Keine Datenbankzugänge, produktiven Geheimnisse oder Testbenutzer sind im Paket enthalten. Das Serverprojekt wurde nicht auf tarifwerk.eu oder Sites veröffentlicht. Der PostgreSQL-TCP-Treiber benötigt eine passende Node.js-Serverumgebung; die vorhandene statische Sites-Veröffentlichung bietet diese Serverfunktionen nicht automatisch.

## Verwaltung

- Anmeldung: `/portal/login`.
- Benutzer, Rollen, öffentliche Beraterprofile und Bilder: `/portal/verwaltung`; `/admin` leitet dorthin weiter. Im Desktopportal öffnet der anklickbare Rollenhinweis `admin` die Verwaltung.
- Administratoren verwalten Konten und sehen alle Anfragen. Berater sehen eigene Zuweisungen sowie verfügbare allgemeine Anfragen und unzugewiesene Anfragen an ihr Profil. Bewerbungen bleiben Administratoren vorbehalten.
- Passwortänderungen entwerten bisherige Sitzungen. Deaktivierte Konten erhalten keinen Portalzugriff. Öffentliche Profilsichtbarkeit wird separat verwaltet.
- Eigene Herabstufung/Deaktivierung ist gesperrt; mindestens ein aktiver Administrator bleibt erhalten.
- Bestehende Beraterprofile lassen sich deaktivieren, ohne zugeordnete Leads zu verlieren.
- Benutzerlöschung erfordert eine ausdrückliche Bestätigung. Der eigene Zugang kann nicht gelöscht werden. Ein allein zugeordnetes Profil samt Bild wird mitgelöscht; gemeinsam genutzte Profile bleiben erhalten. Zugeordnete Anfragen werden dem ausführenden Administrator übertragen. Notizen und Chatnachrichten bleiben ohne Autorenverknüpfung erhalten. Löschung beendet den Portalzugriff sofort.

## Freunde werben

`/freund-werben` erstellt nach Zustimmung einen zufälligen öffentlichen Empfehlungslink und einen separaten privaten Status-Link. Teilen ist per Kopieren, Browser-Teilen, WhatsApp oder E-Mail möglich. Es wird nichts automatisch versendet. Die Funktion benötigt die zweite Migration; `npm run db:migrate` wendet beide Migrationen an.

Der private Zugriffsschlüssel steht nur im Fragment des Status-Links und wird beim Abruf im Authorization-Header übertragen. In der Datenbank liegt nur sein SHA-256-Hash. Der Link muss als Lesezeichen gesichert werden; ein Wiederherstellungs-E-Mail-Dienst ist nicht eingerichtet. Jeder mit diesem privaten Link kann die zusammengefassten Zahlen sehen. Öffentlich geteilte Links enthalten diesen Schlüssel nicht.

Neue Kontakte entscheiden mit einer separaten, freiwilligen Checkbox, ob ihre Anfrage zugeordnet wird. Ohne Zustimmung wird eine normale Anfrage gespeichert. Dieselbe E-Mail wird je empfehlender Person einmal gezählt; Eigenempfehlungen werden ausgeschlossen. Die Statusanzeige enthält nur Gesamtzahlen, keine Namen oder Vertragsdetails. „Abgeschlossen“ folgt dem echten Bearbeitungsstatus im Portal und bedeutet keine automatische Prämienfreigabe. Es werden keine unsichtbaren Tracking-Cookies ergänzt oder vorhandene Marketingelemente verändert.

Es sind keine pauschalen Rabatte, Geldprämien oder automatischen Auszahlungen aktiviert. Falls tatsächlich freigegebene Vorteile bestehen, können die vollständigen Bedingungen als `REFERRAL_FRIEND_BENEFIT` und `REFERRAL_REFERRER_BENEFIT` auf dem Server hinterlegt werden (je maximal 500 Zeichen). Ohne Werte erscheinen keine erfundenen Vorteile. Diese Einstellungen sind Informationstexte, keine Zahlungs- oder Rabattberechnung. Geldbeträge, Gültigkeit und Abwicklung müssen vom Betreiber festgelegt werden.

Die Registrierung ist auf fünf Versuche pro Stunde und IP je Serverinstanz begrenzt. Das bestehende Anfragelimit bleibt erhalten. Für einen Betrieb mit mehreren Instanzen ist ein gemeinsam durchgesetztes Proxy-Limit erforderlich; Forwarded-Header müssen vom vertrauenswürdigen Proxy ersetzt werden. Ein ungültiger oder deaktivierter Empfehlungslink blockiert allgemeine Anfragen nicht. Datenschutzinformationen und interne Löschprozesse müssen vor dem Livebetrieb auch das neue Programm berücksichtigen.

## GitHub und Hosting

Das Paket enthält vollständige Quelldateien und `package-lock.json`. `node_modules`, Buildausgaben und lokale Geheimnisse gehören nicht in Git. Das Serverprojekt liegt im Unterordner `quellcode`: diesen Ordner beim Hosting als Projektwurzel auswählen, Framework Next.js, Installationsbefehl `npm ci`, Build `npm run build`. Alternativ nur den Inhalt von `quellcode` in die Repository-Wurzel übernehmen. GitHub Pages allein führt den benötigten Next.js-Server und die Datenbank nicht aus.

Eine konkrete GitHub-Repository-Adresse oder produktive Hosting-Konfiguration wurde nicht vorgegeben. Daher wurde weder ein Repository angelegt/gepusht noch ein Deployment ausgelöst. Migration und Erstanlage werden bewusst separat vor dem Start ausgeführt, nicht bei jedem Seitenaufruf oder Build.

## Profilbilder

JPG, PNG oder WebP; höchstens 5 MiB und 20 Megapixel, Seitenlänge höchstens 8000 Pixel. Die Prüfung umfasst Dateikopf und vollständige Dekodierung. Bilder werden orientiert, auf höchstens 1600 Pixel verkleinert, von Metadaten bereinigt und als WebP in PostgreSQL gespeichert. Das vermeidet verlorene Dateien bei Serverneustarts und zustandslosen Instanzen. Profil und Bild werden transaktional aktualisiert. Hash-basierte URLs und ETags vermeiden veraltete Anzeigen. Upload per Dateiauswahl oder Drag-and-drop; bei Fehlern bleiben Kontodaten und bearbeitete Eingaben erhalten.

Einzige zusätzlich deklarierte Laufzeitabhängigkeit: `sharp` exakt `0.34.5`; notwendig zur vollständigen Dekodierung und sicheren Normalisierung hochgeladener Bilder. Die Version war bereits über Next.js installiert und ist im Lockfile festgehalten.

## Wartung und Prüfung

`npm run typecheck`, `npm run lint`, `npm run build` und `node --test scripts/tests/auth.test.mjs`.
`GET /api/health` prüft die Datenbankverbindung.

Ein ausdrücklicher Admin-Passwortreset ist über `PORTAL_ADMIN_RESET_PASSWORD=true` zusammen mit dem neuen `PORTAL_ADMIN_PASSWORD` und `npm run db:seed` möglich. Danach beide Variablen entfernen. Bestehende Konten anderer Rollen werden vom Seed nicht zu Administratoren hochgestuft.

## Grenzen des geprüften Stands

Der Prüfbericht liegt im übergeordneten Ordner. Serverprüfungen erfolgten in einer isolierten PostgreSQL-kompatiblen Testdatenbank mit künstlichen Daten, nicht gegen die produktive Infrastruktur. Ein vollständiger Browser-/Pixelvergleich und Live-Integrationstest sind noch offen. Die im Original fehlende Geschäftsadresse wurde inzwischen mit den vom Betreiber bereitgestellten Angaben Karawankenstraße 1, 65187 Wiesbaden ergänzt. Die aktuellen Rechtstexte sollten vor produktivem Einsatz weiterhin fachlich gegen die tatsächlich eingesetzten Dienste und Abläufe geprüft werden.
