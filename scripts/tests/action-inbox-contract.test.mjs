import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("action inbox persists enterprise notification workflow fields", () => {
  const migration = read("migrations/0019_action_inbox.sql");
  const schema = read("src/db/enterprise-schema.ts");

  for (const field of ["category", "priority", "entity_type", "entity_id", "action_url", "read_at", "snoozed_until", "archived_at"]) {
    assert.match(migration, new RegExp(field));
  }
  assert.match(schema, /notification_employee_inbox_idx/);
  assert.match(schema, /notification_employee_snooze_idx/);
  assert.match(schema, /actionUrl: text\("action_url"\)/);
  assert.match(schema, /metadata: jsonb\("metadata"\)/);
});

test("action inbox reads only the signed-in employee and hides snoozed alerts from unread count", () => {
  const productivity = read("src/lib/portal-productivity.ts");

  assert.match(productivity, /eq\(notificationQueue\.employeeId, user\.id\)/);
  assert.match(productivity, /eq\(notificationQueue\.channel, "in_app"\)/);
  assert.match(productivity, /isNull\(notificationQueue\.archivedAt\)/);
  assert.match(productivity, /notificationQueue\.snoozedUntil/);
  assert.match(productivity, /NotificationInboxView/);
  assert.match(productivity, /pageSize/);
});

test("notification mutations are ownership-scoped, same-origin and audited", () => {
  const route = read("src/app/api/portal/notifications/route.ts");

  assert.match(route, /isSameOriginRequest/);
  assert.match(route, /eq\(notificationQueue\.employeeId, user\.id\)/);
  assert.match(route, /inArray\(notificationQueue\.id, parsed\.data\.ids\)/);
  for (const action of ["mark_read", "mark_unread", "archive", "restore", "snooze", "unsnooze"]) {
    assert.match(route, new RegExp(action));
  }
  assert.match(route, /90 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(route, /writeAudit/);
  assert.match(route, /notification\.\$\{parsed\.data\.action\}/);
});

test("automation notifications carry CRM context without autonomous customer actions", () => {
  const enterprise = read("src/lib/enterprise.ts");
  const templates = read("src/lib/automation-templates.ts");
  const validation = read("src/lib/enterprise-validation.ts");

  assert.match(enterprise, /category: "automation"/);
  assert.match(enterprise, /entityType/);
  assert.match(enterprise, /actionUrl/);
  assert.match(enterprise, /metadata: \{ eventType, ruleId: rule\.id \}/);
  assert.match(templates, /priority: "critical"/);
  assert.match(validation, /priority: z\.enum\(\["normal", "high", "critical"\]\)/);
  assert.doesNotMatch(templates, /send_email|send_whatsapp|contract_change|payment/i);
});

test("action inbox UI supports focus views, bulk actions and internal deep links", () => {
  const page = read("src/app/portal/(app)/inbox/page.tsx");
  const list = read("src/components/portal/NotificationInboxList.tsx");

  for (const view of ["active", "unread", "read", "snoozed", "archived"]) {
    assert.match(page, new RegExp(view));
  }
  assert.match(page, /safeActionUrl/);
  assert.match(page, /startsWith\("\/portal\/"\)/);
  assert.match(page, /pageSize: 25/);
  assert.match(list, /Seite auswählen/);
  assert.match(list, /Alle ungelesenen gelesen/);
  assert.match(list, /24 Std\. später/);
  assert.match(list, /Wiederherstellen/);
  assert.match(list, /Vorgang öffnen/);
});
