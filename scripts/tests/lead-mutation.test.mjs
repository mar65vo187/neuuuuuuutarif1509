import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as zod from "zod";
import { NextRequest, NextResponse } from "next/server.js";

function load(path, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, { Date, Intl, console, TextDecoder, Uint8Array })(name => {
    if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports);
  return loaded.exports;
}

const table = name => new Proxy({ tableName: name }, { get: (target, key) => key in target ? target[key] : { tableName: name, key } });
const leads = table("leads"), leadNotes = table("notes"), tasks = table("tasks"), leadCallActivities = table("calls");
const orm = {
  and: (...items) => row => items.filter(Boolean).every(item => item(row)),
  eq: (column, value) => row => row[column.key] === value,
  ne: (column, value) => row => row[column.key] !== value,
  inArray: (column, values) => row => values.includes(row[column.key]),
  count: () => ({ count: true }),
  sql: () => () => true,
};
const validation = load("src/lib/validation.ts", { zod });
const requestBody = load("src/lib/request-body.ts");
const content = load("src/lib/content.ts");
const intelligence = load("src/lib/call-intelligence.ts");
const hourAgo = () => new Date(Date.now() - 60 * 60_000);
const tomorrow = () => new Date(Date.now() + 24 * 60 * 60_000);

function harness(overrides = {}, taskRows = [], actor = { id: 7, role: "berater", name: "Testberater" }) {
  const state = {
    leads: [{ id: 42, name: "Testlead", status: "neu", createdByEmployeeId: 7, assignedEmployeeId: 7,
      priority: "normal", contactOutcome: "open", confirmedSlot: null, confirmedAt: null, closedAt: null,
      nextActionAt: null, lastContactAt: null, tags: [], ...overrides }],
    notes: [], tasks: taskRows.map(row => ({ entityType: "lead", entityId: 42, type: "crm_follow_up", ...row })), calls: [],
  };
  const audit = [];
  let locked = false, writes = 0;
  const tx = {
    select(selection) {
      let name, condition = () => true, take = Infinity;
      const rows = () => {
        const matching = state[name].filter(condition).slice(0, take);
        if (selection?.total?.count) return [{ total: matching.length }];
        return matching.map(row => ({ ...row }));
      };
      const query = {
        from(source) { name = source.tableName; return query; },
        where(value) { condition = value; return query; },
        orderBy() { return query; },
        limit(value) { take = value; return query; },
        async for(mode) { assert.equal(mode, "update"); locked = true; return rows(); },
        then(resolve, reject) { return Promise.resolve(rows()).then(resolve, reject); },
      };
      return query;
    },
    update(source) {
      return { set: patch => ({ where: async condition => {
        assert.equal(locked, true, "Mutations must follow an authorized lead row lock");
        for (const row of state[source.tableName].filter(condition)) { Object.assign(row, patch); writes++; }
      } }) };
    },
    insert(source) {
      return { values: async values => {
        assert.equal(locked, true, "Mutations must follow an authorized lead row lock");
        for (const row of Array.isArray(values) ? values : [values]) {
          state[source.tableName].push({ id: state[source.tableName].length + 100, ...row }); writes++;
        }
      } };
    },
  };
  const deps = {
    "next/server": { NextRequest, NextResponse }, "drizzle-orm": orm,
    "@/db": { db: { transaction: async work => work(tx) } },
    "@/db/schema": { leads, leadNotes }, "@/db/enterprise-schema": { tasks, leadCallActivities },
    "@/lib/auth": { getCurrentUser: async () => actor, isSameOriginRequest: () => true },
    "@/lib/content": content, "@/lib/validation": validation, "@/lib/request-body": requestBody,
    "@/lib/call-intelligence": intelligence,
    "@/lib/enterprise-access": { PORTAL_PERMISSION: { LEAD_EDIT: "lead.edit" }, requirePermission: async () => {} },
    "@/lib/enterprise": { writeAudit: async (...args) => audit.push(args), emitEvent: async () => {}, runAutomationEvent: async () => {} },
    "@/lib/lead-query-filters": {},
  };
  deps["@/lib/queries"] = load("src/lib/queries.ts", deps);
  deps["@/lib/lead-mutation"] = load("src/lib/lead-mutation.ts", deps);
  const patch = load("src/app/api/portal/leads/[id]/route.ts", deps).PATCH;
  const call = load("src/app/api/portal/leads/[id]/calls/route.ts", deps).POST;
  return { state, audit, writes: () => writes, async request(kind, data) {
    const req = new NextRequest(`https://tarifwerk.test/api/portal/leads/42${kind === "call" ? "/calls" : ""}`, {
      method: kind === "call" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    return (kind === "call" ? call : patch)(req, { params: Promise.resolve({ id: "42" }) });
  } };
}

test("employees cannot mutate assigned leads belonging to another creator; admins can", async () => {
  for (const kind of ["patch", "call"]) {
    const h = harness({ createdByEmployeeId: 8 });
    const response = await h.request(kind, kind === "patch" ? { note: "Unzulässig" } : { reachedPerson: "customer", reaction: "interested" });
    assert.equal(response.status, 404);
    assert.equal(h.writes(), 0);
  }
  const admin = harness({ createdByEmployeeId: 8 }, [], { id: 1, role: "admin", name: "Admin" });
  assert.equal((await admin.request("patch", { note: "Zulässig" })).status, 200);
  assert.equal(admin.state.notes[0].body, "Zulässig");
});

test("closing a lead cancels every active follow-up but preserves history and unrelated tasks", async () => {
  const h = harness({ nextActionAt: tomorrow() }, [
    { id: 1, status: "open" }, { id: 2, status: "in_progress" }, { id: 3, status: "completed" },
    { id: 4, status: "open", entityId: 43 }, { id: 5, status: "open", type: "document_check" },
  ]);
  assert.equal((await h.request("patch", { status: "abgeschlossen", note: "Erfolgreich beraten" })).status, 200);
  assert.equal(h.state.leads[0].nextActionAt, null);
  assert.ok(h.state.leads[0].closedAt instanceof Date);
  assert.deepEqual(h.state.tasks.map(row => row.status), ["cancelled", "cancelled", "completed", "open", "open"]);
  assert.ok(h.state.notes.some(row => row.body === "Erfolgreich beraten"));
});

test("a closed lead rejects a new reminder until explicitly reopened", async () => {
  const h = harness({ status: "abgeschlossen", closedAt: hourAgo() });
  assert.equal((await h.request("patch", { nextActionAt: tomorrow().toISOString() })).status, 422);
  assert.equal(h.writes(), 0);
  assert.equal((await h.request("patch", { status: "in_beratung", nextActionAt: tomorrow().toISOString() })).status, 200);
  assert.equal(h.state.leads[0].closedAt, null);
  assert.equal(h.state.tasks.length, 1);
});

test("status, appointment and note save together and the audit records cleared slots accurately", async () => {
  const h = harness({ status: "kontaktiert" });
  assert.equal((await h.request("patch", { status: "in_beratung", confirmedSlot: "Dienstag 14 Uhr", note: "Kunde bestätigt" })).status, 200);
  assert.equal(h.state.leads[0].confirmedSlot, "Dienstag 14 Uhr");
  assert.equal(h.audit.at(-1)[6].confirmedSlot, "Dienstag 14 Uhr");
  assert.equal((await h.request("patch", { status: "neu" })).status, 200);
  assert.equal(h.state.leads[0].confirmedSlot, null);
  assert.equal(h.audit.at(-1)[6].confirmedSlot, null);
});

test("rescheduling consolidates duplicate reminders and preserves the lead creator as owner", async () => {
  const h = harness({}, [{ id: 1, status: "open" }, { id: 2, status: "in_progress" }], { id: 1, role: "admin", name: "Admin" });
  const due = tomorrow().toISOString();
  assert.equal((await h.request("patch", { nextActionAt: due, priority: "hot" })).status, 200);
  const active = h.state.tasks.filter(row => row.status === "open");
  assert.equal(active.length, 1);
  assert.equal(active[0].assignedToEmployeeId, 7);
  assert.equal(active[0].priority, "critical");
  assert.equal(active[0].dueAt.toISOString(), due);
  assert.equal(h.state.tasks[1].status, "cancelled");
});

test("logging calls on terminal leads never restarts automatic follow-ups", async () => {
  for (const status of ["abgeschlossen", "verloren"]) {
    const h = harness({ status, closedAt: hourAgo(), nextActionAt: tomorrow() }, [{ id: 1, status: "open" }, { id: 2, status: "in_progress" }]);
    const response = await h.request("call", { reachedPerson: "customer", reaction: "interested" });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).recommendation.autoScheduled, false);
    assert.equal(h.state.leads[0].status, status);
    assert.equal(h.state.leads[0].nextActionAt, null);
    assert.ok(h.state.tasks.every(row => row.status === "cancelled"));
  }
});

test("backdated call history cannot replace the latest contact or its scheduled callback", async () => {
  const latest = new Date(), due = tomorrow();
  const h = harness({ status: "kontaktiert", lastContactAt: latest, nextActionAt: due, contactOutcome: "callback" }, [{ id: 1, status: "open", dueAt: due }]);
  assert.equal((await h.request("call", { calledAt: hourAgo().toISOString(), reachedPerson: "customer", reaction: "interested" })).status, 200);
  assert.equal(h.state.leads[0].lastContactAt, latest);
  assert.equal(h.state.leads[0].contactOutcome, "callback");
  assert.equal(h.state.leads[0].nextActionAt, due);
  assert.equal(h.state.tasks[0].dueAt, due);
  assert.equal(h.state.calls.length, 1);
  assert.equal(h.state.calls[0].autoScheduled, false);
});

test("do-not-contact stops every callback without changing a won lead to lost", async () => {
  const h = harness({ status: "abgeschlossen", closedAt: hourAgo() }, [{ id: 1, status: "open" }, { id: 2, status: "in_progress" }]);
  assert.equal((await h.request("call", { reachedPerson: "customer", reaction: "do_not_contact", autoSchedule: false })).status, 200);
  assert.equal(h.state.leads[0].status, "abgeschlossen");
  assert.equal(h.state.leads[0].nextActionAt, null);
  assert.ok(h.state.tasks.every(row => row.status === "cancelled"));
});
