import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const {
  addBerlinCalendarDaysAtNine,
  formatBerlinDateTimeInput,
  parseBerlinDateTimeInput,
} = loadTs("src/lib/portal-date-time.ts");

test("Berlin date-time conversion preserves winter and summer wall-clock times", () => {
  assert.equal(formatBerlinDateTimeInput("2026-01-15T08:30:00.000Z"), "2026-01-15T09:30");
  assert.equal(formatBerlinDateTimeInput("2026-07-15T07:30:00.000Z"), "2026-07-15T09:30");
  assert.equal(parseBerlinDateTimeInput("2026-01-15T09:30"), "2026-01-15T08:30:00.000Z");
  assert.equal(parseBerlinDateTimeInput("2026-07-15T09:30"), "2026-07-15T07:30:00.000Z");
});

test("Berlin date-time conversion rejects nonexistent and ambiguous daylight-saving times", () => {
  assert.throws(
    () => parseBerlinDateTimeInput("2026-03-29T02:30"),
    /existiert wegen der Zeitumstellung in Berlin nicht/,
  );
  assert.throws(
    () => parseBerlinDateTimeInput("2026-10-25T02:30"),
    /kommt wegen der Zeitumstellung in Berlin zweimal vor/,
  );
});

test("follow-up shortcuts preserve Berlin calendar days across daylight-saving changes", () => {
  const spring = addBerlinCalendarDaysAtNine(1, new Date("2026-03-28T12:00:00.000Z"));
  const autumn = addBerlinCalendarDaysAtNine(1, new Date("2026-10-24T12:00:00.000Z"));

  assert.equal(spring, "2026-03-29T09:00");
  assert.equal(parseBerlinDateTimeInput(spring), "2026-03-29T07:00:00.000Z");
  assert.equal(autumn, "2026-10-25T09:00");
  assert.equal(parseBerlinDateTimeInput(autumn), "2026-10-25T08:00:00.000Z");
});

test("lead call logging and reminders use the shared Berlin date-time conversion", () => {
  const actions = read("src/components/portal/LeadActions.tsx");
  const page = read("src/app/portal/(app)/leads/[id]/page.tsx");

  assert.match(actions, /parseBerlinDateTimeInput\(nextAction\)/);
  assert.match(actions, /parseBerlinDateTimeInput\(callTime\)/);
  assert.match(actions, /parseBerlinDateTimeInput\(requestedCallback\)/);
  assert.match(actions, /addBerlinCalendarDaysAtNine\(days\)/);
  assert.match(actions, /formatBerlinDateTimeInput\(new Date\(json\.recommendation\.at\)\)/);
  assert.match(page, /formatBerlinDateTimeInput\(lead\.nextActionAt\)/);
  for (const field of ["callTime", "nextAction", "requestedCallback"]) {
    assert.equal(actions.includes(`new Date(${field})`), false);
  }
});
