import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const redirectPath = ".wrangler/deploy/config.json";
const redirect = JSON.parse(readFileSync(redirectPath, "utf8"));
if (!redirect.configPath || typeof redirect.configPath !== "string") {
  throw new Error("Generated Wrangler redirect has no configPath.");
}

const generatedPath = resolve(dirname(redirectPath), redirect.configPath);
const config = JSON.parse(readFileSync(generatedPath, "utf8"));
const flags = new Set(Array.isArray(config.compatibility_flags) ? config.compatibility_flags : []);
flags.add("nodejs_compat");
flags.add("global_fetch_strictly_public");
config.compatibility_flags = [...flags];

writeFileSync(generatedPath, JSON.stringify(config, null, 2) + "\n");
console.log(JSON.stringify({
  generatedConfig: generatedPath,
  main: config.main ?? null,
  compatibility_date: config.compatibility_date ?? null,
  compatibility_flags: config.compatibility_flags,
  assets: config.assets ?? null,
}, null, 2));
