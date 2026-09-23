# TarifWerk – aktuelle Produktionsarchitektur

Stand: 23.09.2026

Dieses Dokument beschreibt den aktuellen produktiven Aufbau. Es enthält bewusst **keine Secret-Werte, Passwörter, API-Keys oder Session-Geheimnisse**.

## Produktionspfad

```text
www.tarifwerk.eu
  -> Vercel Front Door
  -> Railway Production App (Next.js)
  -> PostgreSQL
  -> Xkiro / Qwen für öffentliche und interne KI
```

Die Vercel-Front-Door-Weiterleitung ist in `next.config.ts` so gekapselt, dass sie nur unter `VERCEL=1` greift. Railway selbst proxyt dadurch nicht zurück auf sich selbst.

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
- Xkiro als OpenAI-kompatibler Provider

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
XKIRO_API_KEY
TARIFWERK_AI_PROVIDER
TARIFWERK_AI_XKIRO_MODEL
TARIFWERK_AI_DAILY_LIMIT
TARIFWERK_AI_INCLUDE_TRAINING
```

Aktuell erwartetes Modell:

```text
qwen/qwen3.8-omni-flash:free
```

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

## Container / Deployment Bridge

Relevante Dateien:

- `Dockerfile`
- `.dockerignore`
- `.github/workflows/publish-railway-bridge.yml`

Der GitHub-Workflow baut aus dem privaten Repository ein fertiges Runtime-Image und veröffentlicht ausschließlich das Image. Der Quellcode muss dafür nicht öffentlich gemacht werden.

Der Railway-Service verwendet den veröffentlichten Image-Tag. Der Workflow erneuert das Bridge-Image regelmäßig und bei Änderungen auf `main`.

## Vercel

Relevante Dateien:

- `next.config.ts`
- `vercel.json`
- `.github/workflows/deploy-production.yml`
- `scripts/tests/devops-resilience-contract.test.mjs`

Vercel dient für `www.tarifwerk.eu` als Front Door. Der aktuelle Code kann Requests transparent an die validierte Railway-Produktion weiterreichen.

Die GitHub-Vercel-Integration kann separat durch Vercels Build-Rate-Limit eingeschränkt sein. Die produktive Anwendung bleibt davon unabhängig auf Railway lauffähig.

## Datenbank / Migrationen

Vor jedem produktiven App-Start werden Migrationen ausgeführt und verifiziert.

Aktuelle KI-Sales-Academy-Migration:

```text
0022_sales_coaching_playbook.sql
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
