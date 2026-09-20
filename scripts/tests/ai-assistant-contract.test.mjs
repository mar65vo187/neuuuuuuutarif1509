import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("real AI assistant supports Gemini free tier and OpenRouter free fallback", () => {
  const engine = read("src/lib/ai-sales-assistant.ts");
  assert.match(engine, /generativelanguage\.googleapis\.com\/v1beta\/interactions/);
  assert.match(engine, /gemini-3\.8-flash/);
  assert.match(engine, /store:\s*false/);
  assert.match(engine, /openrouter\.ai\/api\/v1\/chat\/completions/);
  assert.match(engine, /openrouter\/free/);
  assert.match(engine, /TARIFWERK_AI_PROVIDER/);
});

test("AI knowledge comes from approved company, product and optional training data", () => {
  const engine = read("src/lib/ai-sales-assistant.ts");
  assert.match(engine, /product_catalog_profiles/);
  assert.match(engine, /sales_arguments/);
  assert.match(engine, /objections/);
  assert.match(engine, /short_pitch/);
  assert.match(engine, /training_modules/);
  assert.match(engine, /TARIFWERK_AI_INCLUDE_TRAINING/);
  assert.doesNotMatch(engine, /commission_rate_versions|gross_amount|owner_pool_percent/);
});

test("AI redacts common PII and never stores prompt contents in telemetry", () => {
  const engine = read("src/lib/ai-sales-assistant.ts");
  const route = read("src/app/api/portal/ai/route.ts");
  const migration = read("migrations/0014_ai_sales_assistant.sql");
  assert.match(engine, /\[E-Mail entfernt\]/);
  assert.match(engine, /\[Telefon entfernt\]/);
  assert.match(route, /dailyLimit/);
  assert.match(route, /ai_assistant_usage/);
  assert.doesNotMatch(migration, /\b(prompt|response_text|question|answer)\s+(text|jsonb|varchar)/i);
});

test("AI remains human-approved and cannot mutate CRM records", () => {
  const route = read("src/app/api/portal/ai/route.ts");
  const engine = read("src/lib/ai-sales-assistant.ts");
  const page = read("src/app/portal/(app)/assistent/page.tsx");
  assert.doesNotMatch(route, /UPDATE\s+(leads|customers|orders)|INSERT\s+INTO\s+(leads|customers|orders)/i);
  assert.doesNotMatch(engine, /UPDATE\s+(leads|customers|orders)|INSERT\s+INTO\s+(leads|customers|orders)/i);
  assert.match(page, /wichtige CRM-Änderungen bleiben weiterhin menschlich bestätigt/);
});

test("AI system prompt requires positive but factual TarifWerk positioning", () => {
  const engine = read("src/lib/ai-sales-assistant.ts");
  assert.match(engine, /selbstbewusst und positiv/);
  assert.match(engine, /Erfinde niemals Marktführerschaft/);
  assert.match(engine, /Sprich Wettbewerber nicht schlecht/);
  assert.match(engine, /TarifWerk arbeitet mit mehreren Marktteilnehmern, aber nicht mit jedem Anbieter/);
});
