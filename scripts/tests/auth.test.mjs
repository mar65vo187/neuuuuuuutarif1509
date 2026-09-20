import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import crypto from "node:crypto";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const env = { SESSION_SECRET: "test-session-secret-32-characters-minimum-only", NODE_ENV: "test" };
const cookieJar = new Map();
let currentUser = null;
let databaseFails = false;
let now = 1800000000000;
let sessionId = 1;
const sessions = [];

class TestDate extends Date {
  constructor(...args) { super(...(args.length ? args : [now])); }
  static now() { return now; }
}

const employees = new Proxy({}, { get: (_target, key) => "employee." + String(key) });
const portalSessions = new Proxy({}, { get: (_target, key) => "session." + String(key) });

function activeSession() {
  return sessions.find((row) => !row.revokedAt) ?? null;
}

const database = {
  insert(table) {
    return {
      async values(value) {
        if (table !== portalSessions) throw new Error("unexpected insert table");
        sessions.push({ id: sessionId++, revokedAt: null, ...value });
      },
    };
  },
  delete() {
    return { where() { return Promise.resolve([]); } };
  },
  update(table) {
    return {
      set(patch) {
        return {
          where() {
            const targets = table === portalSessions ? sessions.filter((row) => !row.revokedAt) : [];
            for (const row of targets) Object.assign(row, patch);
            const returned = targets.map((row) => ({ id: row.id }));
            return {
              then(resolve) { return Promise.resolve(returned).then(resolve); },
              catch(handler) { return Promise.resolve(returned).catch(handler); },
              returning() { return Promise.resolve(returned); },
            };
          },
        };
      },
    };
  },
  select() {
    if (databaseFails) throw new Error("database offline");
    return {
      from(table) {
        if (table !== portalSessions) throw new Error("unexpected select table");
        return {
          innerJoin() {
            return {
              where() {
                return {
                  async limit() {
                    const session = activeSession();
                    if (!session || !currentUser) return [];
                    return [{
                      sessionId: session.id,
                      sessionCredential: session.credentialSignature,
                      mfaVerified: session.mfaVerified,
                      createdAt: session.createdAt,
                      lastSeenAt: session.lastSeenAt,
                      expiresAt: session.expiresAt,
                      revokedAt: session.revokedAt,
                      id: currentUser.id,
                      name: currentUser.name,
                      email: currentUser.email,
                      role: currentUser.role,
                      advisorId: currentUser.advisorId,
                      active: currentUser.active,
                      passwordHash: currentUser.passwordHash,
                    }];
                  },
                };
              },
            };
          },
          where() {
            return Promise.resolve(sessions.filter((row) => !row.revokedAt));
          },
        };
      },
    };
  },
};

const orm = {
  eq: (...args) => ["eq", ...args],
  and: (...args) => ["and", ...args],
  or: (...args) => ["or", ...args],
  isNull: (...args) => ["isNull", ...args],
  lt: (...args) => ["lt", ...args],
  ne: (...args) => ["ne", ...args],
};

const dependencies = {
  "node:crypto": crypto,
  "next/headers": {
    cookies: async () => ({
      get: (key) => cookieJar.get(key),
      set: (key, value, options) => cookieJar.set(key, { value, options }),
    }),
  },
  "drizzle-orm": orm,
  "@/db": { db: database },
  "@/db/schema": { employees },
  "@/db/enterprise-schema": { portalSessions },
};

const source = readFileSync(new URL("../../src/lib/auth.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loadedModule = { exports: {} };
vm.runInNewContext(`(function(require, module, exports) { ${compiled}\n})`, { Buffer, process: { env }, URL, Headers, console, Date: TestDate })(
  (id) => { if (!(id in dependencies)) throw new Error(`Unexpected dependency: ${id}`); return dependencies[id]; },
  loadedModule,
  loadedModule.exports,
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

test("password hashes verify and malformed hashes fail closed", async () => {
  assert.equal(await auth.verifyPassword("A-valid-unique-test-password!", passwordHash), true);
  assert.equal(await auth.verifyPassword("wrong-password", passwordHash), false);
  assert.notEqual(auth.hashPassword("A-valid-unique-test-password!"), passwordHash);
  assert.equal(await auth.verifyPassword("example-password", "scrypt$x$zz"), false);
});

test("legacy signed helper rejects tampering and expiry", () => {
  const token = auth.createSessionToken(7, passwordHash);
  const payload = auth.readSessionToken(token);
  assert.equal(payload.uid, 7);
  assert.equal(auth.readSessionToken(token + ".ignored"), null);
  assert.equal(auth.readSessionToken(signedPayload({ ...payload, uid: -7 })), null);
  assert.equal(auth.readSessionToken(signedPayload({ ...payload, exp: Math.floor(now / 1000) })), null);
});

test("live session is opaque, server-backed and password-bound", async () => {
  sessions.length = 0;
  cookieJar.clear();
  currentUser = { id: 7, name: "Test", email: "test@example.test", role: "berater", advisorId: 5, active: true, passwordHash };
  await auth.setSessionCookie(7, true, passwordHash, { mfaVerified: true, ip: "192.0.2.1", userAgent: "Test Browser" });

  const cookie = cookieJar.get("tw_session");
  assert.match(cookie.value, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.secure, true);
  assert.equal(cookie.options.maxAge, 43200);
  assert.equal(sessions.length, 1);

  const user = await auth.getCurrentUser();
  assert.equal(user.id, 7);
  assert.equal(user.mfaVerified, true);

  currentUser.passwordHash = auth.hashPassword("A-new-unique-test-password!");
  assert.equal(await auth.getCurrentUser(), null);
});

test("database outage fails closed and logout clears cookie", async () => {
  sessions.length = 0;
  cookieJar.clear();
  currentUser = { id: 8, name: "Admin", email: "admin@example.test", role: "admin", advisorId: null, active: true, passwordHash };
  await auth.setSessionCookie(8, true, passwordHash);
  databaseFails = true;
  await assert.rejects(auth.getCurrentUser(), auth.AuthenticationUnavailableError);
  databaseFails = false;
  await auth.clearSessionCookie();
  assert.equal(cookieJar.get("tw_session").options.maxAge, 0);
  assert.equal(await auth.getCurrentUser(), null);
});

test("same-origin checks reject foreign origins", () => {
  assert.equal(auth.isSameOriginRequest(request("https://tarifwerk.test")), true);
  assert.equal(auth.isSameOriginRequest(request("https://attacker.test")), false);
  assert.equal(auth.isSameOriginRequest(request(undefined, { "sec-fetch-site": "same-origin" })), true);
  assert.equal(auth.isSameOriginRequest(request("https://tarifwerk.test", { host: "tarifwerk.test", "x-forwarded-proto": "https" }, "http://localhost:3000/api/portal/login")), true);
});
