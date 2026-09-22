import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([".git", ".next", ".tmp", "node_modules"]);
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"];
const SCANNABLE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const errors = [];

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const absolute = path.join(dir, name);
    const stat = statSync(absolute);
    if (stat.isDirectory()) entries.push(...walk(absolute));
    else entries.push(absolute);
  }
  return entries;
}

const absoluteFiles = walk(ROOT);
const files = new Set(absoluteFiles.map((file) => path.relative(ROOT, file).split(path.sep).join("/")));

function requirePath(relative, reason) {
  if (!files.has(relative)) errors.push(`missing required file: ${relative} (${reason})`);
}

[
  ["src/app/(site)/agb/page.tsx", "public AGB route"],
  ["src/app/(site)/impressum/page.tsx", "public Impressum route"],
  ["src/app/(site)/datenschutz/page.tsx", "German privacy route"],
  ["src/app/(site)/datenschutz/en/page.tsx", "English privacy route"],
  ["src/content/legal/privacy-policy-de.ts", "complete German privacy source"],
  ["src/content/legal/privacy-policy-en.ts", "complete English privacy source"],
  ["src/components/site/PrivacyPolicyDocument.tsx", "privacy renderer"],
  ["scripts/tests/legal-pages.test.mjs", "AGB/Impressum regression test"],
  ["scripts/tests/privacy-policy.test.mjs", "privacy regression test"],
  [".env.example", "environment contract"],
  ["package.json", "package definition"],
  ["package-lock.json", "locked dependencies"],
  ["next.config.ts", "Next.js configuration"],
  ["src/app/robots.ts", "robots route"],
  ["src/app/sitemap.ts", "sitemap route"],
  ["public/favicon.svg", "site favicon"],
].forEach(([relative, reason]) => requirePath(relative, reason));

function resolveLocalImport(importerRelative, specifier) {
  let base;
  if (specifier.startsWith("@/")) {
    base = path.join(ROOT, "src", specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = path.resolve(ROOT, path.dirname(importerRelative), specifier);
  } else {
    return true;
  }

  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map((ext) => base + ext),
    ...SOURCE_EXTENSIONS.map((ext) => path.join(base, "index" + ext)),
  ];

  return candidates.some((candidate) => existsSync(candidate));
}

const importPatterns = [
  /(?:import|export)\s+(?:type\s+)?(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']/g,
  /import\(\s*["']([^"']+)["']\s*\)/g,
  /require\(\s*["']([^"']+)["']\s*\)/g,
];

for (const absolute of absoluteFiles) {
  if (!SCANNABLE_EXTENSIONS.has(path.extname(absolute))) continue;
  const relative = path.relative(ROOT, absolute).split(path.sep).join("/");
  if (relative === "next-env.d.ts") continue; // Next.js generates .next/types during build.
  const source = readFileSync(absolute, "utf8");
  for (const pattern of importPatterns) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (!resolveLocalImport(relative, specifier)) {
        errors.push(`unresolved local import in ${relative}: ${specifier}`);
      }
    }
  }
}

const packageJson = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
for (const [name, command] of Object.entries(packageJson.scripts ?? {})) {
  for (const match of String(command).matchAll(/(?:^|&&|;)\s*(?:node|bash)\s+([^\s;&|]+)/g)) {
    const referenced = match[1].replace(/^\.\//, "");
    if (referenced.startsWith("scripts/") && !files.has(referenced)) {
      errors.push(`package script "${name}" references missing file: ${referenced}`);
    }
  }
}

const workflowFiles = [...files].filter((file) => file.startsWith(".github/workflows/") && /\.ya?ml$/.test(file));
for (const workflow of workflowFiles) {
  const source = readFileSync(path.join(ROOT, workflow), "utf8");
  for (const match of source.matchAll(/(?:node|bash)\s+(scripts\/[A-Za-z0-9._/-]+)/g)) {
    const referenced = match[1];
    if (!files.has(referenced)) errors.push(`${workflow} references missing file: ${referenced}`);
  }
}

const agb = readFileSync(path.join(ROOT, "src/app/(site)/agb/page.tsx"), "utf8");
const impressum = readFileSync(path.join(ROOT, "src/app/(site)/impressum/page.tsx"), "utf8");
const privacyDe = readFileSync(path.join(ROOT, "src/content/legal/privacy-policy-de.ts"), "utf8");
const privacyEn = readFileSync(path.join(ROOT, "src/content/legal/privacy-policy-en.ts"), "utf8");

if (!/8\. Empfehlungsprogramm/.test(agb) || !/13\. Schlussbestimmungen/.test(agb)) {
  errors.push("AGB completeness markers are missing");
}
for (const marker of ["Marvin Noel Egenolf", "Karawankenstraße 1", "65187 Wiesbaden", "m.egenolf@tarifwerk.eu"]) {
  if (!impressum.includes(marker)) errors.push(`Impressum marker missing: ${marker}`);
}
if (privacyDe.length < 40000) errors.push("German privacy policy appears truncated");
if (privacyEn.length < 35000) errors.push("English privacy policy appears truncated");

if (errors.length) {
  console.error("Repository completeness audit failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Repository completeness audit passed: ${files.size} files checked; legal sources, CI scripts and local imports are complete.`);
