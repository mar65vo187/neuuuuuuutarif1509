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

## Agent 1 — active milestone

1. Make every public B2C/B2B route audience-safe.
2. Remove persona leakage between Privat and Business.
3. Reduce unnecessary client-side state/hydration where possible.
4. Keep primary conversion paths explicit and measurable.
5. Verify responsive, reduced-motion, keyboard and semantic behavior.
6. Run full production build + lint + tests before handoff.

## Architecture rule

Do **not** introduce microservices merely to look enterprise. Split services only when independent scaling, security isolation, deployment ownership or reliability boundaries justify the operational cost.
