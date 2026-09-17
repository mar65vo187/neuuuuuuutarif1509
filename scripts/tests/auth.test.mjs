import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import crypto from "node:crypto";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Exercise the real server module with controlled cookie/DB boundaries.
const env = { SESSION_SECRET: "test-session-secret-32-characters-minimum-only" };
const cookieJar = new Map();
let currentUser = null;
let databaseFails = false;
let now = 1800000000000;
class TestDate extends Date { static now() { return now; } }
const database = {
  select() {
    if (databaseFails) throw new Error("database offline");
    return { from() { return { where() { return { async limit() { return currentUser ? [currentUser] : []; } }; } }; } };
  },
};
const dependencies = {
  "node:crypto": crypto,
  "next/headers": { cookies: async () => ({ get: (key) => cookieJar.get(key), set: (key, value, options) => cookieJar.set(key, { value, options }) }) },
  "drizzle-orm": { eq: (...args) => args },
  "@/db": { db: database },
  "@/db/schema": { employees: new Proxy({}, { get: (_target, key) => key }) },
};
const source = readFileSync(new URL("../../src/lib/auth.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loadedModule = { exports: {} };
vm.runInNewContext(`(function(require, module, exports) { ${compiled}\n})`, { Buffer, process: { env }, URL, Headers, console, Date: TestDate })(
  (id) => { if (!(id in dependencies)) throw new Error(`Unexpected dependency: ${id}`); return dependencies[id]; }, loadedModule, loadedModule.exports,
);
const auth = loadedModule.exports;
const passwordHash = auth.hashPassword("A-valid-unique-test-password!");

function signedPayload(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${createHmac("sha256", env.SESSION_SECRET).update(body).digest("base64url")}`;
}

function request(origin, extra = {}, url = "https://tarifwerk.test/api/portal/login") {
  return { url, headers: new Headers({ ...(origin === undefined ? {} : { origin }), ...extra }) };
}

test("password hashes verify, use distinct salts, and reject malformed hashes", async () => {
  assert.equal(await auth.verifyPassword("A-valid-unique-test-password!", passwordHash), true);
  assert.equal(await auth.verifyPassword("wrong-password", passwordHash), false);
  assert.notEqual(auth.hashPassword("A-valid-unique-test-password!"), passwordHash);
  for (const value of ["", "scrypt$x$zz", `${passwordHash}$suffix`, "scrypt$" + "0".repeat(32) + "$12"]) {
    assert.equal(await auth.verifyPassword("example-password", value), false);
  }
});

test("session accepts authentic tokens and rejects tampering, suffixes, bad IDs and expiry", () => {
  const token = auth.createSessionToken(7, passwordHash);
  const payload = auth.readSessionToken(token);
  assert.equal(payload.uid, 7);
  assert.equal(auth.readSessionToken(token + ".ignored"), null);
  assert.equal(auth.readSessionToken(token.slice(0, -1) + (token.endsWith("a") ? "b" : "a")), null);
  assert.equal(auth.readSessionToken(signedPayload({ ...payload, uid: -7 })), null);
  assert.equal(auth.readSessionToken(signedPayload({ ...payload, uid: 1.5 })), null);
  assert.equal(auth.readSessionToken(signedPayload({ ...payload, exp: Math.floor(now / 1000) })), null);
  assert.equal(auth.readSessionToken(signedPayload({ ...payload, exp: Math.floor(now / 1000) + 604801 })), null);
  now += 604800000;
  assert.equal(auth.readSessionToken(token), null);
  now -= 604800000;
});

test("missing/short secrets fail closed and cannot create a default-signed session", () => {
  const original = env.SESSION_SECRET;
  const token = auth.createSessionToken(7, passwordHash);
  try {
    for (const secret of [undefined, "too-short"]) {
      env.SESSION_SECRET = secret;
      assert.throws(() => auth.createSessionToken(7, passwordHash), /SESSION_SECRET/);
      assert.equal(auth.readSessionToken(token), null);
    }
  } finally { env.SESSION_SECRET = original; }
});

test("cookie spans portal paths and user state/password changes revoke access", async () => {
  currentUser = { id: 7, name: "Test Berater", email: "berater@example.test", role: "berater", advisorId: 5, active: true, passwordHash };
  await auth.setSessionCookie(7, true, passwordHash);
  const cookie = cookieJar.get("tw_session");
  assert.equal(cookie.options.path, "/");
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.secure, true);
  assert.equal(cookie.options.sameSite, "lax");
  assert.equal((await auth.getCurrentUser()).id, 7);
  currentUser.role = "admin";
  assert.equal((await auth.getCurrentUser()).role, "admin");
  currentUser.active = false;
  assert.equal(await auth.getCurrentUser(), null);
  currentUser.active = true;
  currentUser.passwordHash = auth.hashPassword("A-new-unique-test-password!");
  assert.equal(await auth.getCurrentUser(), null);
  currentUser.passwordHash = passwordHash;
  databaseFails = true;
  await assert.rejects(auth.getCurrentUser(), auth.AuthenticationUnavailableError);
  databaseFails = false;
  assert.equal((await auth.getCurrentUser()).id, 7);
  assert.equal(cookieJar.get("tw_session").value, cookie.value);
  await auth.clearSessionCookie();
  assert.equal(cookieJar.get("tw_session").options.maxAge, 0);
  assert.equal(await auth.getCurrentUser(), null);
});

test("same-origin checks reject foreign origins and support HTTPS reverse proxies", () => {
  assert.equal(auth.isSameOriginRequest(request("https://tarifwerk.test")), true);
  assert.equal(auth.isSameOriginRequest(request("https://attacker.test")), false);
  assert.equal(auth.isSameOriginRequest(request("null")), false);
  assert.equal(auth.isSameOriginRequest(request("https://tarifwerk.test/path")), false);
  assert.equal(auth.isSameOriginRequest(request(undefined)), false);
  assert.equal(auth.isSameOriginRequest(request(undefined, { "sec-fetch-site": "same-origin" })), true);
  assert.equal(auth.isSameOriginRequest(request("https://tarifwerk.test", { "sec-fetch-site": "cross-site" })), false);
  assert.equal(auth.isSameOriginRequest(request("https://tarifwerk.test", { host: "tarifwerk.test", "x-forwarded-proto": "https" }, "http://localhost:3000/api/portal/login")), true);
  assert.equal(auth.isSameOriginRequest(request("https://attacker.test", { host: "tarifwerk.test", "x-forwarded-proto": "https" }, "http://localhost:3000/api/portal/login")), false);
  assert.equal(auth.isSameOriginRequest(request("https://www.tarifwerk.eu", { host: "internal:3000", "x-forwarded-host": "www.tarifwerk.eu", "x-forwarded-proto": "https" }, "http://internal:3000/api/portal/admin/users")), true);
  assert.equal(auth.isSameOriginRequest(request("https://attacker.test", { host: "internal:3000", "x-forwarded-host": "www.tarifwerk.eu", "x-forwarded-proto": "https" }, "http://internal:3000/api/portal/admin/users")), false);
});
