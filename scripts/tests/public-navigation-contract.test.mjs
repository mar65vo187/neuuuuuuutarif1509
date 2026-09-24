import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("public request journey never leaves a dead Weiter button", () => {
  const form = read("../../src/components/forms/LeadForm.tsx");
  assert.match(form, /const goNext = \(\) =>/);
  assert.match(form, /Bitte wähle zuerst ein Thema/);
  assert.match(form, /Bitte wähle deine aktuelle Situation/);
  assert.match(form, /<Button type="button" onClick=\{goNext\}/);
  assert.doesNotMatch(form, /disabled=\{!canNext\}/);
});

test("mobile navigation uses the same audience filtering as desktop", () => {
  const header = read("../../src/components/site/Header.tsx");
  const matches = header.match(/visibleNav\.map/g) ?? [];
  assert.equal(matches.length, 2);
  assert.doesNotMatch(header, /\{NAV\.map\(\(item, index\)/);
});
