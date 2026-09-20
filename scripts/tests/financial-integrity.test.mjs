import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

test("provider reconciliation updates an existing open issue instead of duplicating it", () => {
  const source = read("src/app/api/portal/admin/operations/reconciliation/route.ts");
  assert.match(source, /const \[existingIssue\]/);
  assert.match(source, /eq\(reconciliationIssues\.status, "open"\)/);
  assert.match(source, /tx\.update\(reconciliationIssues\)\.set\(issueValues\)/);
});

test("provider reconciliation creates a missing sale event when a confirmed amount arrives", () => {
  const source = read("src/app/api/portal/admin/operations/reconciliation/route.ts");
  assert.match(source, /if \(saleEvent\)/);
  assert.match(source, /tx\.insert\(commissionEvents\)\.values/);
  assert.match(source, /status: "provider_confirmed"/);
});

test("accepting a reconciliation amount also repairs a missing sale event", () => {
  const source = read("src/app/api/portal/admin/operations/reconciliation/\[id\]/route.ts");
  assert.match(source, /tx\.insert\(commissionEvents\)\.values/);
  assert.match(source, /expectedAmount: issue\.expectedAmount \?\? order\.expectedCommission \?\? issue\.reportedAmount/);
});

test("updating a paid commission on a storno keeps the 15 percent growth pool neutral", () => {
  const source = read("src/app/api/portal/admin/operations/commission/\[id\]/paid/route.ts");
  assert.match(source, /\["cancelled", "storno"\]\.includes\(order\.status\)/);
  assert.match(source, /commission-chargeback:/);
  assert.match(source, /entryType: "spend"/);
  assert.match(source, /amount: String\(poolAmount\)/);
});

test("report periods do not overlap and current KPIs exclude future timestamps", () => {
  const source = read("src/lib/enterprise.ts");
  assert.match(source, /lt\(orders\.createdAt, from\)/);
  assert.match(source, /lt\(leads\.createdAt, from\)/);
  assert.match(source, /lte\(orders\.createdAt, now\)/);
  assert.match(source, /lte\(leads\.createdAt, now\)/);
});
