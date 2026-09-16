import { writeFile } from "node:fs/promises";

try {
  const origin = new URL(process.env.SEO_EXPORT_ORIGIN || "http://127.0.0.1:3000");
  if (!["http:", "https:"].includes(origin.protocol)) throw new Error("SEO_EXPORT_ORIGIN benötigt HTTP oder HTTPS.");
  const responses = await Promise.all(["/api/health", "/sitemap.xml", "/robots.txt"].map((path) => fetch(new URL(path, origin), { signal: AbortSignal.timeout(15000), redirect: "error" })));
  if (responses.some((response) => !response.ok)) throw new Error("Server, Datenbank, Sitemap und robots.txt müssen erfolgreich erreichbar sein.");
  const [health, sitemap, robots] = await Promise.all([responses[0].json(), responses[1].text(), responses[2].text()]);
  if (!health.ok || !sitemap.includes("<urlset") || !sitemap.includes("</urlset>") || !robots.includes("Sitemap: https://www.tarifwerk.eu/sitemap.xml")) throw new Error("Ungültige SEO-Serverantwort; vorhandene Dateien bleiben erhalten.");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  if (!urls.length || urls.some((url) => !url.startsWith("https://www.tarifwerk.eu/"))) throw new Error("Sitemap enthält unerwartete Zieladressen.");
  await writeFile(new URL("../sitemap.xml", import.meta.url), sitemap);
  await writeFile(new URL("../robots.txt", import.meta.url), robots);
  console.log(`SEO-Dateien exportiert: sitemap.xml (${urls.length} URLs) und robots.txt. Laufzeit-Routen bleiben dynamisch.`);
} catch (error) {
  console.error("SEO-Export fehlgeschlagen:", error instanceof Error ? error.message : "Unbekannter Fehler");
  process.exitCode = 1;
}
