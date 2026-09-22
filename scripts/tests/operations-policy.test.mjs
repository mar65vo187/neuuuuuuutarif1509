import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("operations policy is a constrained singleton with safe defaults", () => {
  const migration = read("migrations/0018_operations_policy.sql");
  const schema = read("src/db/enterprise-schema.ts");
  const verify = read("scripts/verify-migrations.mjs");

  assert.match(migration, /CREATE TABLE IF NOT EXISTS operations_policy/);
  assert.match(migration, /CHECK \(policy_key = 'default'\)/);
  assert.match(migration, /lead_next_action_high_hours >= lead_next_action_missing_hours/);
  assert.match(migration, /provider_reference_missing_hours BETWEEN 1 AND 720/);
  assert.match(migration, /activation_stale_days BETWEEN 1 AND 90/);
  assert.match(migration, /ON CONFLICT \(policy_key\) DO NOTHING/);
  assert.match(schema, /export const operationsPolicy = pgTable\("operations_policy"/);
  assert.match(verify, /"operations_policy"/);
});

test("operations policy updates are admin-only, validated and audited", () => {
  const route = read("src/app/api/portal/admin/enterprise/operations-policy/route.ts");
  const validation = read("src/lib/enterprise-validation.ts");
  const page = read("src/app/portal/(app)/system/page.tsx");
  const manager = read("src/components/portal/OperationsPolicyManager.tsx");

  assert.match(route, /authorizeAdmin\(request\)/);
  assert.match(route, /operationsPolicyUpdateSchema\.safeParse/);
  assert.match(route, /for\("update"\)/);
  assert.match(route, /"operations_policy\.updated"/);
  assert.match(route, /writeAudit/);
  assert.match(validation, /leadNextActionHighHours < value\.leadNextActionMissingHours/);
  assert.match(page, /getOperationsPolicy\(\)/);
  assert.match(page, /<OperationsPolicyManager policy=\{operationsPolicy\}/);
  assert.match(manager, /SLA- & Eskalationsgrenzen/);
  assert.match(manager, /auditierbar/);
});

test("order queue, command center and reporting share the same operations policy", () => {
  const enterprise = read("src/lib/enterprise.ts");
  const commandCenter = read("src/lib/portal-command-center.ts");
  const reporting = read("src/app/portal/(app)/reporting/page.tsx");

  const listStart = enterprise.indexOf("export async function listOrders");
  const listEnd = enterprise.indexOf("export async function listOrderWorkqueueProviders", listStart);
  const listOrders = enterprise.slice(listStart, listEnd);
  assert.match(listOrders, /getOperationsPolicy\(\)/);
  assert.match(listOrders, /operationsPolicyCutoffs\(operationsPolicy\)/);
  assert.match(listOrders, /policyCutoffs\.providerReferenceMissingAt/);
  assert.match(listOrders, /policyCutoffs\.providerStatusMissingAt/);
  assert.match(listOrders, /policyCutoffs\.activationStaleAt/);
  assert.match(listOrders, /policyCutoffs\.documentsStaleAt/);
  assert.doesNotMatch(listOrders, /interval '7 days'|interval '2 days'|interval '1 day'/);

  assert.match(commandCenter, /getOperationsPolicy\(\)/);
  assert.match(commandCenter, /operationsPolicyCutoffs\(operationsPolicy, now\)/);
  assert.match(commandCenter, /untouchedLeadsSla/);
  assert.doesNotMatch(commandCenter, /untouchedLeads24h/);

  assert.match(enterprise, /staleLeadsSla/);
  assert.match(reporting, /report\.operationsPolicy\.leadNextActionHighHours/);
  assert.doesNotMatch(reporting, /Leads >72h offen/);
});

test("scheduled operations sweep is parameterized by the persisted policy and records it in audit", () => {
  const sweep = read("src/lib/operations-sweep.ts");

  assert.match(sweep, /const operationsPolicy = await getOperationsPolicy\(\)/);
  assert.match(sweep, /operationsPolicy\.leadNextActionMissingHours/);
  assert.match(sweep, /operationsPolicy\.customerReviewHighDays/);
  assert.match(sweep, /operationsPolicy\.opportunityReviewHighDays/);
  assert.match(sweep, /operationsPolicy\.documentsStaleHours/);
  assert.match(sweep, /operationsPolicy\.orderStaleDays/);
  assert.match(sweep, /\$1::int \* interval '1 hour'/);
  assert.match(sweep, /\$1::int \* interval '1 day'/);
  assert.match(sweep, /operationsPolicy:/);
  assert.doesNotMatch(sweep, /interval '72 hours'|interval '24 hours'|interval '14 days'|interval '7 days'/);
});

test("shared policy definitions stay client-safe and server DB access stays isolated", () => {
  const shared = read("src/lib/operations-policy-shared.ts");
  const server = read("src/lib/operations-policy.ts");
  const manager = read("src/components/portal/OperationsPolicyManager.tsx");

  assert.doesNotMatch(shared, /@\/db|drizzle-orm|pg/);
  assert.match(server, /from "@\/db"/);
  assert.match(manager, /from "@\/lib\/operations-policy-shared"/);
  assert.doesNotMatch(manager, /from "@\/lib\/operations-policy"/);
});
