const base = process.env.LIVE_BASE_URL || "https://www.tarifwerk.eu";

const routes = [
  "/",
  "/?audience=b2b",
  "/leistungen",
  "/optimierungsservice",
  "/beratung",
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
  "/leistungen/internet-glasfaser-tv",
  "/leistungen/strom-gas",
  "/leistungen/versicherungen",
  "/leistungen/sicherheitsloesungen",
  "/leistungen/klimaanlagen",
  "/leistungen/solar-photovoltaik",
  "/leistungen/edelmetalle",
  "/leistungen/immobilien",
  "/beratung/wiesbaden",
  "/beratung/mainz",
  "/beratung/frankfurt-am-main",
  "/robots.txt",
  "/sitemap.xml",
  "/portal/login",
  "/api/health",
  "/api/ready",
];

async function request(path, timeout = 15000) {
  const started = performance.now();
  const response = await fetch(new URL(path, base), {
    redirect: "follow",
    signal: AbortSignal.timeout(timeout),
    headers: { "User-Agent": "TarifWerk-Live-Smoke/1.0" },
  });
  const body = await response.text();
  return {
    path,
    status: response.status,
    finalUrl: response.url,
    ms: Math.round(performance.now() - started),
    bytes: Buffer.byteLength(body),
    headers: {
      csp: response.headers.get("content-security-policy"),
      nosniff: response.headers.get("x-content-type-options"),
      frame: response.headers.get("x-frame-options"),
      hsts: response.headers.get("strict-transport-security"),
    },
    body,
  };
}

const failures = [];
const results = [];

for (const path of routes) {
  try {
    const result = await request(path);
    const isApi = path === "/api/health" || path === "/api/ready";
    if (!result.status || result.status < 200 || result.status >= 300) {
      failures.push(`${path}: HTTP ${result.status}`);
      results.push({ ...result, body: result.body.slice(0, 500) });
      continue;
    }
    if (!result.body.trim()) failures.push(`${path}: empty response`);
    if (isApi) {
      let json;
      try {
        json = JSON.parse(result.body);
      } catch {
        failures.push(`${path}: invalid JSON`);
        continue;
      }
      if (json.ok !== true) failures.push(`${path}: ok !== true`);
    }
    if (path === "/robots.txt" && !result.body.includes("/sitemap.xml")) {
      failures.push("/robots.txt: sitemap reference missing");
    }
    if (path === "/sitemap.xml" && !result.body.includes("www.tarifwerk.eu")) {
      failures.push("/sitemap.xml: canonical host missing");
    }
    if (!isApi && result.headers.nosniff !== "nosniff") failures.push(`${path}: X-Content-Type-Options missing`);
    if (!isApi && path !== "/portal/login" && !result.headers.frame) failures.push(`${path}: X-Frame-Options missing`);
    if (!isApi && !result.headers.csp) failures.push(`${path}: CSP missing`);
    if (new URL(base).protocol === "https:" && !isApi && !result.headers.hsts) failures.push(`${path}: HSTS missing`);
    results.push({ path: result.path, status: result.status, finalUrl: result.finalUrl, ms: result.ms, bytes: result.bytes });
  } catch (error) {
    failures.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const summary = {
  ok: failures.length === 0,
  base,
  checked: routes.length,
  failures,
  results,
};
console.log(JSON.stringify(summary, null, 2));

if (failures.length) process.exit(1);
