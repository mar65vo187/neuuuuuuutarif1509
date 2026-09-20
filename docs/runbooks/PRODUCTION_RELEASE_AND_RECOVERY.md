# TarifWerk Production Release & Recovery

This runbook is operational guidance for the current Next.js/PostgreSQL deployment. It does not replace provider backups or a disaster-recovery policy.

## Release gate

Production releases are allowed only from `main` and use:

1. performance guard;
2. TypeScript;
3. ESLint with zero warnings;
4. regression tests;
5. Vercel production build;
6. immutable candidate deployment;
7. `/api/ready` candidate check;
8. promotion of the exact candidate;
9. `/api/ready` production check.

If production readiness fails after promotion, the workflow attempts a Vercel rollback and fails the release.

Required GitHub Actions secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Optional when Vercel Deployment Protection is enabled:

- `VERCEL_AUTOMATION_BYPASS_SECRET`

## Health endpoints

- `/api/health`: database + critical-table health.
- `/api/ready`: migration/readiness status and deployed revision.

Do not expose credentials, database URLs, session data, row counts containing customer information, or stack traces from these endpoints.

## Backup policy

Use the hosting/database provider's automated PostgreSQL backup and PITR features in production. CI additionally proves that the current schema can be dumped and restored with PostgreSQL 17.

The CI restore smoke:

1. inserts a harmless recovery marker into the disposable test database;
2. creates a custom-format `pg_dump`;
3. restores to a fresh database;
4. verifies migration checksums;
5. verifies the restored marker;
6. drops the temporary restore database.

A green smoke test proves the repository's restore path works against the CI schema. It is not proof that the production provider has a current backup.

## Manual production recovery

Before destructive recovery, identify:

- incident start time;
- last known good application deployment;
- last known good database restore point;
- whether a database rollback is actually necessary.

Prefer application rollback first when the database is healthy and migrations are backward compatible.

### Application rollback

Use the Vercel deployment history or:

```bash
vercel rollback --token="$VERCEL_TOKEN"
```

Then confirm:

```text
https://www.tarifwerk.eu/api/ready
https://www.tarifwerk.eu/api/health
```

### Database restore

Database restores must use the provider's protected restore/PITR process or a verified PostgreSQL backup. Restore into a separate database first whenever possible, run migration verification, and only then switch application traffic.

Never restore a production database over the only remaining copy without a fresh backup/snapshot.

## Evidence

Each green quality build uploads a release manifest containing:

- Git revision;
- Node/runtime dependency versions;
- build size evidence;
- ordered migration files and SHA-256 checksums;
- required quality gates.

Release manifests intentionally contain no secrets.

## Incident minimum

For a production incident record:

- timestamp;
- affected route/system;
- deployment revision;
- symptoms;
- customer impact;
- mitigation;
- rollback/restore performed;
- root cause;
- preventive follow-up.

Security incidents additionally require credential/session review and audit-log preservation.
