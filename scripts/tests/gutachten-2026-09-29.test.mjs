import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Regressionsschutz für die Umsetzung des Website-Gutachtens vom 29.09.2026.
const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const content = (() => {
  const js = ts.transpileModule(read("src/lib/content.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(js, { module: loaded, exports: loaded.exports });
  return loaded.exports;
})();

test("CRO-01/MKT-02: one primary hero action and the commission model disclosed where visitors decide", () => {
  const copy = read("src/lib/audience-copy.ts");
  assert.match(copy, /primary: "Vertrag kostenlos prüfen lassen"/);
  assert.match(copy, /secondary: "Angebot mit uns durchgehen"/);
  assert.match(read("src/components/home/Hero.tsx"), /Provision vom Anbieter/);
  assert.match(read("src/components/forms/LeadForm.tsx"), /So verdienen wir: Kommt über uns ein Vertrag zustande/);
});

test("UX-01: homepage keeps a short, ordered path without filler sections", () => {
  const page = read("src/app/(site)/page.tsx");
  for (const removed of ["TopicTicker", "FinderTeaser", "TrustEngine"]) assert.doesNotMatch(page, new RegExp(`<${removed}`));
  const sections = page.match(/<[A-Z][A-Za-z]+ audience=\{initialAudience\} \/>/g) ?? [];
  assert.ok(sections.length <= 11, `zu viele Startseitenbereiche: ${sections.length}`);
  assert.ok(page.indexOf("<AudienceProcess") < page.indexOf("<AudienceFocusSection"), "Ablauf steht vor den Themen");
  assert.ok(page.indexOf("<AudienceFaqSection") < page.indexOf("<AudienceFinalCta"), "Anfrage bildet den Abschluss");
});

test("JUR-05: the public chat discloses the AI and the data flow before the first message", () => {
  const chat = read("src/components/site/PublicAiChat.tsx");
  assert.match(chat, /Ich bin ein KI-Assistent von TarifWerk, kein Mensch/);
  assert.match(chat, /Du chattest mit einer KI, nicht mit einem Menschen/);
  assert.match(chat, /Sie chatten mit einer KI, nicht mit einem Menschen/);
  assert.match(chat, /keine Vertrags-, Konto- oder Gesundheitsdaten/);
  assert.match(chat, /href="\/datenschutz"/);
});

test("UX-03/BR1/BR2/BR3: service pages are concrete, without duplicates, with real questions", () => {
  const forbidden = /ganzheitlich|maßgeschneidert|nahtlos|innovativ|revolutionär|Mehrwert|Synergie/i;
  for (const service of content.SERVICES) {
    assert.ok(service.checks.length >= 4 && service.checks.length <= 5, `${service.slug}: 4–5 Prüfpunkte`);
    assert.equal(new Set(service.checks).size, service.checks.length, `${service.slug}: doppelte Prüfpunkte`);
    assert.ok(service.faq.length >= 3, `${service.slug}: mindestens drei FAQ`);
    const text = [service.headline, service.intro, service.short, ...service.checks, ...service.faq.flatMap((item) => [item.q, item.a])].join(" ");
    assert.doesNotMatch(text, forbidden, `${service.slug}: Floskel`);
    assert.doesNotMatch([service.headline, service.intro, ...service.checks, ...service.faq.map((item) => item.a)].join(" "), /\b(du|dein|deine|dir|dich|Sie|Ihr|Ihre|Ihnen)\b/, `${service.slug}: Basistext muss für Privat und Business neutral sein`);
  }
  const internet = content.SERVICES.find((service) => service.key === "internet");
  assert.ok(internet.checks.some((check) => /Umzug, Glasfaserausbau/.test(check)));
  const energy = content.SERVICES.find((service) => service.key === "energie");
  for (const topic of [/erhöht die Preise/, /Bonus/, /Grundversorgung/, /ziehe um/]) assert.ok(energy.faq.some((item) => topic.test(item.q)), String(topic));
  const solar = content.SERVICES.find((service) => service.key === "solar");
  assert.ok(solar.faq.some((item) => /Wer plant, montiert und haftet/.test(item.q)));
  const insurance = content.SERVICES.find((service) => service.key === "versicherungen");
  assert.ok(insurance.faq.some((item) => /Vermittlerstatus/.test(item.a)));
});

test("SEO-02: thank-you page is noindex with its own canonical", () => {
  const page = read("src/app/(site)/anfrage/danke/page.tsx");
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(page, /canonical: "\/anfrage\/danke"/);
});

test("JUR-01: Erstinformation is published only from verified license records, never from placeholders", () => {
  const migration = read("migrations/0027_advisor_licenses.sql");
  assert.match(migration, /CHECK \(kind IN \('34c', '34d', '34f', '34i'\)\)/);
  assert.match(migration, /advisor_licenses_register_required CHECK \(kind = '34c' OR register_number IS NOT NULL\)/);
  assert.match(migration, /advisor_licenses_active_kind_unique/);

  const route = read("src/app/api/portal/admin/advisors/[id]/licenses/route.ts");
  assert.match(route, /authorizeAdmin\(request\)/);
  assert.match(route, /lockAdminMutation\(tx, admin\.id\)/);
  assert.match(route, /"advisor\.license_saved"/);
  assert.match(route, /"advisor\.license_removed"/);

  const lib = read("src/lib/advisor-licenses.ts");
  assert.doesNotMatch(lib, /Darlehensvermittler mit Erlaubnis nach § 34c/, "Darlehensvermittlung gehört nicht (mehr) zu § 34c");
  assert.match(lib, /Für diese Erlaubnis ist die Registernummer Pflicht/);

  const page = read("src/app/(site)/erstinformation/page.tsx");
  assert.match(page, /listPublicLicenses\(\)/);
  assert.match(page, /Versicherungsombudsmann|INSURANCE_ARBITRATION/);
  assert.match(page, /license\.noHoldingsConfirmed/);
  assert.doesNotMatch(page, /D-XXXX|folgt|TODO|Platzhalter/);
  assert.match(read("src/components/site/Footer.tsx"), /href="\/erstinformation"/);
  assert.match(read("src/app/(site)/impressum/page.tsx"), /href="\/erstinformation"/);
});

test("JUR-03: optimisation service states price, tax status, term, cancellation, contract path and withdrawal", () => {
  const terms = read("src/lib/optimization-shared.ts");
  assert.match(terms, /price: "1,99 €"/);
  assert.match(terms, /Gemäß § 19 UStG wird keine Umsatzsteuer berechnet/);
  assert.match(terms, /Mindestlaufzeit 12 Monate/);
  assert.match(terms, /danach jederzeit mit einer Frist von einem Monat kündbar/);
  assert.match(terms, /erst mit unserer schriftlichen Bestätigung wirksam/);
  assert.match(terms, /Widerrufsrecht/);
  const page = read("src/app/(site)/optimierungsservice/page.tsx");
  for (const field of ["taxNote", "minimumTerm", "cancellation", "conclusion", "withdrawal"]) {
    assert.match(page, new RegExp(`OPTIMIZATION_PUBLIC_TERMS\\.${field}`));
  }
  assert.match(read("src/components/home/OptimizationMembershipTeaser.tsx"), /OPTIMIZATION_PUBLIC_TERMS\.taxNote/);
});

test("REC-01: career page answers the real questions of applicants without income promises", () => {
  const page = read("src/app/(site)/karriere/page.tsx");
  for (const topic of [/Handelsvertreter \(§ 84 HGB\)/, /Provision entsteht nach einem erfolgreichen Abschluss/, /keine Kosten/, /einer Stunde pro Woche/, /Schulungen/, /eigenes Netzwerk hilft/, /§ 34d GewO/, /Stornokonto/]) {
    assert.match(page, topic, String(topic));
  }
  assert.match(page, /COMPENSATION_TIERS\[0\]\.percent/);
  assert.match(page, /Ein Einkommen können und wollen wir nicht garantieren/);
  assert.doesNotMatch(page, /garantiertes Einkommen|bis zu \d+\.?\d* ?€ im Monat/i);
});
