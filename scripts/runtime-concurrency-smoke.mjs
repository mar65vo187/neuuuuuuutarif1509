const base = process.env.RUNTIME_BASE_URL || "http://127.0.0.1:3000";
const routes = ["/", "/leistungen", "/berater", "/anfrage", "/api/health"];
const total = Number(process.env.RUNTIME_SMOKE_REQUESTS || 120);
const concurrency = Number(process.env.RUNTIME_SMOKE_CONCURRENCY || 12);
const durations = [];
const failures = [];

async function one(index) {
  const path = routes[index % routes.length];
  const started = performance.now();
  try {
    const response = await fetch(base + path, {
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "TarifWerk-CI-Concurrency-Smoke/1.0" },
    });
    await response.arrayBuffer();
    const ms = performance.now() - started;
    durations.push(ms);
    if (!response.ok) failures.push({ path, status: response.status, ms: Math.round(ms) });
  } catch (error) {
    failures.push({ path, error: error instanceof Error ? error.message : String(error) });
  }
}

let next = 0;
async function worker() {
  while (true) {
    const index = next++;
    if (index >= total) return;
    await one(index);
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

durations.sort((a, b) => a - b);
const percentile = (p) => durations.length
  ? Math.round(durations[Math.min(durations.length - 1, Math.floor((durations.length - 1) * p))])
  : null;
const report = {
  total,
  concurrency,
  successes: durations.length - failures.length,
  failures,
  p50Ms: percentile(0.5),
  p95Ms: percentile(0.95),
  maxMs: durations.length ? Math.round(durations.at(-1)) : null,
};

console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) throw new Error("Runtime concurrency smoke had failed requests.");
if ((report.p95Ms ?? Infinity) > 5000) throw new Error("Runtime concurrency smoke p95 exceeded 5000ms.");
