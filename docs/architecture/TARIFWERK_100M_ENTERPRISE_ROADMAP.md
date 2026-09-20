# TarifWerk 100M Enterprise Roadmap

> Zielbild: ein integriertes Sales-, Operations- und Customer-Experience-System. Der "100M"-Anspruch ist ein Qualitätsstandard, keine Unternehmensbewertung oder technische Garantie.

```mermaid
flowchart LR
  A1["1 · Frontend & Web\nConversion · Performance · A11y"]
  A2["2 · Backoffice & Ops\nWorkflows · RBAC · Audit"]
  A3["3 · CRM\nCustomer 360 · Pipeline · LTV"]
  A4["4 · AI & Automation\nExplainable Next Actions · Agents"]
  A5["5 · Security & Compliance\nZero Trust · DSGVO · Controls"]
  A6["6 · DevOps & Cloud\nCI/CD · Observability · Resilience"]
  A7["7 · Finance\nCommission · Reconciliation · Billing"]
  A8["8 · BI\nData Quality · Metrics · Forecast Inputs"]
  A9["9 · Marketing\nSEO · Attribution · Campaign Ops"]
  A10["10 · Personalization\nAudience · Intent · Experience"]

  A1 --> A2 --> A3 --> A4 --> A5 --> A6 --> A7 --> A8 --> A9 --> A10
  A10 --> H["Enterprise Hardening\nLoad · Security · Recovery · UX QA"]
```

## Integration backbone

All modules share the same principles:

- one canonical identity and RBAC model;
- audit trail for sensitive mutations;
- API-first domain boundaries without premature microservices;
- PostgreSQL as system of record;
- events/outbox for automation and integrations;
- explainable recommendations instead of opaque automated decisions;
- role-aware visibility and data minimization;
- mobile-first operational UX;
- measurable quality gates in CI before production.

## Milestones

| Agent | Scope | Production gate |
| --- | --- | --- |
| 1 | Public website, audience journeys, forms, speed, accessibility, conversion clarity | No broken journey, correct B2C/B2B language, Core Web Vitals-ready architecture, build/lint/tests green |
| 2 | Portal shell, workflow UX, permissions, operational controls | Every daily workflow has owner, state, next action, auditability |
| 3 | Lead/Customer 360, referrals, contact intelligence, pipeline, retention | No orphan leads, source attribution, next-action coverage, customer history |
| 4 | Automation/AI | Deterministic fallbacks, explainable output, human approval for material actions |
| 5 | Security/Compliance | Least privilege, session controls, audit logs, deletion/retention processes, security headers |
| 6 | Delivery/Cloud | Reproducible deploys, monitoring, backup/restore, rollback, capacity evidence |
| 7 | Finance | Reconciliation, commission states, immutable financial history, exportability |
| 8 | BI | Canonical KPIs, data-quality monitors, traceable metric definitions |
| 9 | Growth | Technical SEO, attribution, consent-safe measurement, campaign landing flows |
| 10 | Personalization | Audience/intent-driven UI with transparent logic and non-manipulative UX |
| Hardening | Whole platform | E2E, load, recovery, accessibility and security review |

## Current implementation status

| Agent | Status | Implemented baseline |
| --- | --- | --- |
| 1 · Frontend & Web | implemented | B2C/B2B journeys, conversion flow, accessibility/performance guards, audience-safe routing |
| 2 · Backoffice & Ops | implemented | dark portal shell, RBAC, ownership, audit, operations controls |
| 3 · CRM | implemented | Lead/Customer 360, call intelligence, referrals, retention, next actions |
| 4 · AI & Automation | implemented | explainable work assistant, deterministic provider warnings, human-approved automation templates |
| 5 · Security & Compliance | implemented | session controls, MFA, CSP/HSTS, rate limits, audit and privacy controls |
| 6 · DevOps & Cloud | implemented | readiness/health, release manifests, backup-restore smoke, gated production promotion |
| 7 · Finance | implemented | commission/reconciliation controls and immutable financial ledger |
| 8 · BI | implemented | canonical KPI catalog, metric lineage, data-quality coverage and historical run-rate inputs |
| 9 · Marketing | implemented | technical SEO, first-party attribution, campaign landing flows, spend/CPL/CPA cockpit |
| 10 · Personalization | implemented | audience journeys plus transparent session-only intent continuation |
| Enterprise Hardening | active | CI now includes build, migrations, backup/restore smoke, production-runtime HTTP smoke and bounded concurrency smoke; remaining gates require live production/browser/provider access |

"Implemented" means the production-grade baseline exists in the repository and is covered by automated quality gates. It does not mean a business outcome, ranking, revenue level or uptime percentage is guaranteed.

## Architecture rule

Do **not** introduce microservices merely to look enterprise. Split services only when independent scaling, security isolation, deployment ownership or reliability boundaries justify the operational cost.


## Remaining production-only verification

These items cannot be truthfully completed from repository code alone:

- live production deployment and readiness on the final hosting account;
- real browser visual regression across production viewports and devices;
- provider-side backup/PITR verification against the actual production PostgreSQL service;
- Google Search Console ownership, sitemap submission and index request;
- DNS/domain verification and final canonical inspection on the live domain;
- production environment values for BUSINESS_ADDRESS, CRON_SECRET and optional AI/search verification settings.

The repository blocks or exposes readiness for configuration it can verify. External provider/account state must still be confirmed on the real production environment.
