import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("real AI assistant supports Xkiro, Gemini and OpenRouter providers", () => {
  const engine = read("src/lib/ai-sales-assistant.ts");
  assert.match(engine, /api\.xkiro\.com\/v1\/chat\/completions/);
  assert.match(engine, /qwen\/qwen3\.8-omni-flash:free/);
  assert.match(engine, /XKIRO_API_KEY/);
  assert.match(engine, /AbortSignal\.timeout\(55_000\)/);
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
  assert.match(engine, /COACHING_PLAYBOOK/);
  assert.match(engine, /TarifWerk Sales Playbook/);
  assert.match(engine, /Discovery/);
  assert.match(engine, /Einwand/);
  assert.doesNotMatch(engine, /commission_rate_versions|gross_amount|owner_pool_percent/);
});

test("AI redacts common PII and never stores prompt contents in telemetry", () => {
  const engine = read("src/lib/ai-sales-assistant.ts");
  const route = read("src/app/api/portal/ai/route.ts");
  const migration = read("migrations/0014_ai_sales_assistant.sql");
  assert.match(engine, /\[E-Mail entfernt\]/);
  assert.match(engine, /\[Telefon entfernt\]/);
  assert.match(engine, /sanitizeHistory/);
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

test("AI client allows the Xkiro server timeout to finish before aborting", () => {
  const client = read("src/components/portal/AiSalesAssistant.tsx");
  assert.match(client, /AbortSignal\.timeout\(60_000\)/);
  assert.match(client, /länger als 60 Sekunden/);
});

test("internal AI supports conversational roleplay and debrief training", () => {
  const engine = read("src/lib/ai-sales-assistant.ts");
  const route = read("src/app/api/portal/ai/route.ts");
  const client = read("src/components/portal/AiSalesAssistant.tsx");
  assert.match(engine, /"roleplay"/);
  assert.match(engine, /"debrief"/);
  assert.match(engine, /history\?: AiAssistantHistoryMessage\[\]/);
  assert.match(route, /history:/);
  assert.match(route, /roleplay/);
  assert.match(client, /Live-Rollenspiel/);
  assert.match(client, /Gespräch auswerten/);
  assert.match(client, /history/);
});

test("curated sales academy migration seeds internal-only training modules", () => {
  const migration = read("migrations/0022_sales_coaching_playbook.sql");
  assert.match(migration, /Discovery Mastery/);
  assert.match(migration, /Einwandbehandlung/);
  assert.match(migration, /B2B Discovery/);
  assert.match(migration, /Rollenspiel-Scorecard/);
  assert.doesNotMatch(migration, /fake scarcity|dark psychology/i);
});
