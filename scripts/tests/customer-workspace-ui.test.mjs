import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as icons from "lucide-react";
import { loadTs } from "./helpers/load-ts.mjs";

const Link = ({ children, ...props }) => createElement("a", props, children);
const PORTAL_PERMISSION = { CUSTOMER_READ: "read", CUSTOMER_EDIT: "edit", CUSTOMER_EXPORT: "export", ORDER_CREATE: "create" };
const common = {
  "next/link": { default: Link },
  "next/navigation": { redirect: () => { throw new Error("redirect"); }, notFound: () => { throw new Error("not found"); } },
  "lucide-react": icons,
  "@/lib/auth": { getCurrentUser: async () => ({ id: 1 }) },
  "@/lib/enterprise-access": { PORTAL_PERMISSION, permissionSnapshot: async () => ({ read: true }) },
  "@/components/portal/ui": { Card: ({ children }) => createElement("div", null, children), formatDate: () => "Heute" },
};

test("customer search tolerates repeated parameters and keeps search when switching focus", async () => {
  let query;
  const { default: Page } = loadTs("src/app/portal/(app)/kunden/page.tsx", {
    ...common,
    "@/lib/enterprise": { listCustomers: async (...args) => { query = args; return []; } },
    "@/lib/portal-productivity": { listSavedViews: async () => [] },
    "@/components/portal/CustomerBulkList": { CustomerBulkList: () => null },
    "@/components/portal/SavedViewsBar": { SavedViewsBar: () => createElement("span", null, "Gespeicherte Ansichten") },
  });
  let html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ q: ["a", "b"], focus: ["risk"], page: ["2"] }) }));
  assert.equal(query[1], undefined);
  assert.equal(query[3].page, 1);
  assert.match(html, /Gespeicherte Ansichten/);
  html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ q: "Müller", focus: "risk", page: "2" }) }));
  assert.match(html, /href="\/portal\/kunden\?q=M%C3%BCller&amp;focus=review"/);
  assert.match(html, /href="\/portal\/kunden\?q=M%C3%BCller"/);
  assert.match(html, /for="customer-search"/);
  assert.match(html, /type="submit"/);
});

test("customer detail omits denied order/task metrics and sections instead of presenting zero data", async () => {
  const data = {
    customer: { id: 1, customerNumber: "K1", firstName: "Test", tags: [], type: "private" },
    capabilities: { canLead: false, canOrder: false, canTask: false },
    serviceCases: [], referrals: [], opportunities: [], orders: [], timeline: [], availableProducts: [],
    intelligence: { tone: "normal", nextBestAction: { label: "Kontakt", detail: "Prüfen" }, completeness: 50, summary: { activeOrders: 0, openOpportunities: 0, activities: 0, referrals: 0, overdueTasks: 0 }, retention: { status: "ok", label: "Review" }, missing: [], riskFlags: [], coverage: { crossSellSignals: [], activeCategories: [] } },
  };
  const { default: Page } = loadTs("src/app/portal/(app)/kunden/[id]/page.tsx", {
    ...common,
    "@/lib/enterprise": { getCustomer360: async () => data },
    "@/components/portal/CustomerReferralManager": { CustomerReferralManager: () => null },
    "@/components/portal/CustomerEditForm": { CustomerEditForm: () => null },
    "@/components/portal/Customer360Manager": { Customer360Manager: () => null },
    "@/components/portal/CustomerPrivacyPanel": { CustomerPrivacyPanel: () => null },
    "@/lib/privacy-center": { CONSENT_PURPOSE_LABELS: {}, CONSENT_SOURCE_LABELS: {}, getConsentStates: async () => [], getErasureBlockers: async () => [] },
  });
  const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ id: "1" }) }));
  assert.doesNotMatch(html, /Aufträge aktiv|Überfällige Aufgaben|Noch keine Aufträge|Bedarfsabdeckung|2 · Auftrag/);
  assert.match(html, /Kundenhistorie/);
  assert.match(html, /Zugriffsrechten/);
  data.capabilities = { canLead: true, canOrder: true, canTask: true };
  const allowedHtml = renderToStaticMarkup(await Page({ params: Promise.resolve({ id: "1" }) }));
  assert.match(allowedHtml, /Aufträge aktiv/);
  assert.match(allowedHtml, /Überfällige Aufgaben/);
  assert.match(allowedHtml, /Noch keine Aufträge/);
});
