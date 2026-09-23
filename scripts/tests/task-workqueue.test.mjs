import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("task workqueue supports operational filters and Berlin-local due dates", () => {
  const enterprise = read("src/lib/enterprise.ts");
  const page = read("src/app/portal/(app)/aufgaben/page.tsx");

  assert.match(enterprise, /ilike\(tasks\.title/);
  assert.match(enterprise, /ilike\(tasks\.description/);
  assert.match(enterprise, /eq\(tasks\.priority, options\.priority\)/);
  assert.match(enterprise, /eq\(tasks\.assignedToEmployeeId, options\.assigneeId\)/);
  assert.match(enterprise, /eq\(tasks\.entityType, options\.entityType\)/);
  assert.match(enterprise, /date_trunc\('day', now\(\) at time zone 'Europe\/Berlin'\)/);
  assert.match(enterprise, /tasks\.status} in \('open','in_progress'\)/);
  assert.match(page, /Heute · Berlin/);
  assert.match(page, /Alle Mitarbeiter/);
  assert.match(page, /Titel oder Beschreibung suchen/);
});

test("task workqueue saved views retain the complete operational filter set", () => {
  const page = read("src/app/portal/(app)/aufgaben/page.tsx");
  const route = read("src/app/api/portal/views/route.ts");
  const bar = read("src/components/portal/SavedViewsBar.tsx");

  assert.match(page, /listSavedViews\(user, "tasks"\)/);
  assert.match(page, /area="tasks"/);
  assert.match(route, /area === "tasks"[\s\S]*new Set\(\["status", "priority", "due", "assignee", "entity", "q"\]\)/);
  assert.match(bar, /"leads" \| "orders" \| "customers" \| "tasks" \| "service"/);
});

test("task bulk reassignment is admin-only and audited", () => {
  const route = read("src/app/api/portal/enterprise/bulk/route.ts");
  const toolbar = read("src/components/portal/BulkToolbar.tsx");
  const list = read("src/components/portal/TaskBulkList.tsx");
  const access = read("src/lib/enterprise-access.ts");
  const createRoute = read("src/app/api/portal/tasks/route.ts");

  assert.match(route, /task: new Set\(\["status", "assign_employee"\]\)/);
  assert.match(route, /entity === "task" && action === "assign_employee" && user\.role !== "admin"/);
  assert.match(route, /"task\.bulk_assign_employee"/);
  assert.match(route, /getTaskAssignableEmployee\(employeeId\)/);
  assert.match(createRoute, /getTaskAssignableEmployee\(input\.assignedToEmployeeId\)/);
  assert.match(access, /p\.key = \$\{permissionKey\}/);
  assert.match(access, /listAssignableEmployees\(PORTAL_PERMISSION\.TASK_MANAGE\)/);
  assert.match(access, /getAssignableEmployee\(employeeId, PORTAL_PERMISSION\.TASK_MANAGE\)/);
  assert.match(access, /listTaskAssignableEmployees/);
  assert.match(access, /getTaskAssignableEmployee/);
  assert.match(toolbar, /entity === "lead" \|\| entity === "task" \|\| entity === "order"/);
  assert.match(toolbar, /entity === "lead" \? "Zuweisen" : "Neu zuweisen"/);
  assert.match(list, /assignees=\{assignees\}/);
});

test("task list highlights in-progress tasks as overdue when their due date has passed", () => {
  const enterprise = read("src/lib/enterprise.ts");
  assert.match(enterprise, /coalesce\(\$\{tasks\.status\} in \('open','in_progress'\)[\s\S]*\$\{tasks\.dueAt\} < now\(\), false\)/);
});

test("task list supports inline editing and deterministic Berlin-local appointments", () => {
  const actions = read("src/components/portal/TaskActions.tsx");
  const list = read("src/components/portal/TaskBulkList.tsx");
  const composer = read("src/components/portal/QuickTaskComposer.tsx");
  const dateTime = read("src/lib/portal-date-time.ts");

  assert.match(actions, /TASK_STATUS_OPTIONS/);
  assert.match(actions, /TASK_PRIORITY_OPTIONS/);
  assert.match(actions, /formatBerlinDateTimeInput/);
  assert.match(actions, /parseBerlinDateTimeInput/);
  assert.match(actions, /aria-label=\{\`\$\{title\} bearbeiten\`\}/);
  assert.match(list, /TaskActions[\s\S]*title=\{task\.title\}[\s\S]*priority=\{task\.priority\}[\s\S]*dueAt=\{task\.dueAt\}/);
  assert.match(composer, /parseBerlinDateTimeInput\(due\)/);
  assert.match(dateTime, /Europe\/Berlin/);
  assert.match(dateTime, /wegen der Zeitumstellung in Berlin nicht/);
  assert.match(dateTime, /zweimal vorkommt/);
});
