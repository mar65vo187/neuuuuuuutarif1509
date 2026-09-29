// Einmalige Datenbank-Initialisierung beim Deployment (plattformunabhängig).
//
// Ablauf:
//   1) Unter einem advisory lock den Datenbankzustand vor Änderungen prüfen.
//   2) Migrationen idempotent anwenden.
//   3) Nur eine wirklich leere Datenbank bekommt den Seed-Snapshot.
//      Eine bestehende Datenbank ohne Marker wird migriert, aber nie aus dem
//      Snapshot überschrieben.
//   4) Nach erfolgreichem Datenbank-Check den Initialisierungs-Marker setzen.
//
// Das ist wichtig, weil db-restore.mjs Tabellen für die Wiederherstellung
// absichtlich leert. Ein fehlender Marker allein beweist NICHT, dass die
// Datenbank leer oder neu ist.
//
// Aufruf:  node scripts/provision-database.mjs   (DATABASE_URL muss gesetzt sein)

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { getProvisioningMode } from "./database-provisioning-policy.mjs";

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

const pool = new pg.Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 20000 });
let lockClient;
let lockTransactionOpen = false;

try {
  lockClient = await pool.connect();

  // Transaction-level locks also work through Neon/PgBouncer transaction
  // pooling. Keep this transaction open while the child scripts run.
  await lockClient.query("BEGIN");
  lockTransactionOpen = true;
  await lockClient.query("SELECT pg_advisory_xact_lock(867392402)");

  const { rows: markerRows } = await pool.query(
    "SELECT to_regclass('public.tarifwerk_seeded') IS NOT NULL AS marker_table_exists",
  );
  const markerTableExists = markerRows[0].marker_table_exists;
  let markerSource = null;
  if (markerTableExists) {
    const { rows: sourceColumns } = await pool.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'tarifwerk_seeded'
           AND column_name IN ('marker', 'source')
         GROUP BY table_name
         HAVING count(DISTINCT column_name) = 2
       ) AS has_marker_and_source_columns`,
    );
    if (sourceColumns[0].has_marker_and_source_columns) {
      const { rows } = await pool.query(
        "SELECT source FROM public.tarifwerk_seeded WHERE marker = 'snapshot' LIMIT 1",
      );
      markerSource = rows[0]?.source ?? null;
    }
  }

  const { rows: tableRows } = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM pg_tables
       WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
         AND schemaname NOT LIKE 'pg_temp_%'
         AND schemaname NOT LIKE 'pg_toast_temp_%'
         AND tablename NOT IN ('tarifwerk_migrations', 'tarifwerk_seeded')
     ) AS has_user_tables`,
  );

  const mode = getProvisioningMode({
    markerTableExists,
    markerSource,
    hasUserTables: tableRows[0].has_user_tables,
  });

  run("migrate.mjs", "Datenbank-Migrationen anwenden");

  if (mode === "already-initialized") {
    console.log("[provision] Initialisierungs-Marker vorhanden – vorhandene Daten bleiben unverändert.");
  } else if (mode === "preserve-existing") {
    console.log("[provision] Bestehende Tabellen erkannt – Migrationen angewendet, Snapshot-Import übersprungen.");
  } else {
    const seedBackup = path.join(root, "seed-backup");
    if (!existsSync(path.join(seedBackup, "meta.json"))) {
      console.error("[provision] seed-backup/meta.json fehlt im Repository – Deployment abgebrochen.");
      process.exit(1);
    }

    if (mode === "seed-fresh") {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS tarifwerk_seeded (
           marker text PRIMARY KEY,
           source text NOT NULL,
           loaded_at timestamptz NOT NULL DEFAULT now()
         )`,
      );
      await pool.query(
        `INSERT INTO tarifwerk_seeded (marker, source)
         VALUES ('snapshot', 'seed-backup-in-progress')
         ON CONFLICT (marker) DO NOTHING`,
      );
    }

    run("db-restore.mjs", `Seed-Snapshot laden (${seedBackup})`, [
      "seed-backup",
      "--url",
      databaseUrl,
    ]);

    await pool.query(
      "UPDATE public.tarifwerk_seeded SET source = 'seed-backup' WHERE marker = 'snapshot'",
    );
    console.log("[provision] Seed-Snapshot geladen.");
  }

  run("db-check.mjs", "Datenbank-Check ausführen");

  if (mode === "preserve-existing") {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS tarifwerk_seeded (
         marker text PRIMARY KEY,
         source text NOT NULL,
         loaded_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await pool.query(
      `INSERT INTO tarifwerk_seeded (marker, source)
       VALUES ('snapshot', 'existing-database-preserved')
       ON CONFLICT (marker) DO NOTHING`,
    );
  }
} finally {
  if (lockClient) {
    if (lockTransactionOpen) await lockClient.query("ROLLBACK").catch(() => {});
    lockClient.release();
  }
  await pool.end();
}

console.log("[provision] Fertig – die Datenbank ist bereit.");
