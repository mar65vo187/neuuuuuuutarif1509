import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("brand SEO uses one stable TarifWerk identity", () => {
  const siteLayout = read("src/app/(site)/layout.tsx");
  const rootLayout = read("src/app/layout.tsx");
  const manifest = read("src/app/manifest.ts");
  const env = read(".env.example");

  assert.match(siteLayout, /alternateName: \["TarifWerk\.eu", "Tarif Werk"\]/);
  assert.match(siteLayout, /favicon\.svg/);
  assert.match(siteLayout, /width: 260/);
  assert.match(siteLayout, /height: 260/);
  assert.match(rootLayout, /GOOGLE_SITE_VERIFICATION/);
  assert.match(manifest, /short_name: "TarifWerk"/);
  assert.match(env, /GOOGLE_SITE_VERIFICATION=/);
});

test("campaign system has dedicated landing pages and CRM attribution", () => {
  const campaigns = read("src/lib/marketing-campaigns.ts");
  const page = read("src/app/kampagne/[slug]/page.tsx");
  const enterprise = read("src/lib/enterprise.ts");
  const reporting = read("src/app/portal/(app)/reporting/page.tsx");
  const sitemap = read("src/app/sitemap.ts");

  for (const slug of [
    "tarifcheck",
    "energie-check",
    "solar-check",
    "versicherungs-check",
    "immobilien-check",
    "klima-check",
    "business-connect",
    "business-energie",
    "business-check",
  ]) {
    assert.match(campaigns, new RegExp('slug: "' + slug + '"'));
  }
  for (const topic of ["Internet, Mobilfunk, TV", "Strom & Gas", "Versicherungen", "Solar (Photovoltaik) & Wärmepumpe", "Immobilien", "Klimaanlagen"]) {
    assert.ok(campaigns.includes('topic: "' + topic + '"'), "missing campaign topic: " + topic);
  }
  for (const situation of ["bestand", "vergleich", "konkret"]) {
    assert.ok(campaigns.includes('situation: "' + situation + '"'), "missing campaign situation: " + situation);
  }
  assert.match(page, /campaign\.slug/);
  assert.match(page, /source=/);
  assert.match(page, /robots:\s*\{ index: false, follow: false \}/);
  assert.match(enterprise, /attributionSourceRows/);
  assert.match(enterprise, /attributionCampaignRows/);
  assert.match(reporting, /Kampagnen-Funnel/);
  assert.match(reporting, /Akquise nach Quelle/);
  assert.doesNotMatch(sitemap, /\/kampagne\//);
});

test("campaign cockpit exposes deterministic channel links and attribution workflow", () => {
  const cockpit = read("src/components/portal/CampaignCockpit.tsx");
  const page = read("src/app/portal/(app)/kampagnen/page.tsx");
  const shell = read("src/components/portal/PortalShell.tsx");
  const help = read("src/lib/portal-help.ts");

  assert.match(cockpit, /utm_source/);
  assert.match(cockpit, /utm_medium/);
  assert.match(cockpit, /utm_campaign/);
  assert.match(cockpit, /utm_content/);
  assert.doesNotMatch(cockpit, /window\.location\.origin/);
  assert.match(page, /REPORT_SALES/);
  assert.match(page, /origin=\{SITE\.url\}/);
  assert.match(shell, /\/portal\/kampagnen/);
  assert.match(help, /Paid-Traffic-Landingpages/);
});

test("uploaded people images are editable and normalized to one square size", () => {
  const editor = read("src/components/portal/ImageCropEditor.tsx");
  const users = read("src/components/portal/UserManagement.tsx");
  const advisorRoute = read("src/app/api/portal/admin/advisors/[id]/image/route.ts");
  const employeeRoute = read("src/app/api/portal/admin/users/[id]/image/route.ts");

  assert.match(editor, /const OUTPUT_SIZE = 1200/);
  assert.match(editor, /canvas\.toBlob/);
  assert.match(editor, /image\/webp/);
  assert.match(users, /ImageCropEditor/);
  assert.match(users, /1200 × 1200 px/);
  for (const route of [advisorRoute, employeeRoute]) {
    assert.match(route, /width: 1200, height: 1200, fit: "cover"/);
    assert.match(route, /\.webp\(/);
  }
});

test("Step 4 automations stay internal and require explicit activation", () => {
  const templates = read("src/lib/automation-templates.ts");
  const validation = read("src/lib/enterprise-validation.ts");
  const manager = read("src/components/portal/SystemManager.tsx");
  const activation = read("src/app/api/portal/admin/enterprise/automations/[id]/route.ts");

  assert.match(templates, /type: "task"/);
  assert.match(templates, /type: "notification"/);
  assert.doesNotMatch(templates, /send_email|send_whatsapp|contract_change|payment/i);
  assert.match(validation, /active: z\.boolean\(\)\.default\(false\)/);
  assert.match(validation, /automationTaskActionSchema/);
  assert.match(validation, /automationNotificationActionSchema/);
  assert.match(manager, /Human Approval/);
  assert.match(manager, /Als Entwurf anlegen/);
  assert.match(activation, /automation\.activated/);
  assert.match(activation, /automation\.deactivated/);
});
