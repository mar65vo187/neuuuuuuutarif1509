import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("operations hub only returns teams visible to the signed-in employee", () => {
  const source = read("src/lib/operations-hub.ts");
  assert.match(source, /const visibleTeamIds = new Set/);
  assert.match(source, /team\.leadEmployeeId === user\.id/);
  assert.match(source, /member\.teamId === team\.id && member\.employeeId === user\.id/);
  assert.match(source, /const visibleTeamRows = teamRows\.filter/);
  assert.match(source, /const visibleMemberRows = memberRows\.filter/);
  assert.match(source, /teams: visibleTeamRows\.map\(\(team\) => \(\{ \.\.\.team, members: visibleMemberRows\.filter/);
  assert.match(source, /const employeeRowsForAudience = admin\s*\?/);
});

test("compensation supports permission-checked self, team and all scopes", () => {
  const source = read("src/lib/compensation.ts");
  assert.match(source, /export type CompensationScope = "auto" \| "self" \| "team" \| "all"/);
  assert.match(source, /PORTAL_PERMISSION\.COMMISSION_READ_TEAM/);
  assert.match(source, /PORTAL_PERMISSION\.COMMISSION_READ_ALL/);
  assert.match(source, /scope === "team"/);
  assert.match(source, /eq\(teams\.leadEmployeeId, user\.id\)/);
  assert.match(source, /eq\(teamMembers\.employeeId, user\.id\)/);
  assert.match(source, /inArray\(teamMembers\.teamId, teamIds\)/);
  assert.match(source, /inArray\(employees\.id, visibleEmployeeIds\)/);
});

test("finance page honors team commission access and aggregates only its resolved scope", () => {
  const source = read("src/app/portal/(app)/finanzen/page.tsx");
  assert.match(source, /PORTAL_PERMISSION\.COMMISSION_READ_TEAM/);
  assert.match(source, /const scope = owner \|\| canReadAll \? "all" : canReadTeam \? "team" : "self"/);
  assert.match(source, /getCompensationRows\(user, scope\)/);
  assert.match(source, /compensationRows\.reduce\(\(sum, row\) => sum \+ row\.employeeExpected, 0\)/);
  assert.match(source, /Freigegebene Team-Sicht/);
  assert.match(source, /scope !== "self"/);
  assert.match(source, /Provisionen nach Mitarbeitenden/);
  assert.match(source, /compensationRows\.map\(\(row\) =>/);
});

test("finance navigation is driven by commission visibility, not reporting alone", () => {
  const source = read("src/components/portal/PortalShell.tsx");
  const marker = source.match(/\{ href: "\/portal\/finanzen"[^\n]+\}/)?.[0] ?? "";
  assert.match(marker, /commission\.read\.self/);
  assert.match(marker, /commission\.read\.team/);
  assert.match(marker, /commission\.read\.all/);
  assert.doesNotMatch(marker, /report\.finance/);
});
