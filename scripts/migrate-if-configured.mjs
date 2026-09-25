import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL ist im Build nicht gesetzt; Datenbankmigration wird übersprungen. Datenbankgebundene Portal-Funktionen benötigen DATABASE_URL zur Laufzeit.");
  process.exit(0);
}

for (const script of ["scripts/migrate.mjs", "scripts/verify-migrations.mjs"]) {
  const result = spawnSync(process.execPath, [script], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    console.error(`${script} konnte nicht gestartet werden:`, result.error.message);
    process.exit(1);
  }
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}
