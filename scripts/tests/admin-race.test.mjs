import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as zod from "zod";
import { NextRequest, NextResponse } from "next/server.js";

function load(path, dependencies) {
  const js = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${js}\n})`, { Buffer, console })(name => {
    if (!(name in dependencies)) throw new Error(`Unexpected module ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports);
  return loaded.exports;
}
const schema = { employees: {}, advisors: {}, advisorImages: {} };
const orm = { eq: (...args) => args, asc: value => value, sql: (...args) => args };
let actor, locked, writes;
const tx = {
  async execute() { locked = true; },
  select() { assert.ok(locked, "Privileges must be checked after the transaction lock"); return { from() { return { where() { return { async limit() { return actor ? [actor] : []; } }; } }; } }; },
  insert() { writes++; throw new Error("Unexpected persistent write"); },
  delete() { writes++; throw new Error("Unexpected persistent delete"); },
};
const db = { async transaction(fn) { locked = false; return fn(tx); } };
const deps = {
  "next/server": { NextRequest, NextResponse }, "drizzle-orm": orm, "@/db": { db }, "@/db/schema": schema,
  "@/lib/auth": { getCurrentUser: async () => ({ id: 1, role: "admin", active: true }), isSameOriginRequest: () => true, hashPassword: () => "not-persisted-test-hash" },
};
const server = load("../../src/lib/admin-server.ts", deps);
const validation = load("../../src/lib/admin-validation.ts", { zod });
const users = load("../../src/app/api/portal/admin/users/route.ts", { ...deps, "@/lib/admin-server": server, "@/lib/admin-validation": validation, "@/lib/enterprise": { writeAudit: async () => {} } });
const images = load("../../src/app/api/portal/admin/advisors/[id]/image/route.ts", { ...deps, "@/lib/admin-server": server, "@/lib/advisor-image": {}, sharp: {}, "node:crypto": {} });

test("revoked administrators cannot create accounts or delete images after initial authorization", async () => {
  for (const current of [null, { role: "admin", active: false }, { role: "berater", active: true }]) {
    actor = current; writes = 0;
    const response = await users.POST(new NextRequest("https://tarifwerk.test/api/portal/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Test Account", email: "new@example.test", role: "admin", active: true, advisor: null, password: "Unique-test-password!" }) }));
    assert.equal(response.status, 403);
    const removed = await images.DELETE(new NextRequest("https://tarifwerk.test/api/portal/admin/advisors/2/image", { method: "DELETE" }), { params: Promise.resolve({ id: "2" }) });
    assert.equal(removed.status, 403);
    assert.equal(writes, 0);
  }
});

test("active administrator passes the transaction check", async () => {
  actor = { role: "admin", active: true };
  locked = false;
  await server.lockAdminMutation(tx, 1);
  assert.equal(locked, true);
});
