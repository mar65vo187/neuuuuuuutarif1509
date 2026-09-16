import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { relative, join } from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "data");
mkdirSync(output, { recursive: true });
const write = (name, value) => writeFileSync(join(output, name), JSON.stringify(value, null, 2) + "\n");
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
}
const contentFile = join(root, "src/lib/content.ts");
const compiled = ts.transpileModule(readFileSync(contentFile, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loadedModule = { exports: {} };
vm.runInNewContext(`(function(module, exports) { ${compiled}\n})`)(loadedModule, loadedModule.exports);
const { SITE, SERVICES, FAQ, PROCESS } = loadedModule.exports;
write("content.json", { purpose: "Read-only snapshot; runtime source remains src/lib/content.ts", site: SITE, services: SERVICES, faq: FAQ, process: PROCESS,
  experiments: { active: false, reason: "No conversion experiment or new offer was approved; existing copy remains active." } });

const claims = [];
const fragments = [];
const files = walk(join(root, "src")).filter((path) => path.endsWith(".tsx") || path === contentFile);
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const evidence = (node) => ({ file: relative(root, file), line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1 });
  function visit(node) {
    let claim;
    if (ts.isJsxText(node)) claim = node.text.replace(/\s+/g, " ").trim();
    if (ts.isStringLiteral(node) && file === contentFile && /[A-Za-zÄÖÜäöüß]/.test(node.text)) claim = node.text;
    if (ts.isStringLiteral(node) && ts.isPropertyAssignment(node.parent) && /^(title|description|t|d|k|v|q|a|label|sub)$/.test(node.parent.name.getText(sourceFile).replace(/["']/g, ""))) claim = node.text;
    if (claim && claim.length > 2) claims.push({ claim, source: ts.isStringLiteral(node) && ts.isPropertyAssignment(node.parent) && /^(seoTitle|seoDescription)$/.test(node.parent.name.getText(sourceFile).replace(/["\']/g, "")) ? "seo-editorial" : ["Angaben zum Betreiber von TarifWerk und zur Kontaktaufnahme.", "Informationen zur Datenverarbeitung bei TarifWerk und zu deinen Datenschutzrechten.", "Hinweise und Bedingungen zur Beratung und Vermittlung durch TarifWerk.", "Geschützter Zugang zum Mitarbeiterportal von TarifWerk."].includes(claim) ? "safe-neutral" : "input", evidence: evidence(node), verification: "Supplied source text; no independent verification of business or legal claims." });
    if (ts.isTemplateExpression(node) && !node.getText(sourceFile).includes("className") && node.templateSpans.some(span => /[A-Za-zÄÖÜäöüß]{3}/.test(span.literal.text)) && !/[a-z]-[a-z]|rounded-|px-|text-/.test(node.getText(sourceFile))) fragments.push({ template: node.getText(sourceFile), evidence: evidence(node) });
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}
write("claims.json", { scope: "Conservative inventory of supplied static text, including labels and code keys; not a certificate that every statement is true. Dynamic customer/advisor data is not exported.", claims,
  dynamicSources: ["Advisor fields: administrator-maintained PostgreSQL records", "Portal counts: permission-filtered PostgreSQL queries", "Referral counts: actual attributed leads; no reward approval implied", "Optional benefit wording: operator-provided server environment"], dynamicTextTemplates: fragments,
  unresolvedEvidence: ["Full business address is missing", "Availability and independence claims require operator confirmation", "No independent business, legal or testimonial verification was performed"] });
const seoSource = readFileSync(join(root, "src/lib/seo.ts"), "utf8");
const seoCompiled = ts.transpileModule(seoSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const seoModule = { exports: {} };
vm.runInNewContext(`(function(module, exports, require) { ${seoCompiled}\n})`, { URL })(seoModule, seoModule.exports, (name) => {
  if (name === "@/lib/content") return loadedModule.exports;
  throw new Error(`Unexpected SEO dependency: ${name}`);
});
const seo = [
  ...Object.entries(seoModule.exports.PAGE_SEO).map(([path, entry]) => ({ path, ...entry, canonical: new URL(path, SITE.url).href, source: "src/lib/seo.ts" })),
  ...SERVICES.map((service) => ({ path: `/leistungen/${service.slug}`, title: service.seoTitle, description: service.seoDescription, canonical: `${SITE.url}/leistungen/${service.slug}`, source: "src/lib/content.ts" })),
];
write("seo.json", { purpose: "Route inventory; Next.js metadata exports remain authoritative", routes: seo, dynamicRoutes: [{ path: "/berater/[slug]", source: "src/app/(site)/berater/[slug]/page.tsx", data: "Active public advisor records" }] });
const endpoints = walk(join(root, "src/app/api")).filter((path) => path.endsWith("/route.ts")).map((path) => ({ routePattern: "/" + relative(join(root, "src/app"), path).replace(/\/route.ts$/, ""), methods: [...readFileSync(path, "utf8").matchAll(/export async function (GET|POST|PATCH|DELETE|PUT)\(/g)].map((match) => match[1]) }));
write("config.json", { purpose: "Configuration inventory only; no credentials or separate runtime configuration", stack: "Next.js 16 / React 19 / PostgreSQL", staticHostingSupported: false,
  databaseRequired: true, runtimeSecrets: ["DATABASE_URL", "SESSION_SECRET"], oneTimeSetup: ["PORTAL_ADMIN_EMAIL", "PORTAL_ADMIN_PASSWORD"], optionalBenefits: ["REFERRAL_FRIEND_BENEFIT", "REFERRAL_REFERRER_BENEFIT"], endpoints,
  formFallback: "Existing local API routes remain authoritative. Failed requests never become a fake success; existing WhatsApp/contact alternatives remain available.", legalDataMissing: ["Full business address", "Operator-confirmed processing and retention details for referrals"], marketingChanged: false });
console.log(`Audit snapshots written: ${claims.length} supplied text entries, ${endpoints.length} endpoint patterns.`);
