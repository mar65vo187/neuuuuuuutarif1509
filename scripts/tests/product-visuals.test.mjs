import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const content = readFileSync("src/lib/content.ts", "utf8");
const productHub = readFileSync("src/components/portal/ProductHubDashboard.tsx", "utf8");
const productVisuals = readFileSync("src/lib/product-visuals.ts", "utf8");
const audienceSections = readFileSync("src/components/home/AudienceSections.tsx", "utf8");
const nextConfig = readFileSync("next.config.ts", "utf8");
const security = readFileSync("src/lib/security.ts", "utf8");

test("all public service areas have a visual", () => {
  for (const key of ["internet", "energie", "versicherungen", "sicherheit", "klima", "solar", "edelmetalle", "immobilien"]) {
    assert.match(content, new RegExp(`\\b${key}: \\{`), `missing SERVICE_IMAGES entry for ${key}`);
  }
});

test("product hub uses contextual visuals and data completeness", () => {
  assert.match(productHub, /import Image from "next\/image"/);
  assert.match(productHub, /getProductVisual/);
  assert.match(productHub, /productKnowledgeScore/);
  assert.match(productHub, /Produktdaten komplett/);
  assert.match(productHub, /Datenstand/);
  assert.match(productHub, /Auftrag starten/);
});

test("visual catalog covers all TarifWerk product families", () => {
  for (const marker of ["mobilfunk", "energie", "versicherung", "sicherheit", "klima", "photovoltaik", "gold", "immobilien"]) {
    assert.match(productVisuals, new RegExp(marker, "i"), `missing visual rule for ${marker}`);
  }
  assert.match(audienceSections, /SERVICE_IMAGES\[service\.key\]/);
});

test("remote visual host is allowed by Next and CSP", () => {
  assert.match(nextConfig, /images\.pexels\.com/);
  assert.match(security, /images\.pexels\.com/);
});

test("daily CRM product workflows reuse the visual catalog", () => {
  for (const path of [
    "src/components/portal/OrderCreateForm.tsx",
    "src/components/portal/LeadProductManager.tsx",
    "src/components/portal/LeadCreateForm.tsx",
  ]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /getProductVisual/);
    assert.match(source, /next\/image/);
  }
});

test("product-specific image overrides are persisted and validated", () => {
  const dbSchema = readFileSync("src/db/enterprise-schema.ts", "utf8");
  const validation = readFileSync("src/lib/product-hub-validation.ts", "utf8");
  const api = readFileSync("src/app/api/portal/admin/catalog/route.ts", "utf8");
  const migration = readFileSync("migrations/0021_product_catalog_images.sql", "utf8");

  assert.match(dbSchema, /imageUrl: text\("image_url"\)/);
  assert.match(validation, /images\\\.pexels\\\.com/);
  assert.match(api, /imageUrl: parsed\.data\.imageUrl/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS image_url text/);
});
