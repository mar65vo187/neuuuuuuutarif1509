import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("public navigation exposes referral page in the requested position and keeps mobile fallback", () => {
  const source = read("src/components/site/Header.tsx");
  const career = source.indexOf('{ href: "/karriere", label: "Karriere" }');
  const referral = source.indexOf('{ href: "/freund-werben", label: "Freund werben" }');
  const faq = source.indexOf('{ href: "/faq", label: "So funktioniert es" }');
  assert.ok(career >= 0 && referral > career && faq > referral);
  assert.match(source, /min-width: 1280px/);
  assert.match(source, /xl:flex/);
  assert.match(source, /xl:hidden/);
});

test("portal navigation stays clear and readable after searching", () => {
  const shell = read("src/components/portal/PortalShell.tsx");
  assert.match(shell, /onKeyDown=\{\(event\) => \{ if \(event\.key === "Escape"\) setNavQuery\(""\); \}\}/);
  assert.match(shell, /Kein Bereich gefunden\. Suchbegriff ändern oder mit Esc löschen/);
  assert.match(shell, /onClick=\{\(\) => setNavQuery\(""\)\}/);
  assert.match(shell, /text-\[10\.5px\].*text-silver\/70/);
});

test("team challenges require lead access at page, api and navigation layers", () => {
  const page = read("src/app/portal/(app)/rennen/page.tsx");
  const api = read("src/app/api/portal/games/route.ts");
  const shell = read("src/components/portal/PortalShell.tsx");
  const palette = read("src/components/portal/PortalCommandPalette.tsx");

  assert.match(page, /hasPermission\(user, PORTAL_PERMISSION\.LEAD_EDIT\)/);
  assert.match(api, /hasPermission\(user, PORTAL_PERMISSION\.LEAD_EDIT\)/);
  assert.match(api, /status: 403/);
  assert.match(shell, /\/portal\/rennen"[\s\S]*anyPermission: \["lead\.edit"\]/);
  assert.match(palette, /can\("lead\.edit"\)[\s\S]*team-challenges/);
});

test("product visuals cover the principal catalog wording used by sales", () => {
  const source = read("src/lib/product-visuals.ts");
  for (const term of ["telekommunikation", "festnetz", "sim", "haftpflicht", "rechtsschutz", "heiztechnik", "baufinanzierung"]) {
    assert.ok(source.includes(`"${term}"`), `missing product visual term: ${term}`);
  }
  assert.match(source, /if \(matched\) return matched/);
  assert.match(source, /Persönliches Beratungsgespräch zu einem TarifWerk Produkt/);
  assert.doesNotMatch(source, /\?\.visual \?\? null/);
});
