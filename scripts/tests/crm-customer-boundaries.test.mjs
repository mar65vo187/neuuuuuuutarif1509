import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../../", import.meta.url));
const { drizzle } = require("drizzle-orm/node-postgres");
const { getTableColumns } = require("drizzle-orm");
const employee = { id: 42, role: "berater" };
function load(path, overrides = {}, cache = new Map()) {
  if (cache.has(path)) return cache.get(path);
  const loadedModule = { exports: {} };
  cache.set(path, loadedModule.exports);
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, { Date, Math, Number, Buffer, Set, Map })(name => {
    if (name in overrides) return overrides[name];
    if (name.startsWith("@/")) return load(resolve(root, "src", name.slice(2) + ".ts"), overrides, cache);
    if (name.startsWith(".")) return load(resolve(dirname(path), name + ".ts"), overrides, cache);
    return require(name);
  }, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const schema = load(resolve(root, "src/db/enterprise-schema.ts"));
const constants = load(resolve(root, "src/lib/enterprise-access.ts"), { "@/db": {} }).PORTAL_PERMISSION;
function harness({ grants = [], respond = () => [] } = {}) {
  const calls = [];
  const db = drizzle({ async query(config, params = []) {
    const sql = typeof config === "string" ? config : config.text;
    calls.push({ sql, params });
    return { rows: respond(sql, params) };
  }});
  const overrides = {
    "@/db": { db },
    "@/lib/auth": {},
    "@/lib/content": { SITE: {} },
    "@/lib/compensation": { isCompensationOwner: () => false },
    "@/lib/referral-reward-engine": {},
    "@/lib/enterprise-access": {
      PORTAL_PERMISSION: constants,
      permissionSnapshot: async (_user, keys) => Object.fromEntries(keys.map(key => [key, grants.includes(key)])),
      requirePermission: async (_user, key) => {
        if (!grants.includes(key)) throw Object.assign(new Error("Forbidden"), { status: 403 });
      },
    },
  };
  return { db, calls, identity: load(resolve(root, "src/lib/contact-identity.ts"), overrides),
    enterprise: load(resolve(root, "src/lib/enterprise.ts"), overrides) };
}
function customerRow(overrides = {}) {
  const value = { id: 71, customerNumber: "TEST-71", type: "private", firstName: "Test", ownerEmployeeId: 42,
    createdAt: "2026-09-01T12:00:00Z", updatedAt: "2026-09-01T12:00:00Z", ...overrides };
  return Object.keys(getTableColumns(schema.customers)).map(key => value[key] ?? null);
}

test("customer-only access does not query lead, order or task histories", async () => {
  const h = harness({ grants: ["customer.read"], respond: sql => sql.includes('from "customers" where') ? [customerRow()] : [] });
  const result = await h.enterprise.getCustomer360(71, employee);
  assert(result);
  assert.equal(result.orders.length, 0);
  assert.equal(result.tasks.length, 0);
  assert(!h.calls.some(call => /from "(?:orders|tasks|customer_lead_links|order_status_history)"/.test(call.sql)));
  const referral = h.calls.find(call => call.sql.includes('"referred_customer"'));
  assert.match(referral.sql, /left join "leads" on .* and false/);
  assert.match(referral.sql, /"referred_customer"\."owner_employee_id" = \$/);
});

test("no customer grant returns no record and executes no customer query", async () => {
  const h = harness({ grants: ["order.create"] });
  assert.equal(await h.enterprise.getCustomer360(71, employee), null);
  assert.equal(h.calls.length, 0);
});

test("authorized customer histories retain lead creator and order advisor scopes", async () => {
  const h = harness({ grants: ["customer.read", "lead.edit", "order.read", "task.manage"], respond: sql => sql.includes('from "customers" where') ? [customerRow()] : [] });
  await h.enterprise.getCustomer360(71, employee);
  const leadQueries = h.calls.filter(call => call.sql.includes('from "customer_lead_links"'));
  assert.equal(leadQueries.length, 3);
  for (const query of leadQueries) {
    assert.match(query.sql, /"leads"\."created_by_employee_id" = \$/);
    assert(query.params.includes(employee.id));
  }
  const orderQueries = h.calls.filter(call => /from "(?:orders|order_status_history)"/.test(call.sql));
  assert.equal(orderQueries.length, 2);
  for (const query of orderQueries) assert.match(query.sql, /"orders"\."advisor_employee_id" = \$/);
});

test("duplicate identity update excludes its own customer and linked leads using SQL predicates", async () => {
  const h = harness();
  assert.equal(await h.identity.lockAndFindStrongContactDuplicate(h.db, { email: " SAME@EXAMPLE.TEST " }, employee, { excludeCustomerId: 71 }), null);
  const customer = h.calls.find(call => call.sql.includes('from "customers"'));
  assert.match(customer.sql, /"customers"\."id" <> \$/);
  assert(customer.params.includes(71));
  const lead = h.calls.find(call => call.sql.includes('from "leads"'));
  assert.match(lead.sql, /not exists[\s\S]*identity_link.customer_id = \$/);
  assert(lead.params.includes(71));
  assert(h.calls[0].params.includes("contact:email:same@example.test"));
});

test("conversion excludes the converting lead but still checks other contacts", async () => {
  const h = harness();
  await h.identity.lockAndFindStrongContactDuplicate(h.db, { email: "same@example.test" }, employee, { excludeLeadId: 81 });
  const lead = h.calls.find(call => call.sql.includes('from "leads"'));
  assert.match(lead.sql, /"leads"\."id" <> \$/);
  assert(lead.params.includes(81));
  assert(h.calls.some(call => call.sql.includes('from "customers"')));
});

test("owned duplicate without domain permission is redacted", async () => {
  for (const grants of [[], ["customer.edit"]]) {
    const h = harness({ grants, respond: sql => sql.includes('from "leads"') ? [[81, "Hidden owned lead", "hidden@example.test", null, 42, 42]] : [] });
    const duplicate = await h.identity.lockAndFindStrongContactDuplicate(h.db, { email: "hidden@example.test" }, employee);
    assert.equal(duplicate.visible, false);
    const error = h.identity.contactDuplicateError(duplicate);
    assert.equal(error.status, 409);
    assert.equal(error.duplicate, null);
    assert(!error.message.includes("Hidden owned lead"));
  }
});

test("lead grant and creator ownership allow an actionable duplicate link", async () => {
  const h = harness({ grants: ["lead.edit"], respond: sql => sql.includes('from "leads"') ? [[81, "Own lead", "own@example.test", null, 42, 99]] : [] });
  const duplicate = await h.identity.lockAndFindStrongContactDuplicate(h.db, { email: "own@example.test" }, employee);
  assert.equal(duplicate.visible, true);
  assert.equal(h.identity.contactDuplicateError(duplicate).duplicate.href, "/portal/leads/81");
});

test("order.create alone cannot initiate lead conversion or database writes", async () => {
  const h = harness({ grants: ["order.create"] });
  await assert.rejects(h.enterprise.createOrder({ leadId: 81, providerId: 1 }, employee), error => error.status === 403);
  assert.equal(h.calls.length, 0);
});

test("conversion checks creator scope before looking up existing links", async () => {
  const h = harness({ grants: ["order.create", "customer.edit", "lead.edit"] });
  await assert.rejects(h.enterprise.createOrder({ leadId: 81, providerId: 1 }, employee), error => error.status === 404);
  const select = h.calls.find(call => call.sql.startsWith("select"));
  assert.match(select.sql, /from "leads"[\s\S]*"created_by_employee_id" = \$[\s\S]*for update/);
  assert(!h.calls.some(call => call.sql.includes('from "customer_lead_links"')));
  assert.equal(h.calls.at(-1).sql, "rollback");
});

test("customer edit cannot clear the last identity field", async () => {
  const h = harness({ respond: sql => sql.includes('from "customers"') ? [customerRow()] : [] });
  await assert.rejects(h.enterprise.updateCustomer(71, { firstName: " ", lastName: "" }, employee), error => error.status === 422);
  assert(!h.calls.some(call => call.sql.startsWith("update")));
  assert.equal(h.calls.at(-1).sql, "rollback");
});

test("unchanged contact identity can be edited without conflicting with itself", async () => {
  const existing = customerRow({ email: "own@example.test" });
  const h = harness({ respond: sql => sql.includes('from "customers"') || sql.startsWith('update "customers"') ? [existing] : [] });
  const result = await h.enterprise.updateCustomer(71, { email: "own@example.test", city: "Wiesbaden" }, employee);
  assert.equal(result.id, 71);
  assert(h.calls.some(call => call.sql.startsWith('update "customers"')));
  assert(!h.calls.some(call => call.sql.includes("pg_advisory_xact_lock")));
  assert.equal(h.calls.at(-1).sql, "commit");
});

test("lead-only role cannot discover an owned customer through duplicate feedback", async () => {
  const h = harness({ grants: ["lead.edit"], respond: sql => sql.includes('from "customers"') ? [[71, "TEST-71", null, "Confidential", "Customer", 42]] : [] });
  const duplicate = await h.identity.lockAndFindStrongContactDuplicate(h.db, { email: "hidden@example.test" }, employee);
  assert.equal(duplicate.visible, false);
  const error = h.identity.contactDuplicateError(duplicate);
  assert.equal(error.duplicate, null);
  assert(!error.message.includes("Confidential"));
});

test("unassigned foreign leads do not disclose duplicate details", async () => {
  const h = harness({ grants: ["lead.edit"], respond: sql => sql.includes('from "leads"') ? [[81, "Foreign lead", "foreign@example.test", null, 99, 99]] : [] });
  const duplicate = await h.identity.lockAndFindStrongContactDuplicate(h.db, { email: "foreign@example.test" }, employee);
  assert.equal(duplicate.visible, false);
  assert.equal(h.identity.contactDuplicateError(duplicate).duplicate, null);
});

test("customer portfolio subqueries correlate to the outer customer ID", async () => {
  const h = harness({ grants: ["customer.read", "order.read"] });
  await h.enterprise.listCustomers(employee);
  const statement = h.calls.find(call => call.sql.includes('from "customers" where'));
  assert(statement);
  for (const alias of ["cr.source_customer_id", "cr.referred_customer_id", "o.customer_id", "co.customer_id", "ccp.customer_id"]) {
    assert(statement.sql.includes(alias + ' = "customers"."id"'), alias);
  }
});
