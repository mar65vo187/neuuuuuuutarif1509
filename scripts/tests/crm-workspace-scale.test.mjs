import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("customer, order and task queries use gap-free bounded pagination", () => {
  const enterprise = read("../../src/lib/enterprise.ts");
  assert.match(enterprise, /filter\?: \{ focus\?: "review" \| "opportunity" \| "risk"; page\?: number; lookahead\?: boolean \}/);
  assert.match(enterprise, /filter\?: \{ status\?: string; search\?: string; page\?: number; lookahead\?: boolean \}/);
  assert.match(enterprise, /options\?: \{ page\?: number; pageSize\?: number; lookahead\?: boolean \}/);
  assert.match(enterprise, /const offset = \(page - 1\) \* pageSize/g);
  const offsetMatches = enterprise.match(/const offset = \(page - 1\) \* pageSize/g) ?? [];
  assert.ok(offsetMatches.length >= 3);
  assert.match(enterprise, /\.limit\(queryLimit\)\.offset\(offset\)/);
});

test("customer workspace paginates while preserving search and focus", () => {
  const page = read("../../src/app/portal/(app)/kunden/page.tsx");
  assert.match(page, /pageSize = 50/);
  assert.match(page, /listCustomers\(user, q, pageSize, \{ focus, page, lookahead: true \}\)/);
  assert.match(page, /params\.set\("q", q\.trim\(\)\)/);
  assert.match(page, /params\.set\("focus", focus\)/);
  assert.match(page, /aria-label="Kunden-Seiten"/);
});

test("order workspace paginates while preserving search and status", () => {
  const page = read("../../src/app/portal/(app)/auftraege/page.tsx");
  assert.match(page, /pageSize = 50/);
  assert.match(page, /listOrders\(user, \{ status: validStatus, search: q, page, lookahead: true \}, pageSize\)/);
  assert.match(page, /params\.set\("status", validStatus\)/);
  assert.match(page, /aria-label="Auftrags-Seiten"/);
});

test("task workspace paginates without losing selected status", () => {
  const page = read("../../src/app/portal/(app)/aufgaben/page.tsx");
  assert.match(page, /pageSize = 50/);
  assert.match(page, /listTasks\(user, selected, \{ page, pageSize, lookahead: true \}\)/);
  assert.match(page, /encodeURIComponent\(selected\)/);
  assert.match(page, /aria-label="Aufgaben-Seiten"/);
});
