import { promises as fs } from "node:fs";
import path from "node:path";

const roots = [
  "src/components/site",
  "src/components/home",
  "src/components/forms",
  "src/components/advisors",
  "src/components/ui",
];

const forbidden = [
  { pattern: /from\s+["']framer-motion["']/, message: "framer-motion belongs outside the public critical path" },
];

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const failures = [];
for (const root of roots) {
  const files = await walk(root).catch(() => []);
  for (const file of files) {
    const source = await fs.readFile(file, "utf8");
    for (const rule of forbidden) {
      if (rule.pattern.test(source)) failures.push(`${file}: ${rule.message}`);
    }
  }
}

if (failures.length) {
  console.error("Public performance guard failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Public performance guard passed.");
