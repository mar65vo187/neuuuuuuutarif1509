import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("public lead metadata is explicitly bounded", () => {
  const validation = read("src/lib/validation.ts");
  assert.match(validation, /const publicLeadMetaSchema = z\.object\(/);
  assert.match(validation, /companyName:/);
  assert.match(validation, /landingPath:/);
  assert.match(validation, /utmCampaign:/);
  assert.match(validation, /\)\.strict\(\)/);
});

test("Business lead intake keeps company and journey context", () => {
  const form = read("src/components/forms/LeadForm.tsx");
  assert.match(form, /companyName/);
  assert.match(form, /readJourneyContext/);
  assert.match(form, /companySize/);
  assert.match(form, /meta:\s*\{/);

  const enterprise = read("src/lib/enterprise.ts");
  assert.match(enterprise, /const businessLead = leadMeta\.audience === "b2b"/);
  assert.match(enterprise, /type: businessLead \? "business" : "private"/);
  assert.match(enterprise, /companyName,/);
});

test("public lead rate limit is shared across application instances", () => {
  const route = read("src/app/api/leads/route.ts");
  const migration = read("migrations/0007_public_intake_rate_limit.sql");
  assert.match(route, /public_intake_rate_limits/);
  assert.match(route, /createHmac\("sha256", secret\)/);
  assert.match(route, /Retry-After/);
  assert.match(route, /sharedRateLimit/);
  assert.match(route, /updated_at < now\(\) - interval '24 hours'/);
  assert.match(migration, /key_hash text PRIMARY KEY/);
  assert.doesNotMatch(migration, /ip_address|raw_ip/i);
});

test("site has a root-level error boundary", () => {
  const source = read("src/app/global-error.tsx");
  assert.match(source, /<html lang="de">/);
  assert.match(source, /Erneut laden/);
});
