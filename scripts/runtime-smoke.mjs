const base = process.env.RUNTIME_BASE_URL || "http://127.0.0.1:3000";

const routes = [
  // Core public journey
  "/",
  "/?audience=b2b",
  "/leistungen",
  "/optimierungsservice",
  "/berater",
  "/anfrage",
  "/anfrage/danke",
  "/faq",
  "/ueber-uns",
  "/karriere",
  "/freund-werben",
  "/freund-werben/status",
  "/agb",
  "/impressum",
  "/datenschutz",
  "/datenschutz/en",
  // Every current service page
  "/leistungen/internet-glasfaser-tv",
  "/leistungen/strom-gas",
  "/leistungen/versicherungen",
  "/leistungen/sicherheitsloesungen",
  "/leistungen/klimaanlagen",
  "/leistungen/solar-photovoltaik",
  "/leistungen/edelmetalle",
  "/leistungen/immobilien",
  // Every current local landing page
  "/beratung/wiesbaden",
  "/beratung/mainz",
  "/beratung/frankfurt-am-main",
  // Discovery / runtime endpoints
  "/robots.txt",
  "/sitemap.xml",
  "/portal/login",
  "/api/health",
  "/api/ready",
];

async function fetchWithTimeout(path, timeout = 10000) {
  const started = performance.now();
  const response = await fetch(base + path, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeout),
    headers: { "User-Agent": "TarifWerk-CI-Runtime-Smoke/1.0" },
  });
  return { response, ms: Math.round(performance.now() - started) };
}

async function waitUntilReady() {
  const deadline = Date.now() + 60000;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const { response } = await fetchWithTimeout("/api/ready", 5000);
      if (response.ok) return;
      lastError = "HTTP " + response.status;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Runtime did not become ready within 60s: " + lastError);
}

await waitUntilReady();

const results = [];
for (const path of routes) {
  const { response, ms } = await fetchWithTimeout(path);
  const body = await response.text();
  if (!response.ok) {
    throw new Error(path + " returned HTTP " + response.status + ": " + body.slice(0, 500));
  }
  if (path === "/api/health" || path === "/api/ready") {
    const json = JSON.parse(body);
    if (json.ok !== true) throw new Error(path + " did not report ok=true");
  } else if (!body.trim()) {
    throw new Error(path + " returned an empty response");
  }
  results.push({ path, status: response.status, ms, bytes: Buffer.byteLength(body) });
}

console.log(JSON.stringify({ ok: true, base, results }, null, 2));
