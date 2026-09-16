import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../../src/lib/security.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loaded = { exports: {} };
vm.runInNewContext(`(function(module, exports) { ${compiled}\n})`)(loaded, loaded.exports);
const { serializeJsonLd, contentSecurityPolicy } = loaded.exports;

test("structured data cannot close a script element and preserves the original values", () => {
  const value = { name: '</script><script>alert("x")</script>', text: "<!-- & \u2028 \u2029", url: "https://tarifwerk.test/?a=1&b=2" };
  const serialized = serializeJsonLd(value);
  assert.ok(!serialized.includes("<"));
  assert.deepEqual(JSON.parse(serialized), value);
  assert.throws(() => serializeJsonLd(undefined));
});

test("production CSP permits trusted scripts and blocks inline handlers, objects and framing", () => {
  const nonce = randomBytes(18).toString("base64");
  const policy = contentSecurityPolicy(nonce);
  const script = policy.split("; ").find((line) => line.startsWith("script-src "));
  assert.ok(script.includes(`'nonce-${nonce}'`));
  assert.ok(!script.includes("unsafe-inline"));
  assert.ok(!policy.includes("unsafe-eval"));
  for (const required of ["script-src-attr 'none'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'self'"]) assert.ok(policy.includes(required));
  assert.throws(() => contentSecurityPolicy("injected'; script-src *"));
});

test("development exceptions do not enter the production policy", () => {
  const nonce = randomBytes(18).toString("base64");
  assert.ok(contentSecurityPolicy(nonce, true).includes("'unsafe-eval'"));
  assert.ok(contentSecurityPolicy(nonce, true).includes(" ws: wss:"));
  assert.ok(!contentSecurityPolicy(nonce, false).includes(" ws:"));
});
