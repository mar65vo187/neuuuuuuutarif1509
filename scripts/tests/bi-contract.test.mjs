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
    "activation_throughput",
    "open_order_pipeline",
    "committed_activation_pipeline",
    "pipeline_backlog_days",
    "activation_run_rate_scenario_30d",
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

test("leadership scenario uses real activation events and no hidden probability weighting", () => {
  const enterprise = read("src/lib/enterprise.ts");
  const page = read("src/app/portal/(app)/reporting/page.tsx");

  assert.match(enterprise, /gte\(orders\.activatedAt, from\)/);
  assert.match(enterprise, /gte\(orders\.activatedAt, previousFrom\)/);
  assert.match(enterprise, /runRateScenario30 = Math\.round\(activationThroughputPerDay \* 30 \* 10\) \/ 10/);
  assert.match(enterprise, /backlogDays = activationThroughputPerDay > 0/);
  assert.match(enterprise, /methodology: "30-Tage-Szenario = tatsächliche Aktivierungen/);
  assert.match(page, /deterministisches Szenario/);
  assert.match(page, /Keine Garantie oder ML-Prognose/);
  assert.doesNotMatch(enterprise, /winProbability|closeProbability|predictedProbability/);
});

test("reporting task workload uses the same open plus in-progress definition as operations", () => {
  const enterprise = read("src/lib/enterprise.ts");
  assert.match(enterprise, /count\(\*\) filter \(where \$\{tasks\.status\} in \('open','in_progress'\)\)::int/);
  assert.match(enterprise, /where \$\{tasks\.status\} in \('open','in_progress'\) and \$\{tasks\.dueAt\} is not null/);
});

test("leadership capacity is neutral, actionable and not performance-ranked", () => {
  const enterprise = read("src/lib/enterprise.ts");
  const page = read("src/app/portal/(app)/reporting/page.tsx");

  assert.match(enterprise, /teamCapacity = staff\.map/);
  assert.match(page, /Team-Arbeitsbestand ohne Ranking/);
  assert.match(page, /Sortierung bleibt neutral nach Namen/);
  assert.match(page, /\/portal\/auftraege\?advisor=\$\{row\.employeeId\}&focus=attention/);
  assert.doesNotMatch(enterprise, /teamCapacity = .*\.sort/s);
});

test("reporting exposes metric lineage to users", () => {
  const page = read("src/app/portal/(app)/reporting/page.tsx");
  assert.match(page, /Kennzahlenkatalog/);
  assert.match(page, /Eine Definition pro KPI/);
  assert.match(page, /metric\.formula/);
  assert.match(page, /metric\.source/);
});
