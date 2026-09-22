import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const read = (relative) => readFileSync(path.join(ROOT, relative), "utf8");

test("complete German and English privacy policies replace the legacy privacy copy", () => {
  const germanPage = read("src/app/(site)/datenschutz/page.tsx");
  const englishPage = read("src/app/(site)/datenschutz/en/page.tsx");
  const germanPolicy = read("src/content/legal/privacy-policy-de.ts");
  const englishPolicy = read("src/content/legal/privacy-policy-en.ts");
  const renderer = read("src/components/site/PrivacyPolicyDocument.tsx");

  assert.match(germanPage, /PRIVACY_POLICY_DE_HTML/);
  assert.match(germanPage, /switchHref="\/datenschutz\/en"/);
  assert.doesNotMatch(
    germanPage,
    /Wir setzen keine Tracking-Cookies|Missbrauchsschutz öffentlicher Formulare|Externe Bilder|Kampagnen- und Anfragekontext/,
  );

  assert.match(englishPage, /PRIVACY_POLICY_EN_HTML/);
  assert.match(englishPage, /switchHref="\/datenschutz"/);
  assert.match(englishPage, /title="Privacy Policy"/);

  assert.ok(germanPolicy.length > 40000, "German privacy policy source must remain complete");
  assert.match(germanPolicy, /Datenschutz auf einen Blick/);
  assert.match(germanPolicy, /Karawankenstra&szlig;e 1/);
  assert.match(germanPolicy, /Google Analytics/);
  assert.match(germanPolicy, /Brevo/);
  assert.match(germanPolicy, /Zoom/);

  assert.ok(englishPolicy.length > 35000, "English privacy policy source must remain complete");
  assert.match(englishPolicy, /An overview of data protection/);
  assert.match(englishPolicy, /Karawankenstra&szlig;e 1/);
  assert.match(englishPolicy, /Google Analytics/);
  assert.match(englishPolicy, /Brevo/);
  assert.match(englishPolicy, /Zoom/);

  assert.doesNotMatch(germanPolicy, /<script|<iframe|<style/i);
  assert.doesNotMatch(englishPolicy, /<script|<iframe|<style/i);
  assert.match(renderer, /withoutDuplicateDocumentTitle/);
  assert.match(renderer, /dangerouslySetInnerHTML/);
});
