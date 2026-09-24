# TarifWerk – aktuelle Produktionsarchitektur

Stand: 24.09.2026

Dieses Dokument beschreibt den aktuellen produktiven Aufbau. Es enthält bewusst **keine Secret-Werte, Passwörter, API-Keys oder Session-Geheimnisse**.

## Produktionspfad

```text
www.tarifwerk.eu
  -> Railway Proxy (tarifwerk-web / nginx)
  -> Railway Production App (tarifwerk-prod / Next.js)
  -> PostgreSQL
  -> Groq / Qwen für öffentliche KI
  -> xKiro / weitere Provider für interne KI
```

Die öffentliche Domain ist direkt mit dem Railway-Proxy `tarifwerk-web` verbunden. Dieser leitet intern an `tarifwerk-prod` weiter. Die optionale Vercel-Weiterleitung in `next.config.ts` bleibt als separater Fallback gekapselt und greift nur unter `VERCEL=1`.

Direkte Railway-Produktionsdomain:

```text
https://tarifwerk-prod-production.up.railway.app
```

## Öffentliche KI

Relevante Dateien:

- `src/components/site/PublicAiChat.tsx`
- `src/app/api/public-ai/route.ts`
- `src/lib/public-ai-assistant.ts`
- `scripts/tests/public-ai-assistant-contract.test.mjs`

Eigenschaften:

- eigener öffentlicher Chatbot
- nur öffentliche TarifWerk-Wissensbasis
- keine internen CRM-, Provisions- oder Trainingsdaten
- B2C-/B2B-Ansprache
- personenbezogene Kontaktangaben werden vor KI-Anfragen entfernt
- Same-Origin-Schutz und Rate-Limit
- menschliche Übergabe zur persönlichen Beratung
- Groq als primärer OpenAI-kompatibler Provider mit Qwen 3.8 27B
- xKiro nur als automatischer Ausfall-Fallback für den öffentlichen Chat
- serverseitiges Tagesbudget als Puffer unter dem Groq-Free-Tier-Limit

## Interne KI / Sales Academy

Relevante Dateien:

- `src/components/portal/AiSalesAssistant.tsx`
- `src/app/api/portal/ai/route.ts`
- `src/lib/ai-sales-assistant.ts`
- `migrations/0022_sales_coaching_playbook.sql`
- `scripts/tests/ai-assistant-contract.test.mjs`

Eigenschaften:

- bestehendes Mitarbeiter-Login bleibt erhalten
- keine separaten KI-Accounts
- Elite-Coach, Rollenspiel, Debrief, Einwandtraining, Pitch, Produktwissen und Nachrichten
- B2C-/B2B-Modus
- Gesprächsverlauf für interaktive Trainings
- freigegebenes Produkt-/Partnerwissen
- internes Sales-Playbook und Trainingsmodule
- E-Mail-Adressen und Telefonnummern werden auch aus dem Verlauf vor Versand entfernt
- Kundenakten werden nicht automatisch an den KI-Provider übertragen
- interne Nutzungsgrenzen pro Mitarbeiter
- Nutzungstelemetrie speichert keine Frage-/Antworttexte

## AI Runtime Variablen

Nur Namen – Werte gehören ausschließlich in die jeweilige Hosting-/Secret-Verwaltung:

```text
GROQ_API_KEY
TARIFWERK_PUBLIC_AI_PROVIDER
TARIFWERK_PUBLIC_AI_GROQ_MODEL
TARIFWERK_PUBLIC_AI_GROQ_DAILY_LIMIT
XKIRO_API_KEY
TARIFWERK_PUBLIC_AI_XKIRO_MODEL

TARIFWERK_AI_PROVIDER
TARIFWERK_AI_XKIRO_MODEL
TARIFWERK_AI_DAILY_LIMIT
TARIFWERK_AI_INCLUDE_TRAINING
```

Öffentliches Primärmodell:

```text
qwen/qwen3.8-27b
```

Der öffentliche Chat verwendet standardmäßig `auto`: Groq/Qwen zuerst, xKiro nur bei fehlendem Groq-Secret, ausgeschöpftem Tagesbudget oder einem Provider-Ausfall. Standardmäßig werden höchstens 900 Groq-Aufrufe pro 24-Stunden-Fenster zugelassen, damit ein Puffer unter dem Free-Tier-RPD-Limit bleibt.

Interne KI-Konfiguration und internes Training bleiben davon getrennt.

## Weitere notwendige Runtime Variablen

```text
DATABASE_URL
SESSION_SECRET
CRON_SECRET
PORTAL_ADMIN_EMAIL
PORTAL_OWNER_EMAIL
PORTAL_ADMIN_PASSWORD
BUSINESS_ADDRESS
NODE_ENV
PORT
```

Keine dieser Variablen darf mit produktivem Wert committed werden.

## Railway

Produktive Dienste:

- `tarifwerk-prod` – Next.js Anwendung
- `Postgres` – produktive Datenbank
- `tarifwerk-web` – vorhandener öffentlicher Proxy-Service / Infrastrukturpfad

Produktive App:

- Start: `npm run start`
- Healthcheck: `/api/ready`
- Pre-Deploy:
  `npm run db:migrate && node scripts/verify-migrations.mjs && npm run db:seed`

## Deployment-Quelle

Primärer Produktionspfad:

- `tarifwerk-prod` ist direkt mit dem privaten GitHub-Repository `mar65vo187/neuuuuuuutarif1509` verbunden.
- Branch: `main`.
- Änderungen auf `main` werden von Railway direkt gebaut und erst nach erfolgreichem Pre-Deploy und `/api/ready`-Healthcheck aktiv.
- Bestehende Railway-Variablen, Datenbankverbindung, Startkommando und Healthcheck bleiben servicegebunden erhalten.

Der frühere Container-Bridge-Pfad bleibt als Recovery-/Fallback-Baustein im Repository:

- `Dockerfile`
- `.dockerignore`
- `.github/workflows/publish-railway-bridge.yml`

Damit hängt die produktive Veröffentlichung nicht mehr von einem temporären `ttl.sh`-Image oder einem separaten GitHub-Actions-Image-Build ab.

## Vercel

Relevante Dateien:

- `next.config.ts`
- `vercel.json`
- `.github/workflows/deploy-production.yml`
- `scripts/tests/devops-resilience-contract.test.mjs`

Vercel ist nicht mehr der notwendige Produktions-Front-Door-Pfad für `www.tarifwerk.eu`. Der aktuelle Code kann dort weiterhin als zusätzlicher Fallback Requests an die validierte Railway-Produktion weiterreichen.

Vercels Build-Rate-Limit kann damit die produktive Railway-Anwendung nicht blockieren.

## Datenbank / Migrationen

Vor jedem produktiven App-Start werden Migrationen ausgeführt und verifiziert.

Aktuelle Migrationen umfassen unter anderem:

```text
0022_sales_coaching_playbook.sql
0023_optimization_membership_hub.sql
0024_private_direct_messages.sql
```

Die Quality-Pipeline prüft zusätzlich:

- Migrationen
- Schema
- PostgreSQL Backup/Restore
- Production Build
- Runtime HTTP Smoke
- Runtime Concurrency Smoke
- TypeScript
- ESLint
- Tests

## Sicherheitsregeln

- keine Secret-Werte in GitHub
- keine produktiven API-Keys in Source oder Dokumentation
- keine Passwörter in Commit-Historie
- öffentliches KI-System strikt vom internen CRM-Wissen trennen
- bestehende Rollen- und Lead-Sichtbarkeit nicht aufweiten
- vertrauliche Provisions-/Owner-Daten nur in dafür autorisierten Bereichen
- produktive Login- und Mitarbeiterdaten nicht durch Deployments ersetzen

## Release-Grundsatz

Neue Änderungen werden gegen `main` geprüft. Vor produktiven Änderungen müssen mindestens TypeScript, ESLint, Tests, Production Build, Runtime-Smoke und Datenbankchecks grün sein.

<!-- railway-source-trigger: 2026-09-24T20:47+02:00 source-live-connected -->

<!-- railway-real-source-build-trigger: 2026-09-24T17:35Z -->


## Reproduzierbare Runtime-Fallbacks

Die temporären Railway-Hotfixes sind ab jetzt ebenfalls versioniert:

- `deploy/railway/public-ai-runtime-bridge.cjs`
- `deploy/railway/nginx-public-nav.conf`
- `deploy/railway/README.md`

Diese Dateien enthalten keine Secrets. Sie dienen nur dazu, den aktuell laufenden älteren Railway-Snapshot reproduzierbar auf den Funktionsstand von `main` zu heben. Nach einem bestätigten vollständigen Source/Image-Deploy aus aktuellem `main` können die Bridges entfernt werden.
