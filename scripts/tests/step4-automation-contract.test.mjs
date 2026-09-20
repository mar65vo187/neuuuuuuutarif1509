import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("work assistant remains explainable and human-approved", () => {
  const rules = read("src/lib/work-assistant.ts");
  const ui = read("src/components/portal/WorkAssistantActions.tsx");
  assert.match(rules, /reason:/);
  assert.match(rules, /recommendation:/);
  assert.match(ui, /Human Approval/);
  assert.match(ui, /Als Aufgabe übernehmen/);
  assert.match(ui, /fetch\("\/api\/portal\/tasks"/);
  assert.doesNotMatch(rules, /openai|anthropic|gemini|fetch\(/i);
});

test("provider and order warnings are deterministic and explainable", () => {
  const commandCenter = read("src/lib/portal-command-center.ts");
  const assistant = read("src/lib/work-assistant.ts");
  const page = read("src/app/portal/(app)/assistent/page.tsx");
  assert.match(commandCenter, /providerWarnings/);
  assert.match(commandCenter, /externalOrderId/);
  assert.match(commandCenter, /providerStatus/);
  assert.match(commandCenter, /activation_pending/);
  assert.match(commandCenter, /documents_missing/);
  assert.match(commandCenter, /Provider-Referenz|Provider-Status/);
  assert.match(assistant, /provider-referenz/);
  assert.match(assistant, /provider-status/);
  assert.match(page, /Providerwarnungen/);
});

test("portal task creation deduplicates matching open entity tasks", () => {
  const route = read("src/app/api/portal/tasks/route.ts");
  assert.match(route, /inArray\(tasks\.status, \["open", "in_progress"\]\)/);
  assert.match(route, /eq\(tasks\.entityType, input\.entityType\)/);
  assert.match(route, /eq\(tasks\.entityId, entityId\)/);
  assert.match(route, /deduplicated: true/);
});

test("scheduled operations sweep only creates internal tasks and audit records", () => {
  const source = read("src/lib/operations-sweep.ts");
  assert.match(source, /INSERT INTO tasks/);
  assert.match(source, /operations\.sweep/);
  assert.match(source, /lead_next_action_missing/);
  assert.match(source, /customer_review_due/);
  assert.match(source, /order_sla_review/);
  assert.match(source, /opportunity_review/);
  assert.match(source, /customer_risk_review/);
  assert.doesNotMatch(source, /\bUPDATE\s+(leads|customers|orders|customer_opportunities)\b/i);
  assert.doesNotMatch(source, /sendEmail|sendSms|whatsapp|fetch\(/i);
});

test("operations sweep endpoint requires constant-time CRON_SECRET authorization", () => {
  const route = read("src/app/api/internal/operations-sweep/route.ts");
  assert.match(route, /process\.env\.CRON_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /Bearer /);
});

test("production config schedules the protected sweep once daily", () => {
  const config = JSON.parse(read("vercel.json"));
  assert.ok(Array.isArray(config.crons));
  const sweep = config.crons.find((item) => item.path === "/api/internal/operations-sweep");
  assert.ok(sweep);
  assert.equal(sweep.schedule, "15 5 * * *");
});

test("Step 4 templates stay limited to internal task and notification actions", () => {
  const source = read("src/lib/automation-templates.ts");
  assert.match(source, /submitted-order-watch/);
  assert.match(source, /post-activation-care/);
  assert.match(source, /closed-lead-handover/);
  assert.match(source, /consultation-next-step/);
  assert.doesNotMatch(source, /type:\s*"email"|type:\s*"sms"|type:\s*"whatsapp"|type:\s*"contract"/i);
});
