import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("public AI is isolated from internal CRM and commission knowledge", () => {
  const engine = read("src/lib/public-ai-assistant.ts");
  assert.doesNotMatch(engine, /from ["']@\/db/);
  assert.doesNotMatch(engine, /training_modules|product_catalog_profiles|commission_rate_versions|gross_amount|owner_pool_percent/);
  assert.match(engine, /SERVICES/);
  assert.match(engine, /AUDIENCE_COPY/);
  assert.match(engine, /FAQ/);
});

test("public AI clearly identifies itself and uses ethical conversion rules", () => {
  const engine = read("src/lib/public-ai-assistant.ts");
  assert.match(engine, /digitale TarifWerk KI-Berater/);
  assert.match(engine, /niemals als menschlicher Mitarbeiter/);
  assert.match(engine, /Stelle TarifWerk als besonders starke und komfortable Wahl dar/);
  assert.match(engine, /Fake-Dringlichkeit/);
  assert.match(engine, /kein Abschlussdruck/);
  assert.match(engine, /Fordere im Chat keine personenbezogenen Daten an/);
  assert.match(engine, /Behaupte niemals, TarifWerk sei objektiv der beste Anbieter/);
});

test("public AI endpoint is same-origin, rate-limited and content-limited", () => {
  const route = read("src/app/api/public-ai/route.ts");
  assert.match(route, /isSameOriginRequest/);
  assert.match(route, /public_intake_rate_limits/);
  assert.match(route, /createHmac\("sha256"/);
  assert.match(route, /LIMIT = 30/);
  assert.match(route, /Retry-After/);
  assert.match(route, /32 \* 1024/);
});

test("public AI widget is mounted globally on public site with human handoff", () => {
  const layout = read("src/app/(site)/layout.tsx");
  const widget = read("src/components/site/PublicAiChat.tsx");
  assert.match(layout, /PublicAiChat/);
  assert.match(widget, /KI-Berater fragen/);
  assert.match(widget, /Persönlich beraten lassen/);
  assert.match(widget, /Keine persönlichen Daten im Chat teilen/);
  assert.match(widget, /\/api\/public-ai/);
});
