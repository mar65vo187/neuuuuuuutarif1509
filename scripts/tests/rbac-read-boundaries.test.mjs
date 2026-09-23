import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { loadTs } from "./helpers/load-ts.mjs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

function assertBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  assert.ok(firstIndex >= 0, message + " · missing first marker");
  assert.ok(secondIndex >= 0, message + " · missing second marker");
  assert.ok(firstIndex < secondIndex, message + " · authorization must run before data access");
}

test("lead workspaces reject missing permission before reading CRM data", async () => {
  const content = loadTs("src/lib/content.ts");
  for (const path of ["leads/page.tsx", "leads/[id]/page.tsx", "leads/pipeline/page.tsx"]) {
    let reads = 0;
    const rejectRead = () => { reads++; throw new Error("Unauthorized data read"); };
    const dependencies = {
      "next/link": {}, "lucide-react": {}, "drizzle-orm": {},
      "next/navigation": { redirect: url => { throw new Error(`Redirect: ${url}`); } },
      "@/lib/auth": { getCurrentUser: async () => ({ id: 7, role: "berater" }) },
      "@/lib/enterprise-access": {
        PORTAL_PERMISSION: { LEAD_EDIT: "lead.edit", LEAD_ASSIGN: "lead.assign", ORDER_CREATE: "order.create" },
        permissionSnapshot: async () => ({ "lead.edit": false, "lead.assign": true, "order.create": true }),
        listLeadAssignableEmployees: rejectRead,
      },
      "@/lib/content": content,
      "@/lib/queries": new Proxy({}, { get: () => rejectRead }),
      "@/db": { db: { select: rejectRead } }, "@/db/schema": {},
      "@/lib/portal-productivity": { listSavedViews: rejectRead },
      "@/lib/lead-intelligence": {}, "@/lib/call-intelligence": {},
      "@/lib/portal-date-time": { formatBerlinDateTimeInput: () => "" },
      ...Object.fromEntries(["ui", "LeadBulkList", "SavedViewsBar", "LeadActions", "LeadProductManager", "LeadPipelineBoard"].map(name => [`@/components/portal/${name}`, {}])),
    };
    const Page = loadTs(`src/app/portal/(app)/${path}`, dependencies).default;
    await assert.rejects(Page({ searchParams: Promise.resolve({}), params: Promise.resolve({ id: "42" }) }), /Redirect: \/portal$/);
    assert.equal(reads, 0, `${path} must not access CRM data before permission checks`);
  }
});

test("customer workspaces enforce read or edit permission before customer queries", () => {
  const list = read("src/app/portal/(app)/kunden/page.tsx");
  const detail = read("src/app/portal/(app)/kunden/[id]/page.tsx");
  assert.match(list, /PORTAL_PERMISSION\.CUSTOMER_READ/);
  assert.match(list, /const canRead = capabilities\[PORTAL_PERMISSION\.CUSTOMER_READ\] \|\| canEdit/);
  assertBefore(list, 'if (!canRead) redirect("/portal")', "listCustomers(", "customer list");
  assertBefore(detail, 'if (!canRead) redirect("/portal")', "getCustomer360(id, user)", "customer detail");
});

test("order workspaces enforce read access and read-only UI disables mutation controls", () => {
  const list = read("src/app/portal/(app)/auftraege/page.tsx");
  const detail = read("src/app/portal/(app)/auftraege/[id]/page.tsx");
  const bulk = read("src/components/portal/OrderBulkList.tsx");
  const exportRoute = read("src/app/api/portal/enterprise/export/route.ts");
  assert.match(list, /PORTAL_PERMISSION\.ORDER_READ/);
  assertBefore(list, 'if (!canRead) redirect("/portal")', "listOrders(", "order list");
  assertBefore(detail, 'if (!canRead) redirect("/portal")', "getOrder(id, user)", "order detail");
  assert.match(bulk, /canEdit: boolean/);
  assert.match(bulk, /Nur Leserechte · Änderungen sind für diese Rolle deaktiviert/);
  assert.match(exportRoute, /hasPermission\(user, "order\.read"\) \|\| await hasPermission\(user, "order\.edit"\)/);
});

test("task workspace and task entity enrichment respect granted rights", () => {
  const page = read("src/app/portal/(app)/aufgaben/page.tsx");
  const enterprise = read("src/lib/enterprise.ts");
  const list = read("src/components/portal/TaskBulkList.tsx");
  assertBefore(page, "PORTAL_PERMISSION.TASK_MANAGE", "listTasks(", "task page");
  assert.match(enterprise, /canLead && leadIds\.length/);
  assert.match(enterprise, /canCustomer && customerIds\.length/);
  assert.match(enterprise, /canOrder && orderIds\.length/);
  assert.match(enterprise, /canService && serviceCaseIds\.length/);
  assert.match(enterprise, /entityHref/);
  assert.match(list, /task\.entityHref \|\| "\/portal\/aufgaben"/);
});

test("global search never queries protected CRM domains without their permission", () => {
  const search = read("src/app/api/portal/search/route.ts");
  assert.match(search, /permissionSnapshot/);
  assert.match(search, /const canLead = capabilities\[PORTAL_PERMISSION\.LEAD_EDIT\]/);
  assert.match(search, /canCustomer \? listCustomers\(user, q, 7\) : Promise\.resolve\(\[\]\)/);
  assert.match(search, /canOrder \? listOrders\(user, \{ search: q \}, 7\) : Promise\.resolve\(\[\]\)/);
  assert.match(search, /canTask \? db\.select/);
  assert.match(search, /canService \? listServiceCases/);
});

test("service workspace and navigation are permission-gated before case reads", () => {
  const page = read("src/app/portal/(app)/service/page.tsx");
  const shell = read("src/components/portal/PortalShell.tsx");
  const palette = read("src/components/portal/PortalCommandPalette.tsx");
  assert.match(page, /PORTAL_PERMISSION\.SERVICE_READ/);
  assert.match(page, /PORTAL_PERMISSION\.SERVICE_EDIT/);
  assert.match(page, /PORTAL_PERMISSION\.SERVICE_ASSIGN/);
  assertBefore(page, 'redirect("\/portal")', "listServiceCases(", "service list");
  assert.match(shell, /href: "\/portal\/service".*anyPermission: \["service\.read", "service\.edit", "service\.assign"\]/);
  assert.match(palette, /can\("service\.read", "service\.edit", "service\.assign"\)/);
});

test("reporting enforces sales or finance permission before enterprise report reads", () => {
  const page = read("src/app/portal/(app)/reporting/page.tsx");
  const enterprise = read("src/lib/enterprise.ts");

  assert.match(page, /PORTAL_PERMISSION\.REPORT_SALES/);
  assert.match(page, /PORTAL_PERMISSION\.REPORT_FINANCE/);
  assert.match(page, /if \(!canReport\) redirect\("\/portal"\)/);
  assertBefore(page, 'if (!canReport) redirect("/portal")', "getEnterpriseReport(user, days)", "reporting page");
  assert.match(enterprise, /Keine Berechtigung für Reporting/);
  assertBefore(enterprise, "reportPermissions = await permissionSnapshot", "const boundedDays", "enterprise reporting");
});

test("audit compliance workspace is permissioned, filterable and paginated", () => {
  const page = read("src/app/portal/(app)/audit/page.tsx");
  const enterprise = read("src/lib/enterprise.ts");
  const shell = read("src/components/portal/PortalShell.tsx");
  assert.match(page, /hasPermission\(user, PORTAL_PERMISSION\.AUDIT_READ\)/);
  assert.match(page, /lookahead: true/);
  assert.match(page, /aria-label="Audit-Seiten"/);
  assert.match(page, /Änderungssatz anzeigen/);
  assert.match(enterprise, /export async function listAuditEvents\(limit = 100, filter\?:/);
  assert.match(enterprise, /\.orderBy\(desc\(auditEvents\.createdAt\), desc\(auditEvents\.id\)\)/);
  assert.match(enterprise, /\.offset\(offset\)/);
  assert.match(shell, /href: "\/portal\/audit", label: "Audit & Compliance".*anyPermission: \["audit\.read"\]/);
});

test("navigation and command palette hide inaccessible operational areas", () => {
  const shell = read("src/components/portal/PortalShell.tsx");
  const palette = read("src/components/portal/PortalCommandPalette.tsx");
  assert.match(shell, /href: "\/portal\/leads".*anyPermission: \["lead\.edit"\]/);
  assert.match(shell, /href: "\/portal\/aufgaben".*anyPermission: \["task\.manage"\]/);
  assert.match(shell, /href: "\/portal\/auftraege".*anyPermission: \["order\.read", "order\.edit"\]/);
  assert.match(palette, /can\("task\.manage"\)/);
  assert.match(palette, /can\("audit\.read"\)/);
});


test("order.cancel is enforced independently from order.edit", () => {
  const single = read("src/app/api/portal/enterprise/orders/[id]/route.ts");
  const bulk = read("src/app/api/portal/enterprise/bulk/route.ts");
  const detail = read("src/app/portal/(app)/auftraege/[id]/page.tsx");
  const actions = read("src/components/portal/OrderActions.tsx");
  const bulkList = read("src/components/portal/OrderBulkList.tsx");
  assert.match(single, /PORTAL_PERMISSION\.ORDER_CANCEL/);
  assert.match(single, /\["cancelled", "storno"\]\.includes\(parsed\.data\.status\)/);
  assert.match(bulk, /\["cancelled", "storno"\]\.includes\(value\).*PORTAL_PERMISSION\.ORDER_CANCEL/s);
  assert.match(detail, /const canCancel = capabilities\[PORTAL_PERMISSION\.ORDER_CANCEL\]/);
  assert.match(actions, /visibleStatuses = canCancel/);
  assert.match(bulkList, /availableStatusOptions = canCancel/);
});
