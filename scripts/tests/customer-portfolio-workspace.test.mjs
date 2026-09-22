import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("customer workspace supports personal saved portfolio views", () => {
  const page = read("src/app/portal/(app)/kunden/page.tsx");
  const route = read("src/app/api/portal/views/route.ts");
  const bar = read("src/components/portal/SavedViewsBar.tsx");

  assert.match(page, /listSavedViews\(user, "customers"\)/);
  assert.match(page, /area="customers"/);
  assert.match(page, /currentFilters=\{\{[\s\S]*focus[\s\S]*q:/);
  assert.match(route, /z\.enum\(\["leads", "orders", "customers", "tasks"\]\)/);
  assert.match(route, /area === "customers"[\s\S]*new Set\(\["focus", "q"\]\)/);
  assert.match(bar, /"leads" \| "orders" \| "customers" \| "tasks"/);
});

test("customer portfolio bulk mutations are permission-scoped and audited", () => {
  const route = read("src/app/api/portal/enterprise/bulk/route.ts");

  assert.match(route, /entity: z\.enum\(\["lead", "order", "task", "customer"\]\)/);
  assert.match(route, /entity === "customer"\) await requirePermission\(user, PORTAL_PERMISSION\.CUSTOMER_EDIT\)/);
  assert.match(route, /inArray\(customers\.id, ids\), customerAccess\(user\)/);
  assert.match(route, /\.for\("update"\)/);
  assert.match(route, /Maximal 100 Kunden pro Bulk-Aktion/);
  assert.match(route, /const ids = \[\.\.\.new Set\(parsed\.data\.ids\)\]/);
  assert.match(route, /validActions\[entity\]\.has\(action\)/);
  assert.match(route, /onConflictDoUpdate\(\{[\s\S]*target: customerCrmProfiles\.customerId/);
  assert.match(route, /"customer\.bulk_profile"/);
});

test("customer bulk UI keeps selection page-local and limits actions to CRM steering fields", () => {
  const component = read("src/components/portal/CustomerBulkList.tsx");

  assert.match(component, /Alle Kunden auf dieser Seite auswählen/);
  assert.match(component, /customer_lifecycle/);
  assert.match(component, /customer_relationship/);
  assert.match(component, /customer_risk/);
  assert.match(component, /customer_review/);
  assert.match(component, /entity: "customer"/);
  assert.match(component, /Änderungen gelten nur für die ausgewählten Kunden dieser Seite/);
  assert.doesNotMatch(component, /customer_(?:email|phone|name)/);
});

test("canonical customer access condition is reusable by mutation routes", () => {
  const enterprise = read("src/lib/enterprise.ts");
  assert.match(enterprise, /export function customerAccess\(user: SessionUser\)/);
  assert.match(enterprise, /user\.role === "admin" \? sql`true` : eq\(customers\.ownerEmployeeId, user\.id\)/);
});
