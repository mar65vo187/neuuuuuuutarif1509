import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("DATABASE_URL ist im Build nicht gesetzt; Datenbankmigration wird übersprungen.");
  process.exit(0);
}

const result = spawnSync(process.execPath, ["scripts/migrate.mjs"], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error("Migration konnte nicht gestartet werden:", result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
