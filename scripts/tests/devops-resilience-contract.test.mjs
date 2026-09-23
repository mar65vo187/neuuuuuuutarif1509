import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("production exposes separate health and readiness checks", () => {
  const health = read("src/app/api/health/route.ts");
  const ready = read("src/app/api/ready/route.ts");
  assert.match(health, /to_regclass/);
  assert.match(health, /missingTables/);
  assert.match(ready, /tarifwerk_migrations/);
  assert.match(ready, /latestMigration/);
  assert.match(ready, /revision/);
  assert.match(ready, /status: "ready"/);
});

test("quality pipeline proves PostgreSQL backup and restore", () => {
  const workflow = read(".github/workflows/quality.yml");
  const recovery = read("scripts/ci-recovery-smoke.sh");
  assert.match(workflow, /PostgreSQL backup and restore smoke/);
  assert.match(workflow, /ci-recovery-smoke\.sh/);
  assert.match(recovery, /postgres:17/);
  assert.match(recovery, /pg_dump/);
  assert.match(recovery, /pg_restore/);
  assert.match(recovery, /ci\.recovery\.marker/);
  assert.match(recovery, /verify-migrations\.mjs/);
});

test("production deploy promotes only a readiness-verified immutable candidate", () => {
  const workflow = read(".github/workflows/deploy-production.yml");
  assert.match(workflow, /Verify main branch/);
  assert.match(workflow, /vercel build --prod/);
  assert.match(workflow, /vercel deploy --prebuilt/);
  assert.match(workflow, /Candidate readiness gate/);
  assert.match(workflow, /\/api\/ready/);
  assert.match(workflow, /vercel promote/);
  assert.match(workflow, /vercel rollback/);
  assert.doesNotMatch(workflow, /vercel deploy --prebuilt --prod/);
});

test("green builds emit reproducible release evidence", () => {
  const workflow = read(".github/workflows/quality.yml");
  const manifest = read("scripts/release-manifest.mjs");
  assert.match(workflow, /release:manifest/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(manifest, /sha256/);
  assert.match(manifest, /migrations/);
  assert.match(manifest, /revision/);
  assert.doesNotMatch(manifest, /DATABASE_URL|SESSION_SECRET|VERCEL_TOKEN/);
});


test("production readiness requires explicit legal address and runtime smoke gates", () => {
  const ready = read("src/app/api/ready/route.ts");
  const workflow = read(".github/workflows/quality.yml");
  const runtimeSmoke = read("scripts/runtime-smoke.mjs");
  const concurrencySmoke = read("scripts/runtime-concurrency-smoke.mjs");
  assert.match(ready, /BUSINESS_ADDRESS/);
  assert.match(workflow, /Runtime HTTP smoke/);
  assert.match(workflow, /Runtime concurrency smoke/);
  assert.match(runtimeSmoke, /\/api\/ready/);
  assert.match(runtimeSmoke, /\/portal\/login/);
  assert.match(concurrencySmoke, /RUNTIME_SMOKE_CONCURRENCY/);
  assert.match(concurrencySmoke, /p95/);
});

test("Vercel acts only as a front door to the validated Railway production app", () => {
  const config = read("next.config.ts");
  assert.match(config, /process\.env\.VERCEL !== "1"/);
  assert.match(config, /beforeFiles/);
  assert.match(config, /source: "\/:path\*"/);
  assert.match(config, /https:\/\/tarifwerk-prod-production\.up\.railway\.app\/:path\*/);
  assert.match(config, /afterFiles: \[\]/);
  assert.match(config, /fallback: \[\]/);
});
