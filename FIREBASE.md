# TarifWerk auf Firebase App Hosting

Diese Konfiguration bereitet den `main`-Branch für **Firebase App Hosting** in der EU-Region `europe-west4` vor. Firebase erkennt die Next.js-App und verwendet den offiziellen Framework-Adapter. `apphosting.yaml` überschreibt den Build-Befehl bewusst **nicht**.

## Was im Repository bereits vorbereitet ist

- `apphosting.yaml`: Cloud-Run-Ressourcen, Runtime-/Build-Variablen und Secret-Referenzen.
- `package.json`: `prebuild` führt `scripts/migrate-if-configured.mjs` aus. Mit `DATABASE_URL` werden nur idempotente Migrationen + Verifikation ausgeführt; ohne `DATABASE_URL` wird der Schritt übersprungen.
- `.github/workflows/operations-sweep.yml`: täglicher geschützter Operations-Sweep.

## 1. Firebase App Hosting Backend

In der Firebase-Konsole unter **Hosting & Serverless → App Hosting** ein Backend anlegen:

- Repository: `mar65vo187/neuuuuuuutarif1509`
- Live-Branch: `main`
- App root: `/`
- Region: `europe-west4`
- automatische Rollouts: an

## 2. Datenbank vor dem ersten Rollout

Die aktuelle Railway-Postgres-Instanz ist intern an Railway gebunden. Eine Firebase-App kann eine private `*.railway.internal`-Adresse nicht verwenden. Für Firebase muss `DATABASE_URL` daher auf eine PostgreSQL-Verbindung zeigen, die aus Google Cloud erreichbar ist, z. B. eine dafür bereitgestellte externe Postgres-/Neon-Verbindung.

**Keine produktive Datenbank löschen.** Vor einer Umschaltung müssen Leads, Kunden, Mitarbeiter, Bilder und Dokumente in der Ziel-Datenbank verifiziert sein.

Der Firebase-Build importiert bewusst **keinen** Seed-Snapshot automatisch. Er führt nur Migrationen und deren Verifikation aus. Dadurch überschreibt ein normaler Rollout keine vorhandenen CRM-Daten.

## 3. Firebase Secrets

Folgende Secret-IDs anlegen und dem App-Hosting-Backend Zugriff geben:

```text
tarifwerk-database-url
tarifwerk-session-secret
tarifwerk-cron-secret
```

CLI-Beispiel:

```bash
firebase apphosting:secrets:set tarifwerk-database-url
firebase apphosting:secrets:set tarifwerk-session-secret
firebase apphosting:secrets:set tarifwerk-cron-secret
```

### Öffentliche/interne KI

Für Groq/Qwen bzw. xKiro zusätzlich Secrets anlegen:

```text
tarifwerk-groq-api-key
tarifwerk-xkiro-api-key
```

Danach die vorbereiteten `GROQ_API_KEY`-/`XKIRO_API_KEY`-Blöcke in `apphosting.yaml` einkommentieren.

## 4. Rollout prüfen

Nach dem ersten erfolgreichen Rollout mindestens testen:

```text
/api/ready
/
/leistungen
/anfrage
/portal/login
```

`/api/ready` muss `ok: true` sowie `database: ready` melden. Danach Login, Leads/Kunden und Uploads prüfen.

## 5. Domain erst nach erfolgreichem Test umstellen

`www.tarifwerk.eu` erst dann mit Firebase verbinden, wenn die Firebase-URL vollständig geprüft wurde. Den bisherigen Railway-/anderen Produktionspfad erst abschalten, wenn Firebase inklusive Portal, Datenbank und KI verifiziert funktioniert.

## 6. Operations Sweep

In GitHub unter **Settings → Secrets and variables → Actions** das Repository-Secret `CRON_SECRET` setzen. Optional kann die Repository-Variable `SITE_URL` auf die aktuelle Firebase-App-Hosting-URL gesetzt werden, solange die eigene Domain noch nicht umgeschaltet ist.

## Sicherheit

- keine API-Keys, Passwörter oder DB-URLs committen
- keine Datenbank löschen oder neu initialisieren, solange die Ziel-Daten nicht geprüft sind
- Domain erst nach erfolgreichem `/api/ready` und Portaltest umstellen
- Railway erst deaktivieren, wenn Firebase nachweislich vollständig produktiv ist
