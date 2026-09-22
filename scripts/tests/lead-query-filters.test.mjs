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

function loadModule(path, overrides = {}, cache = new Map()) {
  if (cache.has(path)) return cache.get(path);
  const loaded = { exports: {} };
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  cache.set(path, loaded.exports);
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, { Date, Math, Number, Buffer })(name => {
    if (name in overrides) return overrides[name];
    if (name.startsWith("@/")) return loadModule(resolve(root, "src", `${name.slice(2)}.ts`), overrides, cache);
    if (name.startsWith(".")) return loadModule(resolve(dirname(path), `${name}.ts`), overrides, cache);
    return require(name);
  }, loaded, loaded.exports);
  return loaded.exports;
}

const { getLeadPageBounds, leadSearchPattern, normalizeLeadProductFilter } = loadModule(resolve(root, "src/lib/lead-query-filters.ts"));
const employee = { id: 42, role: "berater" };

/** Use the actual Drizzle compiler/driver, replacing only the PostgreSQL transport. */
function harness({ total = 351, authUser = employee } = {}) {
  const calls = [];
  let authCalls = 0;
  const database = drizzle({
    async query(config, params = []) {
      const sql = typeof config === "string" ? config : config.text;
      calls.push({ sql, params });
      return { rows: /^select count\(\*\)::int from "leads"/.test(sql) ? [[total]] : [] };
    },
  });
  const queries = loadModule(resolve(root, "src/lib/queries.ts"), {
    "@/db": { db: database },
    "@/lib/content": { SITE: { email: "test@example.test" } },
    "@/lib/auth": { async requireUser() { authCalls++; return authUser; } },
  });
  return { queries, calls, get authCalls() { return authCalls; } };
}

test("pagination reaches records beyond the old 300-lead boundary and clamps stale pages", async () => {
  const h = harness();
  const page = await h.queries.listLeadsPage({ page: 999 }, employee);
  assert.equal(page.total, 351);
  assert.equal(page.page, 15);
  assert.equal(page.pageSize, 25);
  assert.equal(page.totalPages, 15);
  const rows = h.calls.find(call => call.sql.includes("left join"));
  assert.deepEqual(rows.params.slice(-2), [25, 350]);
  assert.match(h.calls[0].sql, /begin isolation level repeatable read read only/);
  assert.equal(h.calls.at(-1).sql, "commit");
});

test("empty results return page 1 without an unnecessary joined row query", async () => {
  const h = harness({ total: 0 });
  const page = await h.queries.listLeadsPage({ page: 50 }, employee);
  assert.equal(page.total, 0);
  assert.equal(page.page, 1);
  assert.equal(page.totalPages, 1);
  assert.equal(page.rows.length, 0);
  assert.equal(h.calls.filter(call => call.sql.startsWith("select")).length, 1);
});

test("pagination rejects malformed limits and never emits negative or infinite offsets", () => {
  for (const invalid of [undefined, NaN, Infinity, -1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const result = getLeadPageBounds(351, invalid, invalid);
    assert.equal(result.page, 1);
    assert.equal(result.pageSize, 25);
    assert.equal(result.offset, 0);
  }
  const maximum = getLeadPageBounds(351, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
  assert.equal(maximum.page, 4);
  assert.equal(maximum.pageSize, 100);
  assert.equal(maximum.offset, 300);
});

test("employee count and page use identical creator-or-assignee scope and filters", async () => {
  const h = harness();
  await h.queries.listLeadsPage({ status: "neu", priority: "high", productId: 17, productRelation: "interest", q: "Müller" }, employee);
  const selects = h.calls.filter(call => call.sql.startsWith("select"));
  const countWhere = selects[0].sql.split('from "leads" where ')[1];
  const rowWhere = selects[1].sql.split('"employees"."id" where ')[1].split(" order by ")[0];
  assert.equal(rowWhere, countWhere);
  assert.match(countWhere, /"leads"\."created_by_employee_id" = \$1/);
  assert.doesNotMatch(countWhere, /assigned_employee_id/);
  assert.deepEqual(selects[0].params, [42, "neu", "high", 17, "interest", ...Array(5).fill("%Müller%")]);
  assert.deepEqual(selects[1].params.slice(0, -1), selects[0].params);
});

test("only admins have unrestricted visibility and omitted users are authenticated", async () => {
  const admin = harness();
  await admin.queries.listLeadsPage(undefined, { id: 7, role: "admin" });
  const adminCount = admin.calls.find(call => call.sql.startsWith("select"));
  assert.match(adminCount.sql, /where true$/);
  assert.equal(admin.authCalls, 0);

  const authenticated = harness();
  await authenticated.queries.listLeadsPage();
  assert.equal(authenticated.authCalls, 1);
  assert.deepEqual(authenticated.calls.find(call => call.sql.startsWith("select")).params, [42, 42]);
});

test("all sorting modes use a stable lead ID tiebreaker", async () => {
  for (const [sort, expected] of [
    ["newest", /order by "leads"\."created_at" desc, "leads"\."id" desc limit/],
    ["oldest", /order by "leads"\."created_at" asc, "leads"\."id" asc limit/],
    ["next", /order by "leads"\."next_action_at" asc nulls last, "leads"\."updated_at" desc, "leads"\."id" desc limit/],
  ]) {
    const h = harness();
    await h.queries.listLeadsPage({ sort }, employee);
    assert.match(h.calls.find(call => call.sql.includes("left join")).sql, expected);
  }
});

test("search wildcards and quotes remain literal bound search values", async () => {
  assert.equal(leadSearchPattern("  20%_\\  "), "%20\\%\\_\\\\%");
  assert.equal(leadSearchPattern(" "), undefined);
  assert.equal(leadSearchPattern("x".repeat(140)), `%${"x".repeat(120)}%`);
  const h = harness();
  const malicious = "%' OR 1=1 --_\\";
  await h.queries.listLeadsPage({ q: malicious }, employee);
  const count = h.calls.find(call => call.sql.startsWith("select"));
  assert.doesNotMatch(count.sql, /OR 1=1/);
  assert.deepEqual(count.params, [42, 42, ...Array(5).fill(leadSearchPattern(malicious))]);
});

test("without product profile ignores a conflicting product select and agrees with the open-lead KPI", async () => {
  const normalized = normalizeLeadProductFilter(17, "none");
  assert.equal(normalized.productId, undefined);
  assert.equal(normalized.productRelation, "none");
  const h = harness();
  await h.queries.listLeadsPage({ productId: 17, productRelation: "none", priority: "attention" }, employee);
  const count = h.calls.find(call => call.sql.startsWith("select"));
  assert.match(count.sql, /not exists \(select 1 from lead_product_links/);
  assert.match(count.sql, /in \('high','hot'\) and "leads"\."status" not in \('abgeschlossen','verloren'\)/);
  assert.match(count.sql, /lpl\.lead_id = "leads"\."id"\) and "leads"\."status" not in \('abgeschlossen','verloren'\)/);
  assert.deepEqual(count.params, [42, 42]);
});

test("assignee filter narrows the already permission-scoped lead set", async () => {
  const h = harness();
  await h.queries.listLeadsPage({ assignedEmployeeId: 17 }, employee);
  const count = h.calls.find(call => call.sql.startsWith("select"));
  assert.match(count.sql, /"leads"\."created_by_employee_id" = \$1/);
  assert.match(count.sql, /"leads"\."assigned_employee_id" = \$2/);
  assert.match(count.sql, /"leads"\."assigned_employee_id" = \$3/);
  assert.deepEqual(count.params, [42, 42, 17]);
});

test("invalid product relations and IDs do not become SQL filters", () => {
  assert.equal(normalizeLeadProductFilter(-5, "unknown").productId, undefined);
  assert.equal(normalizeLeadProductFilter(1.5, "existing").productId, undefined);
  assert.equal(normalizeLeadProductFilter(5, "unknown").productRelation, undefined);
  assert.equal(normalizeLeadProductFilter(5, "sold").productId, 5);
});

test("today list and overview use Berlin local midnights before timezone conversion", async () => {
  const h = harness();
  await h.queries.listLeadsPage({ next: "today" }, employee);
  await h.queries.getLeadCrmOverview(employee);
  const selects = h.calls.filter(call => call.sql.startsWith("select"));
  for (const statement of selects) {
    assert.match(statement.sql, />= \(date_trunc\('day', now\(\) at time zone 'Europe\/Berlin'\) at time zone 'Europe\/Berlin'\)/);
    assert.match(statement.sql, /< \(\(date_trunc\('day', now\(\) at time zone 'Europe\/Berlin'\) \+ interval '1 day'\) at time zone 'Europe\/Berlin'\)/);
    assert.doesNotMatch(statement.sql, /date_trunc\('day', now\(\)\)/);
  }
});
