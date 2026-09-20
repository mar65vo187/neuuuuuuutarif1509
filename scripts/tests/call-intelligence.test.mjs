import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadCallIntelligence() {
  const source = ts.transpileModule(
    readFileSync(new URL("../../src/lib/call-intelligence.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, {
    Date,
    Intl,
    Math,
    Number,
  })(() => { throw new Error("unexpected import"); }, loaded, loaded.exports);
  return loaded.exports;
}

const { recommendLeadFollowUp } = loadCallIntelligence();
const calledAt = new Date("2026-09-21T10:00:00.000Z");

test("do-not-contact never creates an automatic callback", () => {
  const result = recommendLeadFollowUp({
    calledAt,
    reachedPerson: "customer",
    reaction: "do_not_contact",
    attemptNumber: 1,
    requestedCallbackAt: null,
  });
  assert.equal(result.at, null);
  assert.equal(result.action, "no_auto_call");
  assert.equal(result.contactOutcome, "not_interested");
});

test("wrong number stops follow-up until contact data is corrected", () => {
  const result = recommendLeadFollowUp({
    calledAt,
    reachedPerson: "wrong_number",
    reaction: "neutral",
    attemptNumber: 1,
    requestedCallbackAt: null,
  });
  assert.equal(result.at, null);
  assert.equal(result.action, "no_auto_call");
  assert.equal(result.contactOutcome, "wrong_number");
});

test("explicit callback time has priority over generic scheduling", () => {
  const requestedCallbackAt = new Date("2026-09-23T14:30:00.000Z");
  const result = recommendLeadFollowUp({
    calledAt,
    reachedPerson: "customer",
    reaction: "callback_requested",
    attemptNumber: 2,
    requestedCallbackAt,
  });
  assert.equal(result.at?.toISOString(), requestedCallbackAt.toISOString());
  assert.equal(result.action, "call_again");
  assert.equal(result.contactOutcome, "callback");
});

test("repeated no-answer attempts stop after the fifth attempt", () => {
  const result = recommendLeadFollowUp({
    calledAt,
    reachedPerson: "nobody",
    reaction: "no_answer",
    attemptNumber: 5,
    requestedCallbackAt: null,
  });
  assert.equal(result.at, null);
  assert.equal(result.action, "no_auto_call");
  assert.equal(result.contactOutcome, "no_answer");
});

test("an interested contact receives a future follow-up recommendation", () => {
  const result = recommendLeadFollowUp({
    calledAt,
    reachedPerson: "customer",
    reaction: "interested",
    attemptNumber: 1,
    requestedCallbackAt: null,
  });
  assert.ok(result.at instanceof Date);
  assert.ok(result.at.getTime() > calledAt.getTime());
  assert.equal(result.action, "call_again");
  assert.equal(result.contactOutcome, "reached");
});
