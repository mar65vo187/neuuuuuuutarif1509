import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("lead list shows name, business context and contact details", () => {
  const list = read("src/components/portal/LeadBulkList.tsx");
  const page = read("src/app/portal/(app)/leads/page.tsx");

  assert.match(list, /lead\.name \|\| `Lead #\$\{lead\.id\}`/);
  assert.match(list, /lead\.companyName/);
  assert.match(list, /lead\.phone/);
  assert.match(list, /lead\.email/);
  assert.match(page, /phone: lead\.phone/);
  assert.match(page, /email: lead\.email/);
  assert.match(page, /companyName:/);
});

test("pipeline cards expose actionable lead context", () => {
  const board = read("src/components/portal/LeadPipelineBoard.tsx");
  const page = read("src/app/portal/(app)/leads/pipeline/page.tsx");

  assert.match(board, /row\.companyName/);
  assert.match(board, /href=\{`tel:\$\{row\.phone\}`\}/);
  assert.match(board, /href=\{`mailto:\$\{row\.email\}`\}/);
  assert.match(board, /Business/);
  assert.match(page, /email: lead\.email/);
  assert.match(page, /audience:/);
});

test("task workspace resolves accessible linked entity names instead of bare ids", () => {
  const engine = read("src/lib/enterprise.ts");
  const tasks = read("src/components/portal/TaskBulkList.tsx");

  assert.match(engine, /const leadIds =/);
  assert.match(engine, /leadAccessCondition\(user\)/);
  assert.match(engine, /customerAccess\(user\)/);
  assert.match(engine, /orderAccess\(user\)/);
  assert.match(engine, /entityTitle/);
  assert.match(engine, /entitySubtitle/);
  assert.match(tasks, /task\.entityTitle/);
  assert.match(tasks, /task\.entitySubtitle/);
});

test("all user-inserted profile photos are normalized to a single square size", () => {
  const users = read("src/components/portal/UserManagement.tsx");
  const editor = read("src/components/portal/ImageCropEditor.tsx");
  const advisorRoute = read("src/app/api/portal/admin/advisors/[id]/image/route.ts");
  const employeeRoute = read("src/app/api/portal/admin/users/[id]/image/route.ts");

  assert.match(users, /ImageCropEditor/);
  assert.match(users, /1200 × 1200 px/);
  assert.match(editor, /const OUTPUT_SIZE = 1200/);
  assert.match(editor, /canvas\.toBlob/);
  assert.match(advisorRoute, /width: 1200, height: 1200, fit: "cover"/);
  assert.match(employeeRoute, /width: 1200, height: 1200, fit: "cover"/);
});
