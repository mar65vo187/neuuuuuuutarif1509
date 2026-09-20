import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function harness(path, initial = []) {
  const state = [...initial], effects = [], requests = [], timers = new Map(), redirects = [], changes = [];
  let index = 0, timerId = 0;
  const jsx = (type, props) => ({ type, props });
  const deps = {
    react: {
      useState(value) { const i = index++; if (!(i in state)) state[i] = typeof value === "function" ? value() : value; return [state[i], next => { state[i] = typeof next === "function" ? next(state[i]) : next; changes.push(i); }]; },
      useRef: value => ({ current: value }), useCallback: fn => fn, useEffect: fn => effects.push(fn),
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "lucide-react": new Proxy({}, { get: (_, key) => key }),
    "next/navigation": { useRouter: () => ({ refresh() {} }) },
    "@/lib/content": {
      LEAD_STATUS_LABELS: { neu: "Neu" },
      LEAD_PRIORITY_LABELS: { normal: "Normal" },
      LEAD_CONTACT_OUTCOME_LABELS: { open: "Noch nicht angerufen" },
    },
    "@/lib/call-intelligence": {
      CALL_REACHED_PERSON_LABELS: { customer: "Kunde / Lead selbst" },
      CALL_REACTION_LABELS: { neutral: "Neutral / offen" },
    },
    "./ui": { STATUS_STYLES: { neu: "" } },
  };
  const loaded = { exports: {} };
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const context = {
    AbortController, AbortSignal, JSON, Date,
    fetch: (url, options) => new Promise(resolve => requests.push({ url, options, resolve })),
    window: { location: { replace: url => redirects.push(url) } },
    setTimeout: (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; }, clearTimeout: id => timers.delete(id),
    setInterval: (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; }, clearInterval: id => timers.delete(id),
  };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, context)(name => { if (!(name in deps)) throw new Error(name); return deps[name]; }, loaded, loaded.exports);
  return { state, effects, requests, timers, redirects, changes, exports: loaded.exports };
}
function elements(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  return [node, ...elements(node.props?.children)];
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test("leaving chat aborts polling and ignores late unauthorized responses", async () => {
  const h = harness("../../src/components/portal/ChatPanel.tsx");
  h.exports.ChatPanel();
  const cleanups = h.effects.map(fn => fn());
  const first = [...h.timers.values()].find(timer => timer.delay === 0); first.fn();
  assert.equal(h.requests.length, 1);
  for (const cleanup of cleanups) cleanup?.();
  assert.equal(h.requests[0].options.signal.aborted, true);
  const before = h.changes.length;
  h.requests[0].resolve({ status: 401 }); await flush();
  assert.equal(h.redirects.length, 0);
  assert.equal(h.changes.length, before);
  assert.equal(h.timers.size, 0);
});

test("saving a note preserves text typed while its request is pending", async () => {
  const h = harness("../../src/components/portal/LeadActions.tsx", [null, null, "", "Original note"]);
  const tree = h.exports.LeadActions({
    leadId: 1,
    status: "neu",
    confirmedSlot: null,
    assigned: true,
    isAppointment: false,
    priority: "normal",
    contactOutcome: "open",
    nextActionInput: "",
    tags: [],
  });
  const nodes = elements(tree);
  const save = nodes.find(node => node.type === "button" && Array.isArray(node.props.children) && node.props.children.includes(" Notiz speichern"));
  const pending = save.props.onClick();
  nodes.find(node => node.type === "textarea").props.onChange({ target: { value: "New unsaved note" } });
  assert.equal(JSON.parse(h.requests[0].options.body).note, "Original note");
  h.requests[0].resolve({ status: 200, ok: true, json: async () => ({ ok: true }) });
  await pending;
  assert.equal(h.state[3], "New unsaved note");
});
