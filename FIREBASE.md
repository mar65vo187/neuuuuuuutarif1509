# TarifWerk auf Firebase App Hosting

Diese Anleitung zieht die Website von Render auf **Firebase App Hosting** (Google Cloud, Region **europe-west4 / Niederlande**). Die Datenbank bleibt bei **Neon** – es werden keine Daten verschoben.

Konfiguration im Repository:

| Datei | Zweck |
|---|---|
| `apphosting.yaml` | Server-Größe, Build-Befehl, Umgebungsvariablen und Secrets |
| `package.json` → `build:firebase` | Wendet Migrationen an (`scripts/provision-database.mjs`) und baut Next.js |
| `.github/workflows/operations-sweep.yml` | Täglicher Operations-Sweep um 04:00 UTC (ersetzt die Netlify-Funktion) |
| `src/app/apple-icon.tsx` | PNG-Icon für iPhone/iPad (iOS zeigt SVG-Icons nicht an) |

---

## 1. Firebase-Projekt anlegen (einmalig, ca. 5 Min.)

1. <https://console.firebase.google.com> → **Projekt hinzufügen** → Name z. B. `tarifwerk` → Google Analytics **nicht** aktivieren.
2. Links unten **Upgrade** → Tarif **Blaze** wählen und Zahlungsmethode hinterlegen. App Hosting setzt Blaze voraus; bezahlt wird nur, was über das monatliche Gratis-Kontingent hinausgeht.
3. **Budget-Warnung setzen (wichtig):** <https://console.cloud.google.com/billing> → *Budgets & Benachrichtigungen* → *Budget erstellen* → Betrag z. B. **5 €** → E-Mail-Benachrichtigung bei 50 %, 90 %, 100 %.

## 2. Backend anlegen

1. Firebase-Konsole → **App Hosting** → **Los gehts / Backend erstellen**.
2. Region: **`europe-west4`** (Niederlande). ⚠️ Lässt sich später nicht ändern.
3. GitHub verbinden → Repository `mar65vo187/neuuuuuuutarif1509`, Branch `main`, Stammverzeichnis `/`.
4. Automatische Rollouts: **an**.
5. Backend-Name: **`tarifwerk`** (wird unten in den Befehlen verwendet).

Der erste Rollout darf fehlschlagen – die Secrets fehlen noch. Das ist normal.

## 3. Secrets hinterlegen

Auf dem eigenen Rechner (Node.js muss installiert sein):

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # Projekt "tarifwerk" auswählen
```

Dann nacheinander jedes Secret anlegen. Der Befehl fragt den Wert ab und fragt, ob das Backend Zugriff bekommen soll → **Ja** und Backend `tarifwerk` wählen:

```bash
firebase apphosting:secrets:set tarifwerk-database-url
firebase apphosting:secrets:set tarifwerk-session-secret
firebase apphosting:secrets:set tarifwerk-cron-secret
```

| Secret | Wert |
|---|---|
| `tarifwerk-database-url` | Die **gepoolte** Neon-URL (enthält `-pooler`), zu finden in der Neon-Konsole unter *Connection Details*. |
| `tarifwerk-session-secret` | **Neuer** Zufallswert, mind. 32 Zeichen: `openssl rand -base64 48`. Ein neuer Wert meldet alle alten Portal-Sessions ab – gewollt. |
| `tarifwerk-cron-secret` | **Neuer** Zufallswert: `openssl rand -base64 48`. Denselben Wert auch in GitHub hinterlegen (Schritt 6). |

Falls die Zugriffsfrage übersprungen wurde:

```bash
firebase apphosting:secrets:grantaccess tarifwerk-database-url,tarifwerk-session-secret,tarifwerk-cron-secret --backend tarifwerk
```

**KI-Chat (optional):** Wird der öffentliche KI-Chat genutzt, zusätzlich `firebase apphosting:secrets:set tarifwerk-groq-api-key` ausführen und danach den entsprechenden Block in `apphosting.yaml` einkommentieren. Ohne Schlüssel antwortet der Chat mit der eingebauten lokalen Wissensbasis.

## 4. Rollout starten und testen

1. Firebase-Konsole → App Hosting → `tarifwerk` → **Rollouts** → **Rollout erstellen** (Branch `main`).
2. Nach dem Build ist die Seite unter `https://tarifwerk--<projekt-id>.europe-west4.hosted.app` erreichbar (genaue Adresse steht in der Konsole).
3. Prüfen:
   - `<adresse>/api/ready` → muss `"ok": true` melden
   - Startseite, `/leistungen`, `/anfrage` öffnen
   - Portal-Login unter `/portal/login` testen

## 5. Domain umziehen

1. Firebase-Konsole → App Hosting → `tarifwerk` → **Einstellungen → Domains** → **Benutzerdefinierte Domain hinzufügen** → `www.tarifwerk.eu`, danach genauso `tarifwerk.eu`.
2. Firebase zeigt die nötigen DNS-Einträge (A-/TXT-/CNAME-Records). Beim DNS-Anbieter von `tarifwerk.eu`:
   - die **alten Einträge auf Render entfernen** (`www` zeigt derzeit auf `tarifwerk.onrender.com`),
   - die Einträge von Firebase genau so eintragen.
3. Warten, bis Firebase „Verbunden“ und ein SSL-Zertifikat anzeigt (meist unter 1 Stunde, maximal 24 Stunden).
4. Die Anwendung leitet `tarifwerk.eu` selbst auf `https://www.tarifwerk.eu` um (`src/proxy.ts`).

## 6. Täglichen Operations-Sweep aktivieren

GitHub → Repository → **Settings → Secrets and variables → Actions** → **New repository secret**:

- Name: `CRON_SECRET`
- Wert: derselbe Wert wie `tarifwerk-cron-secret`

Test: **Actions → Operations Sweep → Run workflow**. Ein grüner Haken bedeutet, dass alles funktioniert.

## 7. Render abschalten

Erst wenn `https://www.tarifwerk.eu` über Firebase läuft (Schritt 5 abgeschlossen, Seite und Portal getestet):

Render-Dashboard → Service → **Settings → Delete Service**. Die Neon-Datenbank **nicht** löschen – Firebase nutzt sie weiter.

---

## Kosten im Blick

- Gratis-Kontingent pro Monat u. a.: 2 Mio. Requests, 10 GiB ausgehender Traffic, 180.000 vCPU-Sekunden, 2.500 Build-Minuten.
- `apphosting.yaml` begrenzt die Instanzen auf `maxInstances: 3` und fährt ohne Besucher auf 0 herunter (`minInstances: 0`).
- `minInstances: 1` verhindert die kurze Anlaufzeit nach Ruhephasen, kostet aber dauerhaft Geld – nur bei Bedarf ändern.

## Datenbank-Region

Neon-Konsole → Projekt → *Settings*: Liegt die Datenbank in einer US-Region, sollte sie für kurze Ladezeiten und einfacheren Datenschutz nach **AWS Europe Central 1 (Frankfurt)** umziehen (neues Neon-Projekt in Frankfurt, `npm run db:backup` / `node scripts/db-restore.mjs`, danach Secret `tarifwerk-database-url` aktualisieren).

## Wenn der Build fehlschlägt

- **„secret … not found“ / „permission denied“:** Schritt 3 wiederholen, inkl. `grantaccess`.
- **Fehler im Schritt `[provision]`:** `DATABASE_URL` prüfen (gepoolte Neon-URL). Die Migrationen überschreiben niemals vorhandene Daten.
- **Build bricht beim eigenen Build-Befehl ab:** In `apphosting.yaml` den Block `scripts:` entfernen (dann baut Firebase mit dem Standard `npm run build`) und Migrationen künftig einmalig lokal ausführen: `DATABASE_URL="<neon-url>" PORTAL_ADMIN_EMAIL="m.egenolf@tarifwerk.eu" npm run db:provision`.

## Datenschutzerklärung anpassen

Nach dem Umzug in der Datenschutzerklärung unter **„2. Hosting“** den tatsächlichen Anbieter eintragen (Google / Firebase App Hosting, Serverstandort EU, Region europe-west4) sowie Neon als Datenbank-Dienstleister. Rechtliche Formulierung bitte prüfen lassen.
