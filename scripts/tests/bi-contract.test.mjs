import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("BI catalog defines canonical formulas, sources and scopes", () => {
  const bi = read("src/lib/bi-metrics.ts");
  for (const key of [
    "lead_conversion_rate",
    "activation_rate",
    "cancellation_rate",
    "next_action_coverage",
    "product_context_coverage",
    "provider_reference_coverage",
    "customer_owner_coverage",
    "task_on_time_coverage",
  ]) {
    assert.match(bi, new RegExp('key: "' + key + '"'));
  }
  assert.match(bi, /formula:/);
  assert.match(bi, /source:/);
  assert.match(bi, /scope:/);
});

test("enterprise reporting calculates quality coverage from canonical operational data", () => {
  const enterprise = read("src/lib/enterprise.ts");
  assert.match(enterprise, /qualityCoverage:/);
  assert.match(enterprise, /nextActionCovered/);
  assert.match(enterprise, /productCovered/);
  assert.match(enterprise, /providerReferenceRows/);
  assert.match(enterprise, /customerOwnerRows/);
  assert.match(enterprise, /taskCoverageRows/);
  assert.match(enterprise, /percentage\(/);
});

test("BI run rate is explicitly historical and not presented as a forecast", () => {
  const enterprise = read("src/lib/enterprise.ts");
  const page = read("src/app/portal/(app)/reporting/page.tsx");
  assert.match(enterprise, /leadsPerDay/);
  assert.match(enterprise, /previousLeadsPerDay/);
  assert.match(page, /Run Rate · keine Prognose/);
  assert.match(page, /Keine Zukunftsvorhersage/);
});

test("reporting exposes metric lineage to users", () => {
  const page = read("src/app/portal/(app)/reporting/page.tsx");
  assert.match(page, /Kennzahlenkatalog/);
  assert.match(page, /Eine Definition pro KPI/);
  assert.match(page, /metric\.formula/);
  assert.match(page, /metric\.source/);
});
