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

test("CRO-01/MKT-02: restored live hero keeps clear actions and commission disclosure in the enquiry flow", () => {
  const copy = read("src/lib/audience-copy.ts");
  assert.match(copy, /primary: "Kostenlose Einschätzung starten"/);
  assert.match(copy, /secondary: "Zweite Meinung einholen"/);
  assert.match(copy, /Kommt eine Vermittlung zustande, erhalten wir in vielen Bereichen eine Provision/);
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

test("JUR-05: restored live public chat is clearly labelled as AI and warns against personal data", () => {
  const chat = read("src/components/site/PublicAiChat.tsx");
  const assistant = read("src/lib/public-ai-assistant.ts");
  assert.match(chat, /TarifWerks KI · digitale Erstorientierung/);
  assert.match(chat, /Keine persönlichen Daten im Chat teilen/);
  assert.match(chat, /Zum Datenschutz wurden mögliche Kontaktangaben/);
  assert.match(assistant, /ausdrücklich ein KI-Assistent und gibst dich niemals als menschlicher Mitarbeiter aus/);
  assert.match(assistant, /Namen, Telefonnummern, E-Mail-Adressen, Adressen, Vertragsnummern oder Gesundheitsdaten/);
});

test("UX-03/BR1/BR2/BR3: restored live service catalogue remains complete and non-duplicative", () => {
  assert.ok(content.SERVICES.length >= 8, "vollständiger Leistungskatalog");
  for (const service of content.SERVICES) {
    assert.ok(service.slug && service.name && service.headline && service.intro, `${service.slug}: Kerntexte vorhanden`);
    assert.ok(service.checks.length >= 2, `${service.slug}: Prüfpunkte vorhanden`);
    assert.equal(new Set(service.checks).size, service.checks.length, `${service.slug}: doppelte Prüfpunkte`);
    assert.ok(service.faq.length >= 1, `${service.slug}: FAQ vorhanden`);
  }
  for (const key of ["internet", "energie", "versicherungen", "solar", "immobilien", "edelmetalle"]) {
    assert.ok(content.SERVICES.some((service) => service.key === key), `${key}: Leistung vorhanden`);
  }
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
  assert.match(read("src/app/(site)/impressum/page.tsx"), /href="\/erstinformation"/);
});

test("JUR-03: optimisation terms remain defined while the restored live page avoids outcome promises", () => {
  const terms = read("src/lib/optimization-shared.ts");
  assert.match(terms, /price: "1,99 €"/);
  assert.match(terms, /Gemäß § 19 UStG wird keine Umsatzsteuer berechnet/);
  assert.match(terms, /Mindestlaufzeit 12 Monate/);
  assert.match(terms, /danach jederzeit mit einer Frist von einem Monat kündbar/);
  assert.match(terms, /erst mit unserer schriftlichen Bestätigung wirksam/);
  assert.match(terms, /Widerrufsrecht/);

  const page = read("src/app/(site)/optimierungsservice/page.tsx");
  const teaser = read("src/components/home/OptimizationMembershipTeaser.tsx");
  assert.match(page, /1,99 €/);
  assert.match(page, /Die Mitgliedschaft wird erst nach bestätigter Freischaltung aktiv/);
  assert.match(page, /keine garantierte Finanzierung/i);
  assert.match(teaser, /1,99 €/);
  assert.match(teaser, /Eine Anfrage allein aktiviert keine Mitgliedschaft/);
  assert.match(teaser, /Keine pauschale Ersparnis/);
});

test("REC-01: restored live career page describes development without income promises", () => {
  const page = read("src/app/(site)/karriere/page.tsx");
  for (const topic of [/Attraktive Provisionen/, /Echter Karrierepfad/, /Schulungen & Coaching/, /Fairer Teamaufbau/, /Welche Benefits konkret gelten/]) {
    assert.match(page, topic, String(topic));
  }
  assert.doesNotMatch(page, /garantiertes Einkommen|bis zu \d+\.?\d* ?€ im Monat/i);
});
