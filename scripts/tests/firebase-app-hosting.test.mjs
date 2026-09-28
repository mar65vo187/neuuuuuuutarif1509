import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const appHosting = readFileSync(resolve(root, "apphosting.yaml"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

test("Firebase App Hosting uses the runtime bootstrap, not a build-time database connection", () => {
  assert.match(appHosting, /runCommand:\s*node \.next\/standalone\/scripts\/firebase-start\.mjs/);
  assert.match(appHosting, /PRIVATE_RANGES_ONLY/);
  assert.equal(packageJson.scripts["start:firebase"], "node scripts/firebase-start.mjs");
  assert.equal(existsSync(resolve(root, "netlify.toml")), false);
});

test("Firebase runtime fails closed before serving when required production settings are missing", () => {
  const env = { ...process.env, DATABASE_URL: "", SESSION_SECRET: "", PORTAL_ADMIN_EMAIL: "" };
  const result = spawnSync(process.execPath, [resolve(root, "scripts/firebase-start.mjs")], {
    cwd: root,
    env,
    encoding: "utf8",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL/);
  assert.match(result.stderr, /SESSION_SECRET/);
  assert.match(result.stderr, /PORTAL_ADMIN_EMAIL/);
  assert.doesNotMatch(result.stderr, /password|secret value/i);
});

test("Firebase database initialization is serialized and never restores over populated tables", () => {
  const provisioner = readFileSync(resolve(root, "scripts/provision-database.mjs"), "utf8");
  assert.match(provisioner, /pg_advisory_lock\(867392402\)/);
  assert.match(provisioner, /priorSchema/);
  assert.match(provisioner, /existingInstall/);
  assert.match(provisioner, /Repository-Snapshot wird NICHT geladen/);
  assert.match(provisioner, /to_regclass\('public\.employees'\).*to_regclass\('public\.advisors'/s);
});
