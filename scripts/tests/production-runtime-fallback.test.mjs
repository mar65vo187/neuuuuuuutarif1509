import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("legacy public AI runtime bridge never embeds secrets and is scoped to the public assistant", () => {
  const bridge = read("deploy/railway/public-ai-runtime-bridge.cjs");
  assert.match(bridge, /process\.env\.GROQ_API_KEY/);
  assert.match(bridge, /TARIFWERK_PUBLIC_AI_RUNTIME_BRIDGE/);
  assert.match(bridge, /ÖFFENTLICHE TARIFWERK-WISSENSBASIS/);
  assert.match(bridge, /qwen\/qwen3\.8-27b/);
  assert.doesNotMatch(bridge, /gsk_[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(bridge, /sk-[A-Za-z0-9_-]{20,}/);
});

test("nginx production fallback preserves upstream and hard navigation handoff", () => {
  const nginx = read("deploy/railway/nginx-public-nav.conf");
  assert.match(nginx, /tarifwerk-prod\.railway\.internal:8080/);
  assert.match(nginx, /\/api\/ready|location \/ /);
  assert.match(nginx, /Persönlich beraten lassen/);
  assert.match(nginx, /window\.location\.assign/);
  assert.match(nginx, /Accept-Encoding ""/);
});
