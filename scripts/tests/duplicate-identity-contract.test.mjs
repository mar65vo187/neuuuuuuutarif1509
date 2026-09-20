import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("identity search respects admin/global and employee/own visibility", () => {
  const route = read("src/app/api/portal/identity-search/route.ts");
  assert.match(route, /leadAccessCondition\(user\)/);
  assert.match(route, /user\.role === "admin"\s*\? sql`true`\s*:\s*eq\(customers\.ownerEmployeeId, user\.id\)/);
  assert.match(route, /scope: user\.role === "admin" \? "global" : "own"/);
  assert.match(route, /team_members/);
  assert.match(route, /teams t/);
});

test("strong duplicate guard locks normalized e-mail and phone identities", () => {
  const source = read("src/lib/contact-identity.ts");
  assert.match(source, /contact:email:/);
  assert.match(source, /contact:phone:/);
  assert.match(source, /pg_advisory_xact_lock\(hashtext/);
  assert.match(source, /regexp_replace/);
  assert.match(source, /status: 409/);
});

test("manual lead customer and referral creation use the strong guard", () => {
  const leadRoute = read("src/app/api/portal/leads/route.ts");
  const enterprise = read("src/lib/enterprise.ts");
  assert.match(leadRoute, /lockAndFindStrongContactDuplicate/);
  assert.match(leadRoute, /contactDuplicateError/);

  const createCustomerStart = enterprise.indexOf("export async function createCustomer(");
  const createReferralStart = enterprise.indexOf("export async function createCustomerReferral(");
  assert.ok(createCustomerStart >= 0);
  assert.ok(createReferralStart > createCustomerStart);
  assert.match(enterprise.slice(createCustomerStart, createReferralStart), /lockAndFindStrongContactDuplicate/);
  assert.match(enterprise.slice(createReferralStart, createReferralStart + 7000), /lockAndFindStrongContactDuplicate/);
});

test("creation forms expose the permission-aware live duplicate checker", () => {
  const leadForm = read("src/components/portal/LeadCreateForm.tsx");
  const customerForm = read("src/components/portal/CustomerCreateForm.tsx");
  const checker = read("src/components/portal/DuplicateIdentityCheck.tsx");
  assert.match(leadForm, /DuplicateIdentityCheck/);
  assert.match(customerForm, /DuplicateIdentityCheck/);
  assert.match(checker, /Admin-Sicht: Treffer aus allen Teams/);
  assert.match(checker, /ausschließlich deine eigenen Leads und Kunden/);
  assert.match(checker, /Exakter Kontakt/);
});

test("identity autocomplete has scalable search indexes", () => {
  const migration = read("migrations/0016_duplicate_identity_search.sql");
  assert.match(migration, /CREATE EXTENSION IF NOT EXISTS pg_trgm/);
  assert.match(migration, /leads_name_trgm_idx/);
  assert.match(migration, /customers_company_trgm_idx/);
  assert.match(migration, /customers_phone_normalized_idx/);
});
