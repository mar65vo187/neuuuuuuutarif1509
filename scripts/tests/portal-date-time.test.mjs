import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { formatBerlinDateTimeInput: format, parseBerlinDateTimeInput: parse } = loadTs("src/lib/portal-date-time.ts");

test("portal reminder inputs round-trip Berlin time in winter and summer", () => {
  for (const [input, iso] of [
    ["2026-01-15T09:30", "2026-01-15T08:30:00.000Z"],
    ["2026-07-15T09:30", "2026-07-15T07:30:00.000Z"],
    ["2026-03-29T01:30", "2026-03-29T00:30:00.000Z"],
    ["2026-03-29T03:30", "2026-03-29T01:30:00.000Z"],
    ["2026-10-25T03:30", "2026-10-25T02:30:00.000Z"],
    ["2028-02-29T00:00", "2028-02-28T23:00:00.000Z"],
  ]) {
    assert.equal(parse(input), iso);
    assert.equal(format(iso), input);
  }
});

test("invalid and ambiguous reminder times produce actionable errors", () => {
  assert.throws(() => parse("2026-03-29T02:30"), /existiert.*nicht/);
  assert.throws(() => parse("2026-10-25T02:30"), /zweimal/);
  for (const input of ["2026-02-30T10:00", "2026-02-29T10:00", "2026-01-01T25:00", "tomorrow", "2026-01-01"]) {
    assert.throws(() => parse(input), /Bitte/);
  }
  assert.equal(parse(""), null);
  assert.equal(format(null), "");
  assert.equal(format("invalid"), "");
});

test("input values do not depend on the browser or server time zone", () => {
  const before = process.env.TZ;
  try {
    for (const timeZone of ["UTC", "America/New_York", "Asia/Tokyo"]) {
      process.env.TZ = timeZone;
      assert.equal(format("2026-07-15T07:30:00Z"), "2026-07-15T09:30");
      assert.equal(parse("2026-07-15T09:30"), "2026-07-15T07:30:00.000Z");
    }
  } finally {
    if (before === undefined) delete process.env.TZ;
    else process.env.TZ = before;
  }
});
