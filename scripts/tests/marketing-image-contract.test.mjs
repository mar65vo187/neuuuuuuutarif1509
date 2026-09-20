import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("TarifWerk brand schema uses a stable square search asset", () => {
  const siteLayout = read("src/app/(site)/layout.tsx");
  assert.match(siteLayout, /alternateName:\s*\["TarifWerk\.eu", "Tarif Werk"\]/);
  assert.match(siteLayout, /url:\s*`\$\{SITE\.url\}\/favicon\.svg`/);
  assert.match(siteLayout, /width:\s*260/);
  assert.match(siteLayout, /height:\s*260/);
  assert.match(siteLayout, /"@type": "PostalAddress"/);
  assert.match(siteLayout, /streetAddress: businessAddress\.streetAddress/);
  assert.match(siteLayout, /postalCode/);
});

test("profile image pipeline is editable and normalized to one size", () => {
  const editor = read("src/components/portal/ImageCropEditor.tsx");
  const advisorRoute = read("src/app/api/portal/admin/advisors/[id]/image/route.ts");
  const employeeRoute = read("src/app/api/portal/admin/users/[id]/image/route.ts");

  assert.match(editor, /OUTPUT_SIZE = 1200/);
  assert.match(editor, /type="range"/);
  assert.match(editor, /image\/webp/);
  for (const route of [advisorRoute, employeeRoute]) {
    assert.match(route, /width:\s*1200, height:\s*1200, fit:\s*"cover"/);
  }
});

test("campaign landing pages are ad-focused and excluded from organic indexing", () => {
  const campaigns = read("src/lib/marketing-campaigns.ts");
  const page = read("src/app/kampagne/[slug]/page.tsx");

  assert.match(campaigns, /slug: "tarifcheck"/);
  assert.match(campaigns, /slug: "business-check"/);
  assert.match(page, /robots:\s*\{ index: false, follow: false \}/);
  assert.match(page, /source=\{\`kampagne:\$\{campaign\.slug\}\`\}/);
});

test("step 4 starts with explainable human-approved recommendations", () => {
  const assistant = read("src/app/portal/(app)/assistent/page.tsx");
  assert.match(assistant, /Human approval aktiv/);
  assert.match(assistant, /Automatische Änderungen/);
  assert.match(assistant, /Warum\?/);
  assert.match(assistant, /getCommandCenterData/);
});
