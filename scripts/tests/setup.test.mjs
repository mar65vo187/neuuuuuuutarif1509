import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parse } from "dotenv";

const scripts = fileURLToPath(new URL("../", import.meta.url));
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(DATABASE_URL|SESSION_SECRET|PORTAL_ADMIN_|POSTGRES_)/.test(key)));
function run(name, cwd, extra = {}) {
  const result = spawnSync(process.execPath, [join(scripts, name)], { cwd, env: { ...cleanEnv, ...extra }, encoding: "utf8" });
  assert.ifError(result.error);
  return result;
}

test("local setup creates matching credentials, keeps them private and never overwrites", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "tarifwerk-setup-"));
  try {
    const result = run("env-init.mjs", cwd);
    assert.equal(result.status, 0, result.stderr);
    const before = await readFile(join(cwd, ".env.local"), "utf8");
    const env = parse(before);
    const url = new URL(env.DATABASE_URL);
    assert.equal(url.password, env.POSTGRES_PASSWORD);
    assert.equal(url.hostname, "127.0.0.1");
    assert.equal(url.pathname, "/tarifwerk");
    assert.equal(env.SESSION_SECRET.length, 96);
    assert.equal(env.PORTAL_ADMIN_PASSWORD.length, 32);
    for (const value of [env.POSTGRES_PASSWORD, env.PORTAL_ADMIN_PASSWORD, env.SESSION_SECRET]) {
      assert.ok(!(result.stdout + result.stderr).includes(value));
    }
    if (process.platform !== "win32") assert.equal((await stat(join(cwd, ".env.local"))).mode & 0o777, 0o600);
    assert.equal(run("env-check.mjs", cwd).status, 0);
    assert.equal(run("env-init.mjs", cwd).status, 1);
    assert.equal(await readFile(join(cwd, ".env.local"), "utf8"), before);
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test("existing .env is preserved; missing configuration fails without leaking input", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "tarifwerk-config-"));
  try {
    assert.equal(run("env-check.mjs", cwd).status, 1);
    const invalid = run("env-check.mjs", cwd, { DATABASE_URL: "https://private-token.invalid", SESSION_SECRET: "short-private-value" });
    assert.equal(invalid.status, 1);
    assert.ok(!(invalid.stdout + invalid.stderr).includes("private-token"));
    assert.ok(!(invalid.stdout + invalid.stderr).includes("short-private-value"));
    await writeFile(join(cwd, ".env"), "# existing configuration\n");
    assert.equal(run("env-init.mjs", cwd).status, 1);
    assert.equal(await readFile(join(cwd, ".env"), "utf8"), "# existing configuration\n");
    await assert.rejects(readFile(join(cwd, ".env.local")), { code: "ENOENT" });
  } finally { await rm(cwd, { recursive: true, force: true }); }
});
