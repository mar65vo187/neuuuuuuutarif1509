import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(module, exports, require) {${js}\n})`, { URL })(loaded, loaded.exports, (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  });
  return loaded.exports;
}
const content = load("../../src/lib/content.ts");
const { AUDIENCE_PAGE_SEO, PAGE_SEO, REQUEST_AUDIENCE_SEO, pageMetadata, shortenSeoText } = load("../../src/lib/seo.ts", { "@/lib/content": content });

test("every public SEO title, description, canonical and social preview is route-specific", () => {
  const pages = [...Object.entries(PAGE_SEO), ...content.SERVICES.map((s) => [`/leistungen/${s.slug}`, { title: s.seoTitle, description: s.seoDescription }])];
  const titles = new Set();
  for (const [path, details] of pages) {
    assert.ok(details.title.length < 60, path);
    assert.ok(details.description.length < 155, path);
    const meta = pageMetadata(path, details);
    assert.ok(!titles.has(meta.title.absolute)); titles.add(meta.title.absolute);
    assert.equal(meta.title.absolute, meta.openGraph.title);
    assert.equal(meta.description, meta.twitter.description);
    assert.equal(meta.alternates.canonical, new URL(path, content.SITE.url).href);
    assert.equal(meta.openGraph.url, meta.alternates.canonical);
    assert.ok(meta.openGraph.images[0].url.startsWith(content.SITE.url + "/"));
    assert.equal(meta.robots.index, !details.noindex);
  }
});

test("audience-specific SEO variants stay concise and canonical", () => {
  const variants = [
    ...Object.entries(AUDIENCE_PAGE_SEO).flatMap(([path, value]) => [
      [path, "b2c", value.b2c],
      [path, "b2b", value.b2b],
    ]),
    ["/anfrage", "b2c", REQUEST_AUDIENCE_SEO.b2c],
    ["/anfrage", "b2b", REQUEST_AUDIENCE_SEO.b2b],
  ];

  for (const [path, audience, details] of variants) {
    assert.ok(details.title.length < 60, path + " " + audience + " title");
    assert.ok(details.description.length < 155, path + " " + audience + " description");
    const meta = pageMetadata(path, details, null, path);
    assert.equal(meta.alternates.canonical, new URL(path, content.SITE.url).href);
    assert.equal(meta.openGraph.url, meta.alternates.canonical);
  }
});

test("dynamic advisor metadata remains bounded and unknown SEO routes fail explicitly", () => {
  const metadata = pageMetadata("/berater/test", { title: "Ä".repeat(200), description: "Beratung ".repeat(200) }, "/api/advisors/1/image");
  assert.equal(Array.from(metadata.title.absolute).length, 59);
  assert.ok(Array.from(metadata.description).length <= 154);
  assert.equal(metadata.openGraph.images[0].url, content.SITE.url + "/api/advisors/1/image");
  assert.equal(shortenSeoText("  A   B  ", 10), "A B");
  assert.throws(() => pageMetadata("/missing"));
});

test("portal area is blocked and hidden from indexing", () => {
  const robotsSource = readFileSync(new URL("../../src/app/robots.ts", import.meta.url), "utf8");
  const portalLayoutSource = readFileSync(new URL("../../src/app/portal/layout.tsx", import.meta.url), "utf8");

  assert.match(robotsSource, /disallow:\s*\[[\s\S]*"\/portal\/"/, "robots.txt must block /portal/");
  assert.match(portalLayoutSource, /robots:\s*\{\s*index:\s*false\s*,\s*follow:\s*false\s*\}/, "portal pages must be noindex");
});
