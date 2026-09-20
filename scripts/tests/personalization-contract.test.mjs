import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("session personalization uses only first-party session context", () => {
  const journey = read("src/components/site/JourneyContext.tsx");
  const card = read("src/components/home/SessionIntentCard.tsx");
  assert.match(journey, /sessionStorage/);
  assert.match(journey, /lastServiceSlug/);
  assert.doesNotMatch(card, /localStorage|document\.cookie|fetch\(/);
  assert.match(card, /readSessionIntent/);
});

test("personalization is transparent and dismissible", () => {
  const card = read("src/components/home/SessionIntentCard.tsx");
  assert.match(card, /Zuletzt angesehen/);
  assert.match(card, /dieser Sitzung/);
  assert.match(card, /Hinweis ausblenden/);
  assert.match(card, /HIDDEN_KEY/);
});

test("personalized continuation preserves audience and explicit user control", () => {
  const card = read("src/components/home/SessionIntentCard.tsx");
  assert.match(card, /withAudience/);
  assert.match(card, /Thema erneut öffnen/);
  assert.match(card, /Dazu anfragen/);
  assert.match(card, /Dazu beraten lassen/);
});

test("homepage includes the transparent session intent card", () => {
  const page = read("src/app/(site)/page.tsx");
  assert.match(page, /SessionIntentCard/);
  assert.match(page, /<SessionIntentCard audience=\{initialAudience\}/);
});
