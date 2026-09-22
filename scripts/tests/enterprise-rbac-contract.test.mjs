import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("enterprise role assignments override the legacy advisor baseline", () => {
  const source = read("src/lib/enterprise-access.ts");
  assert.match(source, /assignments\.length === 0\) return new Set\(LEGACY_ADVISOR_DEFAULTS\)/);
  assert.match(source, /return new Set\(rows\.map\(\(row\) => row\.key\)\)/);
  assert.match(source, /if \(code === "42P01"\) return new Set\(LEGACY_ADVISOR_DEFAULTS\)/);
  assert.match(source, /return new Set\(\);/);
});

test("lead mutation routes require lead.edit permission", () => {
  const paths = [
    "src/app/api/portal/leads/route.ts",
    "src/app/api/portal/leads/[id]/route.ts",
    "src/app/api/portal/leads/[id]/calls/route.ts",
    "src/app/api/portal/leads/[id]/products/route.ts",
  ];
  for (const path of paths) {
    const source = read(path);
    assert.match(source, /requirePermission/);
    assert.match(source, /PORTAL_PERMISSION\.LEAD_EDIT/);
  }
});

test("bulk mutations enforce entity-specific permissions", () => {
  const source = read("src/app/api/portal/enterprise/bulk/route.ts");
  assert.match(source, /PORTAL_PERMISSION\.LEAD_EDIT/);
  assert.match(source, /PORTAL_PERMISSION\.LEAD_ASSIGN/);
  assert.match(source, /PORTAL_PERMISSION\.ORDER_EDIT/);
  assert.match(source, /PORTAL_PERMISSION\.TASK_MANAGE/);
  assert.match(source, /PORTAL_PERMISSION\.CUSTOMER_EDIT/);
});

test("direct create pages are permission guarded", () => {
  const expectations = [
    ["src/app/portal/(app)/leads/neu/page.tsx", "PORTAL_PERMISSION.LEAD_EDIT"],
    ["src/app/portal/(app)/kunden/neu/page.tsx", "PORTAL_PERMISSION.CUSTOMER_EDIT"],
    ["src/app/portal/(app)/auftraege/neu/page.tsx", "PORTAL_PERMISSION.ORDER_CREATE"],
  ];
  for (const [path, permission] of expectations) {
    const source = read(path);
    assert.ok(source.includes(permission), path + " must check " + permission);
    assert.match(source, /hasPermission/);
  }
});
