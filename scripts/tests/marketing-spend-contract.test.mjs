import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("marketing spend is stored in an audited dedicated ledger", () => {
  const migration = read("migrations/0012_marketing_campaign_spend.sql");
  const route = read("src/app/api/portal/campaign-spend/route.ts");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS marketing_campaign_spend/);
  assert.match(migration, /amount_cents integer NOT NULL/);
  assert.match(route, /user\.role !== "admin"/);
  assert.match(route, /marketing\.spend\.created/);
  assert.match(route, /isSameOriginRequest/);
});

test("campaign performance calculates first-party CPL, CPA and commission-backed efficiency", () => {
  const source = read("src/lib/marketing-performance.ts");
  assert.match(source, /marketing_campaign_spend/);
  assert.match(source, /utmCampaign/);
  assert.match(source, /kampagne:%/);
  assert.match(source, /cplCents:/);
  assert.match(source, /cpaCents:/);
  assert.match(source, /row\.spend_cents \/ row\.leads/);
  assert.match(source, /row\.spend_cents \/ row\.completed/);
  assert.match(source, /commission_events/);
  assert.match(source, /confirmed_commission_cents/);
  assert.match(source, /paid_commission_cents/);
  assert.match(source, /confirmedEfficiency/);
});

test("campaign cockpit exposes spend, acquisition cost and clearly labeled provider commission efficiency", () => {
  const page = read("src/app/portal/(app)/kampagnen/page.tsx");
  const cockpit = read("src/components/portal/CampaignCockpit.tsx");
  assert.match(page, /getMarketingCampaignPerformance/);
  assert.match(cockpit, /Werbekosten erfassen/);
  assert.match(cockpit, /CPL/);
  assert.match(cockpit, /CPA/);
  assert.match(cockpit, /Prov\. bestätigt/);
  assert.match(cockpit, /Prov\.\/Spend/);
  assert.match(cockpit, /keine Umsatz- oder Gewinnkennzahl/);
  assert.match(cockpit, /Nur tatsächlich gebuchte Kosten eintragen/);
  assert.doesNotMatch(cockpit, /ROAS|Umsatzgarantie|garantiert/i);
});
