// Idempotent Firebase App Hosting runtime initialization.
//
// - Applies the checksum-protected SQL migrations.
// - Seeds the tracked snapshot only for a genuinely new, empty application DB.
// - Never loads the snapshot into an existing TarifWerk schema.
// - Serializes concurrent cold starts so App Hosting instances cannot migrate
//   or initialize the same database at the same time.
//
// DATABASE_URL must point to the Firebase project's PostgreSQL instance.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("[provision] DATABASE_URL fehlt – Initialisierung abgebrochen.");
  process.exit(1);
}

function run(script, label, extraArgs = []) {
  console.log(`[provision] ${label} …`);
  const result = spawnSync(process.execPath, [path.join(root, "scripts", script), ...extraArgs], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
    cwd: root,
  });
  if (result.error) throw new Error(`${label} konnte nicht gestartet werden: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${label} ist fehlgeschlagen.`);
}

const pool = new pg.Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 20000 });
let client;
let locked = false;

try {
  client = await pool.connect();
  // Separate setup lock: the migration script uses a transaction-level lock.
  await client.query("SELECT pg_advisory_lock(867392402)");
  locked = true;

  // Record whether the database already belonged to TarifWerk BEFORE applying
  // migrations. A marker-less existing install must never receive the seed CSV,
  // because the restore correctly truncates target tables before importing.
  const priorSchema = await client.query(`
    SELECT (
      to_regclass('public.tarifwerk_migrations') IS NOT NULL OR
      to_regclass('public.employees') IS NOT NULL OR
      to_regclass('public.advisors') IS NOT NULL OR
      to_regclass('public.leads') IS NOT NULL OR
      to_regclass('public.customers') IS NOT NULL
    ) AS exists
  `);
  const existingInstall = priorSchema.rows[0]?.exists === true;

  run("migrate.mjs", "Datenbank-Migrationen anwenden");

  const markerTable = await client.query("SELECT to_regclass('public.tarifwerk_seeded') AS marker");
  let initialized = false;
  if (markerTable.rows[0]?.marker) {
    const marker = await client.query("SELECT source FROM tarifwerk_seeded WHERE marker = 'snapshot'");
    if (!marker.rowCount) {
      throw new Error("Initialisierungs-Marker ist unvollständig. Datenbank vor dem Start prüfen; kein Seed wird automatisch geladen.");
    }
    initialized = true;
    console.log(`[provision] Datenbank initialisiert (${marker.rows[0].source}); vorhandene Daten bleiben unverändert.`);
  } else if (existingInstall) {
    console.log("[provision] Vorhandene TarifWerk-Datenbank erkannt; Repository-Snapshot wird NICHT geladen.");
    run("db-check.mjs", "Vorhandene Datenbank prüfen");
    await createMarker(client, "existing-data-preserved");
    initialized = true;
  } else {
    const seedBackup = path.join(root, "seed-backup");
    if (!existsSync(path.join(seedBackup, "meta.json"))) {
      throw new Error("seed-backup/meta.json fehlt – Datenbank bleibt unverändert.");
    }
    console.log("[provision] Neue TarifWerk-Datenbank erkannt; geprüften Ausgangs-Snapshot laden …");
    run("db-restore.mjs", `Seed-Snapshot laden (${seedBackup})`, ["seed-backup", "--url", databaseUrl]);
    await createMarker(client, "seed-backup");
    initialized = true;
  }

  run("db-check.mjs", "Datenbank-Check ausführen");
  console.log(`[provision] Fertig – Firebase-PostgreSQL ist bereit${initialized ? "." : ""}`);
} catch (error) {
  console.error("[provision] Start abgebrochen:", error instanceof Error ? error.message : "Unbekannter Fehler");
  process.exitCode = 1;
} finally {
  if (locked && client) await client.query("SELECT pg_advisory_unlock(867392402)").catch(() => {});
  client?.release();
  await pool.end();
}

async function createMarker(connection, source) {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS tarifwerk_seeded (
       marker text PRIMARY KEY,
       source text NOT NULL,
       loaded_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
  await connection.query(
    `INSERT INTO tarifwerk_seeded (marker, source)
     VALUES ('snapshot', $1)
     ON CONFLICT (marker) DO NOTHING`,
    [source],
  );
}
