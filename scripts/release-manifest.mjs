import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const output = resolve(process.argv[2] || ".tmp/release-manifest.json");
const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const migrationsDir = new URL("../migrations/", import.meta.url);
const migrationNames = (await readdir(migrationsDir)).filter((name) => /^\d.*\.sql$/.test(name)).sort();
const migrations = [];
for (const name of migrationNames) {
  const body = await readFile(new URL(name, migrationsDir));
  migrations.push({ name, sha256: createHash("sha256").update(body).digest("hex") });
}

async function directoryBytes(path) {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    let total = 0;
    for (const entry of entries) {
      const child = resolve(path, entry.name);
      total += entry.isDirectory() ? await directoryBytes(child) : (await stat(child)).size;
    }
    return total;
  } catch {
    return null;
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  revision: process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "unknown",
  ref: process.env.GITHUB_REF || null,
  node: process.version,
  package: {
    name: pkg.name,
    next: pkg.dependencies?.next ?? null,
    react: pkg.dependencies?.react ?? null,
    drizzle: pkg.dependencies?.["drizzle-orm"] ?? null,
    postgres: pkg.dependencies?.pg ?? null,
  },
  build: {
    nextBytes: await directoryBytes(resolve(".next")),
  },
  migrations,
  gates: [
    "perf:guard",
    "typecheck",
    "eslint --max-warnings=0",
    "tests",
    "production build",
    "migration verification",
    "backup/restore smoke",
  ],
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log("Release manifest written:", output);
