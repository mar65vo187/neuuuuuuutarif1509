import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("order workqueue exposes provider, advisor and operational focus filters", () => {
  const enterprise = read("src/lib/enterprise.ts");
  const page = read("src/app/portal/(app)/auftraege/page.tsx");

  assert.match(enterprise, /providerId\?: number/);
  assert.match(enterprise, /advisorEmployeeId\?: number/);
  assert.match(enterprise, /focus\?: "attention" \| "provider_warning" \| "documents" \| "activation" \| "unassigned"/);
  assert.match(enterprise, /eq\(orders\.providerId, filter\.providerId\)/);
  assert.match(enterprise, /eq\(orders\.advisorEmployeeId, filter\.advisorEmployeeId\)/);
  assert.match(enterprise, /orders\.updatedAt} < now\(\) - interval '7 days'/);
  assert.match(enterprise, /orders\.externalOrderId} is null/);
  assert.match(enterprise, /orders\.providerStatus} is null/);
  assert.match(page, /Auftragssteuerung · Operations/);
  assert.match(page, /name="provider"/);
  assert.match(page, /name="advisor"/);
  assert.match(page, /Provider prüfen/);
  assert.match(page, /Unzugewiesen/);
});

test("order workqueue search includes provider and product names and surfaces SLA badges", () => {
  const enterprise = read("src/lib/enterprise.ts");
  const list = read("src/components/portal/OrderBulkList.tsx");

  assert.match(enterprise, /ilike\(providers\.name/);
  assert.match(enterprise, /ilike\(products\.name/);
  assert.match(enterprise, /operationalAttention:/);
  assert.match(enterprise, /providerWarning:/);
  assert.match(list, /SLA prüfen/);
  assert.match(list, /Provider prüfen/);
});

test("order saved views retain the complete operations filter set", () => {
  const page = read("src/app/portal/(app)/auftraege/page.tsx");
  const route = read("src/app/api/portal/views/route.ts");

  assert.match(page, /listSavedViews\(user, "orders"\)/);
  assert.match(page, /currentFilters=\{savedFilters\}/);
  assert.match(page, /provider: providerId \? String\(providerId\) : undefined/);
  assert.match(page, /advisor: advisorEmployeeId \? String\(advisorEmployeeId\) : undefined/);
  assert.match(route, /new Set\(\["status", "provider", "advisor", "focus", "q"\]\)/);
});

test("order filters survive pagination and focus navigation", () => {
  const page = read("src/app/portal/(app)/auftraege/page.tsx");

  assert.match(page, /const merged = \{ \.\.\.current, \.\.\.changes \}/);
  assert.match(page, /href\(\{ page: String\(page - 1\) \}\)/);
  assert.match(page, /href\(\{ page: String\(page \+ 1\) \}\)/);
  assert.match(page, /href=\{href\(\{ focus: value, page: undefined \}\)\}/);
});

test("order reassignment is admin-only, permission-aware and auditable", () => {
  const route = read("src/app/api/portal/enterprise/bulk/route.ts");
  const access = read("src/lib/enterprise-access.ts");
  const list = read("src/components/portal/OrderBulkList.tsx");
  const toolbar = read("src/components/portal/BulkToolbar.tsx");

  assert.match(route, /order: new Set\(\["status", "assign_employee"\]\)/);
  assert.match(route, /entity === "order" && action === "assign_employee" && user\.role !== "admin"/);
  assert.match(route, /getOrderAssignableEmployee\(employeeId\)/);
  assert.match(route, /"order\.bulk_assign_employee"/);
  assert.match(route, /financialOwnershipChanged: false/);
  assert.match(access, /listAssignableEmployees\(PORTAL_PERMISSION\.ORDER_EDIT\)/);
  assert.match(access, /getAssignableEmployee\(employeeId, PORTAL_PERMISSION\.ORDER_EDIT\)/);
  assert.match(list, /assignees=\{assignees\}/);
  assert.match(toolbar, /entity === "lead" \|\| entity === "task" \|\| entity === "order"/);
});

test("order reassignment transfers only active operational tasks, not finance history", () => {
  const route = read("src/app/api/portal/enterprise/bulk/route.ts");

  assert.match(route, /advisorEmployeeId: target\.id/);
  assert.match(route, /assignedToEmployeeId: target\.id/);
  assert.match(route, /eq\(tasks\.entityType, "order"\)/);
  assert.match(route, /inArray\(tasks\.status, \["open", "in_progress"\]\)/);
  assert.doesNotMatch(route, /update\(commissionEvents\).*assign_employee/s);
  assert.doesNotMatch(route, /employeeId: target\.id[\s\S]*commission/s);
});

test("provider selector is permission-scoped through orderAccess", () => {
  const enterprise = read("src/lib/enterprise.ts");

  const start = enterprise.indexOf("export async function listOrderWorkqueueProviders");
  const end = enterprise.indexOf("export async function getOrder", start);
  const helper = enterprise.slice(start, end);
  assert.match(helper, /from\(orders\)/);
  assert.match(helper, /where\(orderAccess\(user\)\)/);
  assert.match(helper, /orderBy\(providers\.name\)/);
});
