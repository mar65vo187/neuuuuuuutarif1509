import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("service cases have constrained schema, indexed workqueues and dedicated permissions", () => {
  const migration = read("migrations/0020_service_case_management.sql");
  const schema = read("src/db/enterprise-schema.ts");
  const access = read("src/lib/enterprise-access.ts");

  assert.match(migration, /CREATE TABLE IF NOT EXISTS service_cases/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS service_case_events/);
  assert.match(migration, /service_cases_owner_status_due_idx/);
  assert.match(migration, /service_cases_status_check/);
  assert.match(migration, /service_cases_priority_check/);
  assert.match(migration, /service_critical_hours/);
  assert.match(migration, /service_high_hours/);
  assert.match(migration, /service_normal_hours/);
  assert.match(migration, /service_low_hours/);
  assert.match(migration, /'service\.read'/);
  assert.match(migration, /'service\.edit'/);
  assert.match(migration, /'service\.assign'/);

  assert.match(schema, /export const serviceCases = pgTable\("service_cases"/);
  assert.match(schema, /export const serviceCaseEvents = pgTable\("service_case_events"/);
  assert.match(access, /SERVICE_READ: "service\.read"/);
  assert.match(access, /SERVICE_EDIT: "service\.edit"/);
  assert.match(access, /SERVICE_ASSIGN: "service\.assign"/);
  assert.match(access, /listServiceAssignableEmployees/);
  assert.match(access, /getServiceAssignableEmployee/);
});

test("service case mutations are same-origin, permissioned, scoped and audited", () => {
  const createRoute = read("src/app/api/portal/service-cases/route.ts");
  const updateRoute = read("src/app/api/portal/service-cases/[id]/route.ts");
  const service = read("src/lib/service-cases.ts");

  assert.match(createRoute, /isSameOriginRequest/);
  assert.match(createRoute, /PORTAL_PERMISSION\.SERVICE_EDIT/);
  assert.match(createRoute, /PORTAL_PERMISSION\.SERVICE_ASSIGN/);
  assert.match(updateRoute, /isSameOriginRequest/);
  assert.match(updateRoute, /PORTAL_PERMISSION\.SERVICE_EDIT/);
  assert.match(service, /eq\(customers\.ownerEmployeeId, user\.id\)/);
  assert.match(service, /serviceCaseReadAccess/);
  assert.match(service, /eq\(serviceCases\.ownerEmployeeId, user\.id\)/);
  assert.match(service, /eq\(customers\.ownerEmployeeId, user\.id\)/);
  assert.match(service, /serviceCaseEditAccess/);
  assert.match(service, /getServiceAssignableEmployee/);
  assert.match(service, /"service_case\.created"/);
  assert.match(service, /"service_case\.updated"/);
  assert.match(service, /writeAudit/);
});

test("service workflow creates one linked task and keeps external side effects human-controlled", () => {
  const service = read("src/lib/service-cases.ts");
  const page = read("src/app/portal/(app)/service/[id]/page.tsx");

  assert.match(service, /entityType: "service_case"/);
  assert.match(service, /type: "service_case"/);
  assert.match(service, /status: "open"/);
  assert.match(service, /actionUrl: `\/portal\/service\/\$\{created\.id\}`/);
  assert.match(service, /Für gelöste oder geschlossene Fälle muss eine Lösung dokumentiert werden/);
  assert.match(service, /eq\(tasks\.entityType, "service_case"\)/);
  assert.match(page, /canEditThisCase/);
  assert.match(page, /item\.ownerEmployeeId === user\.id/);
  assert.match(page, /verändern keine Provision, keinen Vertragsstatus und versenden keine externe Nachricht automatisch/);
  assert.doesNotMatch(service, /sendEmail|sendWhatsapp|sendSMS|provider.*update|contract.*update/i);
});

test("service SLA is centralized, configurable and escalates once per current due date", () => {
  const shared = read("src/lib/operations-policy-shared.ts");
  const validation = read("src/lib/enterprise-validation.ts");
  const sweep = read("src/lib/operations-sweep.ts");

  assert.match(shared, /serviceCaseDueAt/);
  assert.match(shared, /serviceCriticalHours/);
  assert.match(shared, /serviceHighHours/);
  assert.match(shared, /serviceNormalHours/);
  assert.match(shared, /serviceLowHours/);
  assert.match(validation, /serviceCriticalHours <= value\.serviceHighHours/);
  assert.match(sweep, /Service-SLA überschritten/);
  assert.match(sweep, /metadata->>'reason' = 'sla_overdue'/);
  assert.match(sweep, /nq\.created_at >= sc\.due_at/);
  assert.match(sweep, /serviceEscalations/);
});

test("service cases are integrated into customer 360, tasks, inbox, search and command center", () => {
  const enterprise = read("src/lib/enterprise.ts");
  const customer = read("src/app/portal/(app)/kunden/[id]/page.tsx");
  const tasks = read("src/app/portal/(app)/aufgaben/page.tsx");
  const inbox = read("src/app/portal/(app)/inbox/page.tsx");
  const search = read("src/app/api/portal/search/route.ts");
  const command = read("src/lib/portal-command-center.ts");

  assert.match(enterprise, /serviceCases: customerServiceCases/);
  assert.match(enterprise, /kind: "service_case"/);
  assert.match(enterprise, /kind: "service_event"/);
  assert.match(customer, /Aktive Servicefälle/);
  assert.match(tasks, /option value="service_case"/);
  assert.match(inbox, /row\.entityType === "service_case"/);
  assert.match(search, /kind: "service_case" as const/);
  assert.match(command, /task\.entityType === "service_case" && canService/);
});

test("service saved views retain only the supported operational filters", () => {
  const page = read("src/app/portal/(app)/service/page.tsx");
  const route = read("src/app/api/portal/views/route.ts");
  const bar = read("src/components/portal/SavedViewsBar.tsx");

  assert.match(page, /listSavedViews\(user, "service"\)/);
  assert.match(page, /area="service"/);
  assert.match(route, /area === "service"[\s\S]*new Set\(\["status", "priority", "type", "focus", "owner", "q"\]\)/);
  assert.match(bar, /"service"/);
});
