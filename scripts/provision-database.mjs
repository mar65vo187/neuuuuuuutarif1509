// Einmalige Datenbank-Initialisierung beim Deployment (plattformunabhängig).
//
// Ablauf:
//   1) Migrations anwenden (idempotent, mit Prüfsummen in tarifwerk_migrations).
//   2) Ist die Datenbank noch nicht initialisiert (kein Marker-Table),
//      wird der Seed-Snapshot aus seed-backup/ geladen – inkl. Integritäts-
//      prüfung (Prüfsummen) und Zeilenverifikation je Tabelle.
//   3) Datenbank-Check (Migrations + Pflichttabellen).
//
// Der Marker stellt sicher, dass vorhandene Produktionsdaten NIEMALS
// überschrieben werden – auch nicht, falls ein Admin später bewusst alle
// Einträge löscht. Nur die allererste Initialisierung lädt den Snapshot.
//
// Aufruf:  node scripts/provision-database.mjs   (DATABASE_URL muss gesetzt sein)

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.dirname(path.join(fileURLToPath(import.meta.url), ".."));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("[provision] DATABASE_URL fehlt – die Initialisierung wurde abgebrochen.");
  process.exit(1);
}

const run = (script, label, extraArgs = []) => {
  console.log(`[provision] ${label} …`);
  const result = spawnSync(process.execPath, [path.join(root, "scripts", script), ...extraArgs], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
    cwd: root,
  });
  if (result.status !== 0) {
    console.error(`[provision] „${label}“ ist fehlgeschlagen – Deployment abgebrochen, damit keine halbe Datenbank entsteht.`);
    process.exit(result.status ?? 1);
  }
};

run("migrate.mjs", "Datenbank-Migrationen anwenden");

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 20000 });
try {
  const { rows } = await pool.query("SELECT to_regclass('public.tarifwerk_seeded') AS marker");
  if (rows[0].marker) {
    console.log("[provision] Datenbank ist bereits initialisiert – vorhandene Daten bleiben unverändert.");
  } else {
    const seedBackup = path.join(root, "seed-backup");
    if (!existsSync(path.join(seedBackup, "meta.json"))) {
      console.error("[provision] seed-backup/meta.json fehlt im Repository – Deployment abgebrochen.");
      process.exit(1);
    }
    run("db-restore.mjs", `Seed-Snapshot laden (${seedBackup})`, [
      "seed-backup",
      "--url",
      databaseUrl,
    ]);
    await pool.query(
      `CREATE TABLE IF NOT EXISTS tarifwerk_seeded (
         marker text PRIMARY KEY,
         source text NOT NULL,
         loaded_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await pool.query(
      `INSERT INTO tarifwerk_seeded (marker, source)
       VALUES ('snapshot', 'seed-backup')
       ON CONFLICT (marker) DO NOTHING`,
    );
    console.log("[provision] Seed-Snapshot geladen, Initialisierungs-Marker gesetzt.");
  }
} finally {
  await pool.end();
}

run("db-check.mjs", "Datenbank-Check ausführen");
console.log("[provision] Fertig – die Datenbank ist bereit.");
