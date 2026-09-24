import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("lead visibility stays private except for explicit assignment", () => {
  const queries = read("src/lib/queries.ts");

  assert.match(queries, /Admins see all leads; employees see leads they created or were explicitly assigned/);
  assert.match(queries, /eq\(leads\.createdByEmployeeId, user\.id\)/);
  assert.match(queries, /eq\(leads\.assignedEmployeeId, user\.id\)/);
  assert.match(queries, /const conditions = \[leadAccessCondition\(user\)\]/);
  assert.match(queries, /eq\(leads\.assignedEmployeeId, filter\.assignedEmployeeId\)/);
});

test("lead assignee selection only exposes employees who can actually edit leads", () => {
  const access = read("src/lib/enterprise-access.ts");
  const page = read("src/app/portal/(app)/leads/page.tsx");
  const bulk = read("src/app/api/portal/enterprise/bulk/route.ts");

  assert.match(access, /assignableForPermissionCondition\(permissionKey: PortalPermission\)/);
  assert.match(access, /leadAssignableEmployeeCondition/);
  assert.match(access, /listAssignableEmployees\(PORTAL_PERMISSION\.LEAD_EDIT\)/);
  assert.match(access, /getAssignableEmployee\(employeeId, PORTAL_PERMISSION\.LEAD_EDIT\)/);
  assert.match(page, /listLeadAssignableEmployees\(\)/);
  assert.match(page, /assignedEmployeeId: assigneeId/);
  assert.match(page, /name="assignee"/);
  assert.match(bulk, /getLeadAssignableEmployee\(employeeId\)/);
  assert.match(bulk, /keinen Zugriff auf Leads/);
});

test("automatic lead routing never selects employees who cannot edit leads", () => {
  const enterprise = read("src/lib/enterprise.ts");

  const start = enterprise.indexOf("export async function routeNewLead");
  const end = enterprise.indexOf("export async function ensureCustomerForLead", start);
  const routing = enterprise.slice(start, end);
  assert.match(routing, /leadAssignableEmployeeCondition\(\)/);
  assert.match(routing, /eq\(employees\.active, true\)/);
  assert.match(routing, /eq\(employees\.role, "berater"\)/);
});

test("lead-to-customer conversion enforces the canonical creator-or-assignee scope first", () => {
  const enterprise = read("src/lib/enterprise.ts");
  const start = enterprise.indexOf("async function ensureCustomerForLeadInTransaction");
  const end = enterprise.indexOf("export async function createCustomer", start);
  const conversion = enterprise.slice(start, end);

  assert.match(conversion, /where\(and\(eq\(leads\.id, leadId\), leadAccessCondition\(user\)\)\)/);
  assert.match(conversion, /Lead nicht gefunden oder keine Berechtigung/);
  assert.match(conversion, /lead\.assignedEmployeeId \?\? lead\.createdByEmployeeId \?\? user\.id/);
  assert.ok(conversion.indexOf("leadAccessCondition(user)") < conversion.indexOf("customerLeadLinks"));
});

test("lead saved views and pipeline preserve the ownership filter", () => {
  const list = read("src/app/portal/(app)/leads/page.tsx");
  const pipeline = read("src/app/portal/(app)/leads/pipeline/page.tsx");
  const views = read("src/app/api/portal/views/route.ts");

  assert.match(views, /new Set\(\["status", "type", "priority", "next", "product", "relation", "assignee", "q", "sort"\]\)/);
  assert.match(list, /assignee: assigneeId \? String\(assigneeId\) : undefined/);
  assert.match(list, /pipelineQuery/);
  assert.match(pipeline, /PORTAL_PERMISSION\.LEAD_ASSIGN/);
  assert.match(pipeline, /assignedEmployeeId: assigneeId/);
  assert.match(pipeline, /name="assignee"/);
});

test("ownership changes transfer open lead follow-ups to the new responsible employee", () => {
  const mutation = read("src/lib/lead-mutation.ts");
  const single = read("src/app/api/portal/leads/[id]/route.ts");
  const calls = read("src/app/api/portal/leads/[id]/calls/route.ts");
  const bulk = read("src/app/api/portal/enterprise/bulk/route.ts");

  assert.match(mutation, /export async function reassignLeadFollowUps/);
  assert.match(mutation, /assignedToEmployeeId: ownerId/);
  assert.match(single, /reassignLeadFollowUps\(tx, \[id\], taskOwner, now\)/);
  assert.match(single, /patch\.assignedEmployeeId \?\? existing\.assignedEmployeeId \?\? existing\.createdByEmployeeId/);
  assert.match(calls, /lead\.assignedEmployeeId \?\? lead\.createdByEmployeeId \?\? user\.id/);
  assert.match(bulk, /reassignLeadFollowUps\(tx, changedIds, target\.id, now\)/);
  assert.match(bulk, /reassignLeadFollowUps\(tx, changedIds, user\.id, now\)/);
});

test("duplicate contact visibility follows the same creator-or-assignee rule", () => {
  const identity = read("src/lib/contact-identity.ts");

  assert.match(identity, /lead\.assignedEmployeeId \?\? lead\.createdByEmployeeId/);
  assert.match(identity, /lead\.createdByEmployeeId === user\.id \|\| lead\.assignedEmployeeId === user\.id/);
});

test("admin team load links drill into scoped lead and task workqueues", () => {
  const dashboard = read("src/app/portal/(app)/page.tsx");
  const command = read("src/lib/portal-command-center.ts");

  assert.match(dashboard, /\/portal\/leads\?assignee=\$\{row\.employeeId\}/);
  assert.match(dashboard, /\/portal\/aufgaben\?status=open&assignee=\$\{row\.employeeId\}/);
  assert.match(dashboard, /\/portal\/aufgaben\?status=all&due=overdue&assignee=\$\{row\.employeeId\}/);
  assert.match(command, /taskAssignees = await listTaskAssignableEmployees\(\)/);
});
