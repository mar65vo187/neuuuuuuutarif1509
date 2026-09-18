import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  if (process.env.VERCEL_ENV === "production") {
    console.error("DATABASE_URL fehlt im Produktions-Build. Deployment wird zum Schutz des Portals abgebrochen.");
    process.exit(1);
  }
  console.log("DATABASE_URL ist im Build nicht gesetzt; Datenbankmigration wird außerhalb der Produktion übersprungen.");
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
