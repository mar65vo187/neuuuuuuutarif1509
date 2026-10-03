import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("runtime pool works with direct and pooled Neon URLs", () => {
  const db = read("src/db/index.ts");
  assert.match(db, /-pooler/);
  assert.match(db, /usesPooledEndpoint\(databaseUrl\) \? \{\} : \{ statement_timeout/);
  assert.match(db, /query_timeout/);
});

test("Neon workflows keep the owner account as admin without creating accounts", () => {
  const ensure = read("scripts/ensure-portal-admin.mjs");
  assert.doesNotMatch(ensure, /INSERT INTO/i);
  assert.doesNotMatch(ensure, /password_hash|passwordHash/);
  const apphosting = read("apphosting.yaml");
  const owner = /PORTAL_ADMIN_EMAIL\s*\n\s*value:\s*(\S+)/.exec(apphosting)?.[1];
  assert.ok(owner, "apphosting.yaml must define PORTAL_ADMIN_EMAIL");
  for (const workflow of [".github/workflows/database-move-to-neon.yml", ".github/workflows/neon-check.yml"]) {
    const source = read(workflow);
    assert.match(source, /ensure-portal-admin\.mjs/);
    assert.match(source, /db-check\.mjs/);
    assert.ok(source.includes(`PORTAL_ADMIN_EMAIL: ${owner}`), `${workflow} must use the same admin email as apphosting.yaml`);
  }
});

test("Neon overwrite refuses to delete newer data", () => {
  const move = read(".github/workflows/database-move-to-neon.yml");
  assert.match(move, /NEWER_IN_TARGET/);
  assert.match(move, /leads lead_notes customers login_events/);
});

test("live smoke no longer depends on Railway", () => {
  const live = read(".github/workflows/live-production-smoke.yml");
  assert.doesNotMatch(live, /railway\.app/);
  assert.match(live, /hosted\.app/);
});
