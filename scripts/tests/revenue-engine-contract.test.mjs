import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("portal Revenue Engine is grounded in real CRM signals", () => {
  const dashboard = read("src/app/portal/(app)/page.tsx");
  assert.match(dashboard, /Revenue Engine/);
  assert.match(dashboard, /hotLeads/);
  assert.match(dashboard, /dueLeadFollowUpsToday/);
  assert.match(dashboard, /openCustomerOpportunities/);
  assert.match(dashboard, /dueCustomerReviews/);
  assert.match(dashboard, /untouchedLeadsSla/);
  assert.match(dashboard, /leadsMissingNextAction/);
  assert.match(dashboard, /attentionOrders/);
  assert.match(dashboard, /Keine Fantasie-Prognose/);
});
