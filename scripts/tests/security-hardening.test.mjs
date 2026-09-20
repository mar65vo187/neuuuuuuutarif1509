import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("portal sessions are server-side, bounded and revocable", () => {
  const auth = read("src/lib/auth.ts");
  const migration = read("migrations/0008_portal_security_hardening.sql");
  assert.match(auth, /SESSION_ABSOLUTE_SECONDS = 60 \* 60 \* 12/);
  assert.match(auth, /SESSION_IDLE_SECONDS = 60 \* 60/);
  assert.match(auth, /portalSessions/);
  assert.match(auth, /revokeOtherPortalSessions/);
  assert.match(auth, /credentialSignature/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS portal_sessions/);
  assert.match(migration, /token_hash text NOT NULL UNIQUE/);
});

test("administrator mutations require MFA-assured session", () => {
  const source = read("src/lib/admin-server.ts");
  assert.match(source, /mutation && user\.mfaVerified !== true/);
  assert.match(source, /Zwei-Faktor-Anmeldung/);
});

test("login throttling is shared and HMAC-pseudonymized", () => {
  const source = read("src/app/api/portal/login/route.ts");
  assert.match(source, /portal_login_rate_limits/);
  assert.match(source, /createHmac\("sha256"/);
  assert.match(source, /portal-login-limit/);
  assert.match(source, /Retry-After/);
  assert.match(source, /updated_at < now\(\) - interval '24 hours'/);
});

test("production sends HSTS and CSP upgrades insecure resources", () => {
  const config = read("next.config.ts");
  const security = read("src/lib/security.ts");
  assert.match(config, /Strict-Transport-Security/);
  assert.match(config, /max-age=63072000/);
  assert.match(config, /X-Permitted-Cross-Domain-Policies/);
  assert.match(security, /upgrade-insecure-requests/);
});

test("new and changed passwords require at least 15 characters", () => {
  assert.match(read("src/lib/admin-validation.ts"), /min\(15, "Das Passwort muss mindestens 15 Zeichen enthalten\."/);
  assert.match(read("src/app/api/portal/account/password/route.ts"), /min\(15, "Das neue Passwort muss mindestens 15 Zeichen enthalten\."/);
});
