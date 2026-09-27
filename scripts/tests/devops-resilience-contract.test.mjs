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

test("production deploy ships a readiness-verified immutable runtime image", () => {
  const dockerfile = read("Dockerfile");
  const imageWorkflow = read(".github/workflows/publish-railway-bridge.yml");
  const liveWorkflow = read(".github/workflows/live-production-smoke.yml");
  const ready = read("src/app/api/ready/route.ts");
  // immutable multi-stage image with an unprivileged runtime user
  assert.match(dockerfile, /FROM node:24-bookworm-slim AS deps/);
  assert.match(dockerfile, /FROM node:24-bookworm-slim AS builder/);
  assert.match(dockerfile, /FROM node:24-bookworm-slim AS runner/);
  assert.match(dockerfile, /USER node/);
  assert.match(dockerfile, /npm prune --omit=dev/);
  assert.doesNotMatch(dockerfile, /\.env|DATABASE_URL/);
  // CI proves the image boots and answers HTTP before it may be promoted
  assert.match(imageWorkflow, /docker build --pull --tag tarifwerk-runtime:ci \./);
  assert.match(imageWorkflow, /Container HTTP smoke/);
  // live production stays continuously verified against the readiness gate
  assert.match(liveWorkflow, /live-production-smoke\.mjs/);
  assert.match(ready, /tarifwerk_migrations/);
  assert.match(ready, /status: "ready"/);
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

test("runtime is self-contained without an external front door", () => {
  const config = read("next.config.ts");
  assert.doesNotMatch(config, /beforeFiles/);
  assert.doesNotMatch(config, /\.up\.railway\.app/);
  assert.doesNotMatch(config, /rewrites/);
  // public entry points and security headers stay in the app itself
  assert.match(config, /source: "\/admin"/);
  assert.match(config, /destination: "\/portal\/verwaltung"/);
  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /X-Frame-Options/);
});
