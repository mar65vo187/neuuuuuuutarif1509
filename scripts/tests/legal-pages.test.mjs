import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const read = (relative) => readFileSync(path.join(ROOT, relative), "utf8");

test("Impressum contains the complete current operator and contact details", () => {
  const impressum = read("src/app/(site)/impressum/page.tsx");

  assert.match(impressum, /Marvin Noel Egenolf/);
  assert.match(impressum, /TarifWerk/);
  assert.match(impressum, /Karawankenstraße 1/);
  assert.match(impressum, /65187 Wiesbaden/);
  assert.match(impressum, /\+49 157 82301076/);
  assert.match(impressum, /m\.egenolf@tarifwerk\.eu/);
  assert.match(impressum, /Redaktionell verantwortlich/);
  assert.match(impressum, /Verbraucherstreitbeilegung\/Universalschlichtungsstelle/);
  assert.match(
    impressum,
    /Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen\./,
  );

  assert.doesNotMatch(impressum, /Adresse auf Anfrage|Geschäftsadresse fehlt|marvin\.n\.egenolf@gmail\.com/i);
});

test("AGB are complete and aligned with the referral programme", () => {
  const agb = read("src/app/(site)/agb/page.tsx");
  const rewards = read("src/components/referrals/ReferralRewards.tsx");

  assert.match(agb, /Stand: 22\. September 2026/);
  assert.match(agb, /1\. Anbieter und Geltungsbereich/);
  assert.match(agb, /8\. Empfehlungsprogramm/);
  assert.match(agb, /id="empfehlungsprogramm"/);
  assert.match(agb, /Wunschgutschein/);
  assert.match(agb, /50&nbsp;% des bestätigten Gutscheinwerts/);
  assert.match(agb, /Widerrufs- und Stornofristen/);
  assert.match(agb, /13\. Schlussbestimmungen/);

  assert.match(rewards, /\/agb#empfehlungsprogramm/);
  assert.match(rewards, /AGB \(§ 8 Empfehlungsprogramm\)/);
});
