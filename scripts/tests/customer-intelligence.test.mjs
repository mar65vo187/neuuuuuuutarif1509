import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadCustomerIntelligence() {
  const source = ts.transpileModule(
    readFileSync(new URL("../../src/lib/customer-intelligence.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, { Date, Math, Number, Set })(() => {
    throw new Error("unexpected import");
  }, loaded, loaded.exports);
  return loaded.exports;
}

const { getCustomerIntelligence } = loadCustomerIntelligence();
const now = new Date("2026-09-20T12:00:00.000Z");

function base(overrides = {}) {
  return {
    customer: {
      createdAt: "2026-06-01T10:00:00.000Z",
      email: "kunde@example.test",
      phone: "0611 12345",
      preferredChannel: "telefon",
    },
    profile: {
      lifecycleStage: "active",
      relationshipStatus: "established",
      riskLevel: "normal",
      nextReviewAt: "2026-12-01T10:00:00.000Z",
      lastContactAt: "2026-09-10T10:00:00.000Z",
      lastContactChannel: "call",
    },
    orders: [{
      status: "active",
      category: "Internet",
      productName: "Glasfaser",
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
    }],
    tasks: [],
    activities: [{
      type: "call",
      occurredAt: "2026-09-10T10:00:00.000Z",
      nextActionAt: null,
    }],
    opportunities: [],
    referralCount: 1,
    availableCategories: ["Internet", "Strom", "Solar"],
    now,
    ...overrides,
  };
}

test("overdue task outranks new sales potential", () => {
  const result = getCustomerIntelligence(base({
    tasks: [{ status: "open", priority: "high", dueAt: "2026-09-19T09:00:00.000Z" }],
    opportunities: [{ status: "open", priority: "high", topic: "Solar", category: "Solar", nextReviewAt: null }],
  }));
  assert.equal(result.nextBestAction.key, "resolve_overdue_task");
  assert.equal(result.summary.overdueTasks, 1);
  assert.equal(result.tone, "high");
});

test("missing contact data becomes a critical service risk", () => {
  const input = base();
  input.customer = { ...input.customer, email: null, phone: null };
  const result = getCustomerIntelligence(input);
  assert.equal(result.nextBestAction.key, "complete_contact");
  assert.equal(result.tone, "critical");
  assert.ok(result.riskFlags.some((flag) => flag.key === "no_contact"));
});

test("active customer without recent contact receives retention review", () => {
  const result = getCustomerIntelligence(base({
    profile: {
      lifecycleStage: "active",
      relationshipStatus: "established",
      riskLevel: "normal",
      nextReviewAt: null,
      lastContactAt: "2026-04-01T10:00:00.000Z",
      lastContactChannel: "call",
    },
    activities: [],
  }));
  assert.equal(result.retention.status, "due");
  assert.equal(result.nextBestAction.key, "retention_review");
});

test("cross-sell signals only contain categories not already covered", () => {
  const result = getCustomerIntelligence(base({
    opportunities: [{ status: "open", priority: "normal", topic: "PV prüfen", category: "Solar", nextReviewAt: null }],
    availableCategories: ["Internet", "Solar", "Strom", "Versicherungen"],
  }));
  assert.deepEqual([...result.coverage.crossSellSignals], ["Strom", "Versicherungen"]);
});

test("overdue opportunity is explicit and explainable", () => {
  const result = getCustomerIntelligence(base({
    opportunities: [{
      status: "qualified",
      priority: "high",
      topic: "Wärmepumpe",
      category: "Wärmepumpe",
      nextReviewAt: "2026-09-10T12:00:00.000Z",
    }],
  }));
  assert.equal(result.nextBestAction.key, "review_opportunity");
  assert.ok(result.riskFlags.some((flag) => flag.key === "opportunity_overdue"));
});

test("restricted order visibility cannot produce sales coverage or blocked-order signals", () => {
  const result = getCustomerIntelligence(base({
    canReadOrders: false,
    orders: [
      { status: "active", category: "Hidden category", createdAt: now, updatedAt: now },
      { status: "documents_missing", category: "Hidden category", createdAt: now, updatedAt: now },
    ],
  }));
  assert.equal(result.summary.activeOrders, 0);
  assert.equal(result.coverage.activeCategories.length, 0);
  assert.equal(result.coverage.crossSellSignals.length, 0);
  assert(!result.riskFlags.some(flag => flag.key === "documents_missing"));
  assert(!result.missing.includes("Produkt-/Potenzialbild"));
  assert.equal(result.completeness, 100);
  assert.equal(result.nextBestAction.key, "relationship_maintain");
});
