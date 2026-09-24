import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const migration = read("../../migrations/0023_optimization_membership_hub.sql");
const schema = read("../../src/db/enterprise-schema.ts");
const shared = read("../../src/lib/optimization-shared.ts");
const hub = read("../../src/lib/optimization-hub.ts");
const api = read("../../src/app/api/portal/optimization/route.ts");
const upload = read("../../src/app/api/portal/optimization/documents/route.ts");
const download = read("../../src/app/api/portal/optimization/documents/[id]/route.ts");
const dashboard = read("../../src/components/portal/OptimizationHubDashboard.tsx");
const portalPage = read("../../src/app/portal/(app)/optimierung/page.tsx");
const portalShell = read("../../src/components/portal/PortalShell.tsx");
const customerPage = read("../../src/app/portal/(app)/kunden/[id]/page.tsx");
const sweep = read("../../src/lib/operations-sweep.ts");
const publicPage = read("../../src/app/(site)/optimierungsservice/page.tsx");
const seo = read("../../src/lib/seo.ts");
const sitemap = read("../../src/app/sitemap.ts");

test("optimization service persists the complete recurring-customer lifecycle", () => {
  for (const table of [
    "optimization_memberships",
    "optimization_goals",
    "optimization_contracts",
    "optimization_offers",
    "optimization_documents",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(schema, new RegExp(table));
  }
  assert.match(migration, /monthly_price_cents integer NOT NULL DEFAULT 199/);
  assert.match(migration, /optimization_memberships_customer_unique/);
  assert.match(migration, /optimization_contracts_notice_idx/);
  assert.match(migration, /position BETWEEN 1 AND 3/);
  assert.match(migration, /optimization_offers_goal_position_open_unique/);\n  assert.match(migration, /optimization_offers_goal_accepted_unique/);
});

test("1.99 euro price is a server-side invariant and billing is not faked", () => {
  assert.match(shared, /OPTIMIZATION_MEMBERSHIP_PRICE_CENTS = 199/);
  assert.match(shared, /OPTIMIZATION_PLAN_CODE = "optimize_199"/);
  assert.match(hub, /monthlyPriceCents: OPTIMIZATION_MEMBERSHIP_PRICE_CENTS/);
  assert.match(hub, /planCode: OPTIMIZATION_PLAN_CODE/);
  assert.match(dashboard, /Eine echte Abbuchung findet erst statt/);
  assert.match(publicPage, /Eine Anfrage allein löst keine Abbuchung aus/);
});

test("optimization writes stay authenticated, same-origin and customer-scoped", () => {
  assert.match(api, /isSameOriginRequest\(request\)/);
  assert.match(api, /requirePermission\(user, PORTAL_PERMISSION\.CUSTOMER_EDIT\)/);
  assert.match(hub, /eq\(customers\.ownerEmployeeId, user\.id\)/);
  assert.match(portalPage, /CUSTOMER_READ/);
  assert.match(portalPage, /CUSTOMER_EDIT/);
});

test("document storage has explicit type, size and download safeguards", () => {
  assert.match(hub, /MAX_DOCUMENT_BYTES = 8 \* 1024 \* 1024/);
  assert.match(hub, /application\/pdf/);
  assert.match(hub, /image\/jpeg/);
  assert.match(hub, /createHash\("sha256"\)/);
  assert.match(hub, /matchesDocumentSignature/);
  assert.match(upload, /requirePermission\(user, PORTAL_PERMISSION\.CUSTOMER_EDIT\)/);
  assert.match(download, /Cache-Control": "private, no-store, max-age=0"/);
  assert.match(download, /X-Content-Type-Options": "nosniff"/);
});

test("client cockpit keeps the Next.js server boundary clean", () => {
  assert.match(dashboard, /^"use client";/);
  assert.doesNotMatch(dashboard, /@\/lib\/optimization-hub/);
  assert.match(dashboard, /@\/lib\/optimization-shared/);
  assert.doesNotMatch(dashboard, /node:crypto|@\/db/);
});

test("optimization service is connected to daily CRM workflows", () => {
  assert.match(portalShell, /\/portal\/optimierung/);
  assert.match(customerPage, /\/portal\/optimierung\?customer=/);
  assert.match(sweep, /optimization_review_due/);
  assert.match(sweep, /optimization_contract_review/);
  assert.match(sweep, /interval '30 days'/);
  assert.match(sweep, /NOT EXISTS \([\s\S]*optimization_review_due/);
});

test("public acquisition path is discoverable and indexed deliberately", () => {
  assert.match(publicPage, /TarifWerk Optimierungsservice/);
  assert.match(publicPage, /1,99 €/);
  assert.match(publicPage, /pageMetadata\("\/optimierungsservice"\)/);
  assert.match(seo, /"\/optimierungsservice"/);
  assert.match(sitemap, /\/optimierungsservice/);
});
