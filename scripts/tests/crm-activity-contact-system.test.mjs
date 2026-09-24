import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("contact pool is a separate persistence model and not a lead alias", () => {
  const migration = read("migrations/0024_employee_activity_messages_points.sql");
  const schema = read("src/db/enterprise-schema.ts");
  const create = read("src/app/api/portal/contacts/route.ts");

  assert.match(migration, /CREATE TABLE IF NOT EXISTS prospect_contacts/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS prospect_contact_product_links/);
  assert.match(schema, /export const prospectContacts = pgTable\("prospect_contacts"/);
  assert.match(schema, /export const prospectContactProductLinks = pgTable\("prospect_contact_product_links"/);
  assert.match(create, /tx\.insert\(prospectContacts\)/);
  assert.doesNotMatch(create, /tx\.insert\(leads\)/);
  assert.doesNotMatch(create, /emitEvent\(tx, "lead\.created"/);
  assert.doesNotMatch(create, /runAutomationEvent\(tx, "lead\.created"/);
  assert.doesNotMatch(create, /tx\.insert\(tasks\)/);
});

test("contact becomes a real lead only through explicit qualification", () => {
  const convert = read("src/app/api/portal/contacts/[id]/convert/route.ts");

  assert.match(convert, /tx\.insert\(leads\)/);
  assert.match(convert, /source: "contact_pool"/);
  assert.match(convert, /tx\.insert\(leadProductLinks\)/);
  assert.match(convert, /status: "converted"/);
  assert.match(convert, /convertedLeadId: created\.id/);
  assert.match(convert, /emitEvent\(tx, "lead\.created"/);
  assert.match(convert, /runAutomationEvent\(tx, "lead\.created"/);
  assert.match(convert, /if \(contact\.nextContactAt\)/);
  assert.match(convert, /tx\.insert\(tasks\)/);
});

test("lead intake offers contact-only and direct-lead modes", () => {
  const form = read("src/components/portal/LeadCreateForm.tsx");
  const page = read("src/app/portal/(app)/leads/neu/page.tsx");

  assert.match(form, /Nur Kontakt speichern/);
  assert.match(form, /Direkt als Lead/);
  assert.match(form, /entryMode === "contact" \? "\/api\/portal\/contacts" : "\/api\/portal\/leads"/);
  assert.match(form, /Keine Lead-Automation und keine Pflicht-Aufgabe/);
  assert.match(page, /mode === "contact"/);
  assert.match(page, /defaultMode=\{defaultMode\}/);
});

test("admin nudges enter the personal inbox and require acknowledgement", () => {
  const migration = read("migrations/0024_employee_activity_messages_points.sql");
  const send = read("src/app/api/portal/admin/employee-message/route.ts");
  const mutate = read("src/app/api/portal/notifications/route.ts");
  const inbox = read("src/components/portal/NotificationInboxList.tsx");

  assert.match(migration, /requires_ack/);
  assert.match(migration, /acknowledged_at/);
  assert.match(send, /kind: z\.enum\(\["personal_message", "nudge"\]\)/);
  assert.match(send, /parsed\.data\.kind === "nudge" \? true/);
  assert.match(send, /senderEmployeeId: admin\.id/);
  assert.match(mutate, /action === "acknowledge"/);
  assert.match(mutate, /patch\.acknowledgedAt = now/);
  assert.match(mutate, /parsed\.data\.action === "archive"[\s\S]*notificationQueue\.requiresAck/);
  assert.match(inbox, /Gelesen & verstanden/);
  assert.match(inbox, /Bestätigung offen/);
});

test("employee activity remains transparent and uses concrete CRM actions", () => {
  const activity = read("src/lib/employee-activity.ts");
  const dashboard = read("src/components/portal/EmployeeActivityDashboard.tsx");

  for (const source of [
    "prospect_contacts",
    "leads",
    "lead_call_activities",
    "customer_activities",
    "tasks",
    "orders",
    "service_case_events",
    "audit_events",
  ]) assert.match(activity, new RegExp(source));

  assert.match(activity, /contacts7/);
  assert.match(activity, /leads7/);
  assert.match(activity, /calls7/);
  assert.match(activity, /tasksCompleted7/);
  assert.match(activity, /orders7/);
  assert.match(dashboard, /Arbeitssignal und kein Qualitäts- oder Leistungsurteil/);
  assert.match(dashboard, /Anstupser \/ Denkanstoß/);
});

test("commission imports preserve source evidence and support cash plus points", () => {
  const migration = read("migrations/0024_employee_activity_messages_points.sql");
  const validation = read("src/lib/product-hub-validation.ts");
  const importRoute = read("src/app/api/portal/admin/catalog/commission/route.ts");
  const uploadRoute = read("src/app/api/portal/admin/catalog/commission/source/route.ts");
  const hub = read("src/components/portal/ProductHubDashboard.tsx");

  assert.match(migration, /source_document_id/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS points numeric/);
  assert.match(migration, /reward_note/);
  assert.match(validation, /sourceDocumentId/);
  assert.match(validation, /points: money\.optional\(\)\.default\(0\)/);
  assert.match(importRoute, /sourceDocumentId: parsed\.data\.sourceDocumentId/);
  assert.match(importRoute, /points: String\(row\.points/);
  assert.match(importRoute, /rewardNote: row\.rewardNote/);
  assert.match(uploadRoute, /commission_list_source/);
  assert.match(uploadRoute, /MAX_SIZE = 12 \* 1024 \* 1024/);
  assert.match(hub, /Provision €\|Punkte\|SKU\|Hinweis/);
  assert.match(hub, /Originaldatei öffnen/);
});
