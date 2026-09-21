import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("lead list uses bounded server-side pagination instead of a fixed 300-row workspace", () => {
  const queries = read("../../src/lib/queries.ts");
  const page = read("../../src/app/portal/(app)/leads/page.tsx");
  assert.match(queries, /pageSize\?: number/);
  assert.match(queries, /\.limit\(pageSize\)\.offset\(offset\)/);
  assert.match(page, /pageSize: pageSize \+ 1/);
  assert.match(page, /aria-label="Lead-Seiten"/);
  assert.match(page, /Seite \{page\}/);
});

test("quick called action no longer claims that the lead was reached", () => {
  const pipeline = read("../../src/components/portal/LeadPipelineBoard.tsx");
  assert.match(pipeline, /patch\(row, \{ status: "kontaktiert" \}\)/);
  assert.doesNotMatch(pipeline, /status: "kontaktiert", contactOutcome: "reached"/);
});

test("closed leads cannot create or keep automatic callback tasks", () => {
  const calls = read("../../src/app/api/portal/leads/[id]/calls/route.ts");
  assert.match(calls, /const closedLead = \["abgeschlossen", "verloren"\]\.includes\(lead\.status\)/);
  assert.match(calls, /const shouldSchedule = !closedLead &&/);
  assert.match(calls, /const stopAutoFollowUp = closedLead \|\|/);
});

test("mobile portal navigation exposes labeled destinations", () => {
  const shell = read("../../src/components/portal/PortalShell.tsx");
  assert.match(shell, /mobileNavOpen/);
  assert.match(shell, />Menü<\/span>/);
  assert.match(shell, /Bereich direkt öffnen/);
  assert.match(shell, /onClick=\{\(\) => setMobileNavOpen\(false\)\}/);
});
