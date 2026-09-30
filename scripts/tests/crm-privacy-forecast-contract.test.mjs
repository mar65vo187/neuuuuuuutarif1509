import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

function loadTs(path) {
  const source = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(source, { module: loaded, exports: loaded.exports });
  return loaded.exports;
}

test("forecast columns are optional, range-checked and indexed", () => {
  const migration = read("migrations/0025_lead_forecast.sql");
  for (const column of ["deal_value_cents integer", "win_probability smallint", "expected_close_at date", "lost_reason text"]) {
    assert.match(migration, new RegExp(`ADD COLUMN IF NOT EXISTS ${column}`));
  }
  assert.doesNotMatch(migration, /NOT NULL/);
  assert.match(migration, /win_probability >= 0 AND win_probability <= 100/);
  assert.match(migration, /deal_value_cents >= 0 AND deal_value_cents <= 1000000000/);
  assert.match(migration, /leads_lost_reason_known/);

  const schema = read("src/db/schema.ts");
  assert.match(schema, /dealValueCents: integer\("deal_value_cents"\)/);
  assert.match(schema, /winProbability: smallint\("win_probability"\)/);
  assert.match(schema, /expectedCloseAt: date\("expected_close_at"\)/);
  assert.match(schema, /lostReason: text\("lost_reason"\)/);
});

test("lost reasons stay identical in database, validation and labels", () => {
  const migration = read("migrations/0025_lead_forecast.sql");
  const validation = read("src/lib/validation.ts");
  const content = loadTs("src/lib/content.ts");
  const reasons = [...content.LEAD_LOST_REASONS];
  assert.deepEqual(Object.keys(content.LEAD_LOST_REASON_LABELS), reasons);
  for (const reason of reasons) {
    assert.match(migration, new RegExp(`'${reason}'`));
    assert.match(validation, new RegExp(`"${reason}"`));
  }
});

test("lead updates validate, audit and document forecast changes", () => {
  const route = read("src/app/api/portal/leads/[id]/route.ts");
  assert.match(route, /Ein Verlustgrund passt nur zum Status/);
  assert.match(route, /Forecast aktualisiert:/);
  assert.match(route, /Verlustgrund: \$\{LEAD_LOST_REASON_LABELS\[data\.lostReason\]\}/);
  assert.match(route, /requestedStatus !== "verloren" && existing\.lostReason/);
  for (const field of ["dealValueCents", "winProbability", "expectedCloseAt", "lostReason"]) {
    assert.match(route, new RegExp(`${field}: existing\\.${field} \\?\\? null`), `${field} missing in audit old values`);
  }
});

test("weighted forecast never counts missing probabilities and respects lead access", () => {
  const forecast = read("src/lib/pipeline-forecast.ts");
  assert.match(forecast, /coalesce\(\$\{leads\.winProbability\}, 0\) \/ 100\.0/);
  assert.match(forecast, /leadAccessCondition\(user\)/);
  assert.match(forecast, /not in \('abgeschlossen', 'verloren'\)/);
  const page = read("src/app/portal/(app)/reporting/page.tsx");
  assert.match(page, /Leads ohne Wahrscheinlichkeit zählen mit 0 %/);
});

test("euro input accepts German formats and rejects ambiguous values", () => {
  const { parseEuroInput } = loadTs("src/lib/money-input.ts");
  assert.equal(parseEuroInput(""), null);
  assert.equal(parseEuroInput("1.200"), 120000);
  assert.equal(parseEuroInput("1200,5"), 120050);
  assert.equal(parseEuroInput("1 200 €"), 120000);
  assert.equal(parseEuroInput("0,01"), 1);
  assert.equal(parseEuroInput("12.00"), undefined);
  assert.equal(parseEuroInput("-5"), undefined);
  assert.equal(parseEuroInput("10.000.000,01"), undefined);
});

test("bulk exports are audited before data leaves the system", () => {
  const route = read("src/app/api/portal/enterprise/export/route.ts");
  assert.match(route, /"export\.downloaded"/);
  for (const type of ["customers", "commissions", "orders"]) {
    assert.match(route, new RegExp(`if \\(!await recordExport\\(user\\.id, "${type}"\\)\\) return exportUnavailable\\(\\);`));
  }
  const auditIndex = route.indexOf('recordExport(user.id, "customers")');
  const streamIndex = route.indexOf('"tarifwerk-kunden.csv"');
  assert.ok(auditIndex > 0 && auditIndex < streamIndex, "audit must run before the customer CSV stream starts");
});

test("DSGVO access export requires privacy permission and MFA and is logged before data is read", () => {
  const route = read("src/app/api/portal/privacy/customers/[id]/export/route.ts");
  assert.match(route, /hasPermission\(user, PORTAL_PERMISSION\.PRIVACY_MANAGE\)/);
  assert.match(route, /user\.mfaVerified !== true/);
  const logged = route.indexOf("tx.insert(dataRequests)");
  const audited = route.indexOf('"privacy.access_export"');
  const exported = route.indexOf("buildCustomerPrivacyExport(customerId)");
  assert.ok(logged > 0 && audited > logged && exported > audited, "request and audit entry must be written before the export is built");
  assert.match(route, /"Cache-Control": "no-store"/);

  const lib = read("src/lib/privacy-export.ts");
  for (const table of ["customers", "customer_consents", "customer_activities", "orders", "service_cases", "leads", "lead_notes", "lead_call_activities", "tasks", "document_records", "optimization_documents", "data_requests"]) {
    assert.match(lib, new RegExp(`from ${table} t`), `${table} missing in the access export`);
  }
  assert.match(lib, /to_jsonb\(t\) - 'data'/, "binary file content must not be embedded");
  assert.doesNotMatch(lib, /\$\{(?!c\}|leadSet\(c\)|orderSet\(c\)|caseSet\(c\)|polymorphic\(c\))/, "only the customer id may be interpolated");
});

test("erasure is irreversible only behind privacy permission, MFA and an explicit confirmation", () => {
  for (const path of ["src/app/api/portal/privacy/customers/[id]/erase/route.ts", "src/app/api/portal/privacy/leads/[id]/erase/route.ts"]) {
    const route = read(path);
    assert.match(route, /isSameOriginRequest\(request\)/, `${path}: CSRF check`);
    assert.match(route, /hasPermission\(user, PORTAL_PERMISSION\.PRIVACY_MANAGE\)/, `${path}: permission`);
    assert.match(route, /user\.mfaVerified !== true/, `${path}: MFA`);
    assert.match(route, /Es wurde nichts verändert/, `${path}: failure keeps data`);
  }
  assert.match(read("src/app/api/portal/privacy/customers/[id]/erase/route.ts"), /customer\.customerNumber !== parsed\.data\.confirmCustomerNumber/);
  assert.match(read("src/app/api/portal/privacy/leads/[id]/erase/route.ts"), /z\.literal\("ANONYMISIEREN"\)/);

  const lib = read("src/lib/privacy-center.ts");
  assert.match(lib, /tarifwerk_anonymize_customer/);
  assert.match(lib, /type: "erasure"/);
  assert.match(lib, /"privacy\.erasure"/);
  assert.match(lib, /Bitte über die Kundenakte anonymisieren/);
});

test("anonymisation keeps accounting records and consent proofs but removes personal content", () => {
  const migration = read("migrations/0026_privacy_center.sql");
  assert.doesNotMatch(migration, /UPDATE orders|DELETE FROM orders|commission_events|financial_ledger_entries/i);
  assert.doesNotMatch(migration, /UPDATE customer_consents|DELETE FROM customer_consents/i);
  for (const field of ["email = NULL", "phone = NULL", "street = NULL", "date_of_birth = NULL"]) assert.match(migration, new RegExp(field));
  assert.match(migration, /ERRCODE = 'P0004'/);
  assert.match(read(".github/workflows/quality.yml"), /node scripts\/verify-privacy-functions\.mjs/);
  assert.match(read("scripts/sql/verify-privacy-functions.sql"), /ROLLBACK;\s*$/);
});

test("consents are append-only, scoped to accessible customers and audited", () => {
  const route = read("src/app/api/portal/privacy/customers/[id]/consents/route.ts");
  assert.match(route, /customerAccess\(user\)/);
  assert.match(route, /isNull\(customers\.archivedAt\)/);
  const lib = read("src/lib/privacy-center.ts");
  assert.match(lib, /tx\.insert\(customerConsents\)/);
  assert.doesNotMatch(lib, /update\(customerConsents\)|delete\(customerConsents\)/);
  assert.match(lib, /privacy\.consent_granted/);
  assert.match(lib, /privacy\.consent_revoked/);
});

test("lead retention preserves existing data by default and requires an explicit valid period", () => {
  const sweep = read("src/lib/operations-sweep.ts");
  assert.match(sweep, /tarifwerk_expired_lead_ids\(\$1::integer\)/);
  assert.match(sweep, /limit 500/);
  const start = sweep.indexOf("export function leadRetentionMonths");
  const end = sweep.indexOf("\n}\n", start) + 3;
  const source = ts.transpileModule(sweep.slice(start, end).replace("export function", "function"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const defaultDeclaration = sweep.match(/const DEFAULT_LEAD_RETENTION_MONTHS = \d+;/)?.[0];
  assert.ok(defaultDeclaration);
  const leadRetentionMonths = vm.runInNewContext(`${defaultDeclaration} const process = { env: {} }; ${source}; leadRetentionMonths`);
  assert.equal(leadRetentionMonths(undefined), 0);
  assert.equal(leadRetentionMonths(""), 0);
  assert.equal(leadRetentionMonths("  "), 0);
  assert.equal(leadRetentionMonths("0"), 0);
  assert.equal(leadRetentionMonths("3"), 6);
  assert.equal(leadRetentionMonths("36"), 36);
  assert.equal(leadRetentionMonths("500"), 120);
  assert.equal(leadRetentionMonths("abc"), 0);
  assert.equal(leadRetentionMonths("-1"), 0);
  assert.equal(leadRetentionMonths("12.5"), 0);
});

test("reporting shows forecast per advisor and response time without ranking", () => {
  const forecast = read("src/lib/pipeline-forecast.ts");
  assert.match(forecast, /percentile_cont\(0\.5\)/);
  assert.match(forecast, /interval '90 days'/);
  assert.match(forecast, /<> 'bewerbung'/);
  const page = read("src/app/portal/(app)/reporting/page.tsx");
  assert.match(page, /alphabetisch – kein Ranking/);
  assert.match(page, /Reaktionszeit · letzte 90 Tage/);
});
