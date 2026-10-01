import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const read = (relative) => readFileSync(path.join(ROOT, relative), "utf8");

function walk(directory) {
  const absolute = path.join(ROOT, directory);
  if (!existsSync(absolute)) return [];
  const files = [];
  for (const name of readdirSync(absolute)) {
    const next = path.join(absolute, name);
    if (statSync(next).isDirectory()) files.push(...walk(path.relative(ROOT, next)));
    else files.push(path.relative(ROOT, next).replaceAll("\\", "/"));
  }
  return files;
}

function pageRoute(file) {
  const relative = file.replace(/^src\/app\/?/, "").replace(/\/page\.tsx$/, "");
  const segments = relative.split("/").filter(Boolean).filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")));
  const pattern = segments.map((segment) => {
    if (/^\[\.\.\..+\]$/.test(segment)) return ".+";
    if (/^\[\[\.\.\..+\]\]$/.test(segment)) return ".*";
    if (/^\[.+\]$/.test(segment)) return "[^/]+";
    return segment.replace(/[.*+?^$()|[\]{}]/g, "\\$&");
  }).join("/");
  return new RegExp("^/" + pattern + "/?$");
}

test("TarifWerk brand identity is consistent across schema, imprint and readiness", () => {
  const layout = read("src/app/(site)/layout.tsx");
  const imprint = read("src/app/(site)/impressum/page.tsx");
  const ready = read("src/app/api/ready/route.ts");
  const identity = read("src/lib/business-identity.ts");

  assert.match(layout, /name: SITE\.name/);
  assert.match(layout, /alternateName: \["TarifWerk\.eu", "Tarif Werk"\]/);
  assert.match(layout, /publicBusinessPostalAddress\(\)/);
  assert.match(layout, /"@type": "PostalAddress"/);
  assert.match(layout, /streetAddress: businessAddress\.streetAddress/);
  assert.match(layout, /knowsAbout: SERVICES\.map/);
  assert.match(imprint, /Marvin Noel Egenolf/);
  assert.match(imprint, /TarifWerk/);
  assert.match(imprint, /Karawankenstraße 1/);
  assert.match(imprint, /65187 Wiesbaden/);
  assert.match(imprint, /\+49 157 82301076/);
  assert.match(imprint, /m\.egenolf@tarifwerk\.eu/);
  assert.match(imprint, /Redaktionell verantwortlich/);
  assert.match(imprint, /Verbraucherstreitbeilegung\/Universalschlichtungsstelle/);
  assert.doesNotMatch(imprint, /Angaben gemäß § 5 DDG|Hinweis zur Tätigkeit|Verantwortlich für den Inhalt nach § 18 Abs\. 2 MStV/);
  assert.match(ready, /hasProductionBusinessAddress\(\)/);
  assert.match(identity, /BUSINESS_ADDRESS = "Karawankenstraße 1, 65187 Wiesbaden, Deutschland"/);
  assert.match(identity, /publicBusinessPostalAddress/);
});

test("brand search essentials remain wired into metadata and homepage", () => {
  const root = read("src/app/layout.tsx");
  const homepage = read("src/app/(site)/page.tsx");
  const brand = read("src/components/home/BrandIdentitySection.tsx");
  const siteLayout = read("src/app/(site)/layout.tsx");

  assert.match(root, /GOOGLE_SITE_VERIFICATION/);
  assert.match(root, /metadataBase: new URL\(SITE\.url\)/);
  assert.match(siteLayout, /"@type": \["Organization", "ProfessionalService"\]/);
  assert.match(siteLayout, /"@type": "WebSite"/);
  assert.match(siteLayout, /favicon\.svg/);
  assert.match(homepage, /<BrandIdentitySection audience=\{initialAudience\} \/>/);
  assert.match(brand, /Was TarifWerk bündelt/);
  assert.match(brand, /Ein Ansprechpartner für Alltag, Zuhause und Vermögen/);
});

test("paid campaign landing pages cannot dilute the organic index", () => {
  const campaign = read("src/app/kampagne/[slug]/page.tsx");
  assert.match(campaign, /robots: \{ index: false, follow: false \}/);
  assert.match(campaign, /alternates: \{ canonical: SITE\.url \}/);
  assert.match(campaign, /JourneyContext/);
  assert.match(campaign, /source=\{`kampagne:\$\{campaign\.slug\}`\}/);
});

test("sitemap and robots keep core public discovery intact", () => {
  const sitemap = read("src/app/sitemap.ts");
  const robots = read("src/app/robots.ts");

  for (const route of ["/", "/berater", "/anfrage", "/leistungen", "/ueber-uns", "/karriere", "/freund-werben", "/faq"]) {
    assert.ok(sitemap.includes("${SITE.url}" + route), "sitemap must include " + route);
  }
  assert.match(sitemap, /SERVICES\.map/);
  assert.match(sitemap, /LOCAL_PAGE_LIST\.map/);
  assert.match(sitemap, /getActiveAdvisors/);
  assert.match(robots, /disallow: \["\/api\/", "\/portal\/"\]/);
  assert.match(robots, /sitemap: `\$\{SITE\.url\}\/sitemap\.xml`/);
});

test("profile images are editable and normalized to one exact format", () => {
  const editor = read("src/components/portal/ImageCropEditor.tsx");
  const advisorUpload = read("src/app/api/portal/admin/advisors/[id]/image/route.ts");
  const employeeUpload = read("src/app/api/portal/admin/users/[id]/image/route.ts");

  assert.match(editor, /const OUTPUT_SIZE = 1200/);
  assert.match(editor, /image\/webp/);
  for (const source of [advisorUpload, employeeUpload]) {
    assert.match(source, /width: 1200, height: 1200/);
    assert.match(source, /fit: "cover"/);
    assert.match(source, /\.webp\(/);
  }
});

test("literal internal public links resolve to a real app page", () => {
  const pageFiles = walk("src/app").filter((file) => file.endsWith("/page.tsx") || file === "src/app/page.tsx");
  const routes = pageFiles.map(pageRoute);
  const publicFiles = [
    ...walk("src/app/(site)"),
    ...walk("src/components/home"),
    ...walk("src/components/site"),
    ...walk("src/components/forms"),
    ...walk("src/components/advisors"),
    ...walk("src/components/referrals"),
  ].filter((file) => /\.(tsx|ts)$/.test(file));

  const unresolved = new Set();
  for (const file of publicFiles) {
    const source = read(file);
    for (const match of source.matchAll(/href\s*=\s*["'](\/[^"'{}$]*)["']/g)) {
      const href = match[1];
      if (href.startsWith("/api/")) continue;
      const pathname = href.split(/[?#]/, 1)[0] || "/";
      if (!routes.some((route) => route.test(pathname))) unresolved.add(file + " -> " + href);
    }
  }
  assert.deepEqual([...unresolved], []);
});

test("homepage keeps the last-known-live consultation positioning without founder repetition", () => {
  const homepage = read("src/app/(site)/page.tsx");
  const copy = read("src/lib/audience-copy.ts");
  const hero = read("src/components/home/Hero.tsx");
  const finalCta = read("src/components/home/AudienceSections.tsx");
  const leadForm = read("src/components/forms/LeadForm.tsx");

  // Preserve the public wording that was serving successfully in production on 2026-09-24.
  assert.match(copy, /primary: "Kostenlose Einschätzung starten"/);
  assert.match(copy, /TarifWerk bündelt Internet, Mobilfunk & TV, Strom & Gas/);
  assert.match(copy, /Kommt eine Vermittlung zustande, erhalten wir in vielen Bereichen eine Provision/);
  assert.match(hero, /Kostenlose Erstorientierung/);
  assert.doesNotMatch(homepage, /<Founder /);
  assert.doesNotMatch(hero, /Marvin · dein Ansprechpartner|Marvin · Ihr Ansprechpartner/);
  assert.doesNotMatch(finalCta, /SITE\.whatsappDisplay/);
  assert.doesNotMatch(leadForm, /SITE\.whatsappDisplay/);
});

test("homepage avoids redundant guidance sections and keeps phone disclosure focused", () => {
  const homepage = read("src/app/(site)/page.tsx");
  const footer = read("src/components/site/Footer.tsx");

  assert.doesNotMatch(homepage, /PremiumGuidance/);
  assert.match(footer, /Persönliche Beratung und Vermittlungskoordination für Alltag, Zuhause und Vermögen/);
  assert.match(footer, /SITE\.whatsappDisplay/);
});


test("homepage promotes the recurring optimization service without overstating outcomes", () => {
  const homepage = read("src/app/(site)/page.tsx");
  const teaser = read("src/components/home/OptimizationMembershipTeaser.tsx");
  const service = read("src/app/(site)/optimierungsservice/page.tsx");

  assert.match(homepage, /<OptimizationMembershipTeaser audience=\{initialAudience\} \/>/);
  assert.match(teaser, /1,99 €/);
  assert.match(teaser, /Eine Anfrage allein aktiviert keine Mitgliedschaft/);
  assert.match(teaser, /Keine pauschale Ersparnis/);
  assert.match(service, /Die Mitgliedschaft wird erst nach bestätigter Freischaltung aktiv/);
  assert.match(service, /keine garantierte Finanzierung/i);
});

test("consumer membership is not presented as a business subscription", () => {
  const header = read("src/components/site/Header.tsx");
  const footer = read("src/components/site/Footer.tsx");
  const service = read("src/app/(site)/optimierungsservice/page.tsx");

  assert.match(header, /optimierungsservice.+audience: "b2c"/s);
  assert.match(header, /visibleNav = NAV\.filter/);
  assert.match(footer, /audience === "b2c".+optimierungsservice/s);
  assert.match(service, /Der 1,99-€-Optimierungsservice richtet sich aktuell an Privatkunden/);
  assert.match(service, /Business-Anfrage starten/);
});

test("public AI advisor stays off the initial route bundle until the visitor asks for it", () => {
  const layout = read("src/app/(site)/layout.tsx");
  const lazy = read("src/components/site/LazyPublicAiChat.tsx");
  const chat = read("src/components/site/PublicAiChat.tsx");

  assert.match(layout, /LazyPublicAiChat/);
  assert.doesNotMatch(layout, /import \{ PublicAiChat \}/);
  assert.match(lazy, /dynamic\(/);
  assert.match(lazy, /ssr: false/);
  assert.match(lazy, /setActivated\(true\)/);
  assert.match(chat, /aria-modal="true"/);
  assert.match(chat, /inputRef\.current\?\.focus/);
  assert.match(chat, /event\.key === "Escape"/);
});
