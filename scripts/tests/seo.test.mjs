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
const { PAGE_SEO, pageMetadata, shortenSeoText } = load("../../src/lib/seo.ts", { "@/lib/content": content });

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

test("dynamic advisor metadata remains bounded and unknown SEO routes fail explicitly", () => {
  const metadata = pageMetadata("/berater/test", { title: "Ä".repeat(200), description: "Beratung ".repeat(200) }, "/api/advisors/1/image");
  assert.equal(Array.from(metadata.title.absolute).length, 59);
  assert.ok(Array.from(metadata.description).length <= 154);
  assert.equal(metadata.openGraph.images[0].url, content.SITE.url + "/api/advisors/1/image");
  assert.equal(shortenSeoText("  A   B  ", 10), "A B");
  assert.throws(() => pageMetadata("/missing"));
});
