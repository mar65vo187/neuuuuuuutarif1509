// Datenbank-Restore aus einem Backup von scripts/db-backup.mjs.
// Standardziel: neue Scratch-Datenbank (Produktion bleibt unangetastet).
// Aufruf:
//   node scripts/db-restore.mjs <backup-verzeichnis>                  → Scratch-DB (Verifikation)
//   node scripts/db-restore.mjs <backup-verzeichnis> --drop           → Scratch-DB, danach löschen
//   node scripts/db-restore.mjs <backup-verzeichnis> --url <PG-URL>   → in die angegebene DB wiederherstellen
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const args = process.argv.slice(2);
const backupDir = args.find((value, index) => value && !value.startsWith("--") && args[index - 1] !== "--url");
const urlArgIndex = args.indexOf("--url");
const explicitUrl = urlArgIndex >= 0 ? args[urlArgIndex + 1] : "";
const dropScratch = args.includes("--drop");
if (!backupDir) {
  console.error("Verwendung: node scripts/db-restore.mjs <backup-verzeichnis> [--url <PG-URL>] [--drop]");
  process.exit(1);
}
if (explicitUrl && !explicitUrl.startsWith("postgresql://") && !explicitUrl.startsWith("postgres://")) {
  console.error("--url muss eine PostgreSQL-Verbindungs-URL sein.");
  process.exit(1);
}

const meta = JSON.parse(await readFile(join(backupDir, "meta.json"), "utf8"));
if (meta.format !== "tarifwerk-backup/1") throw new Error(`Unbekanntes Backup-Format: ${meta.format ?? "(fehlend)"}`);

// 1) Backup-Integrität: Prüfsummen aller CSV-Dateien gegen meta.json.
const files = await readdir(join(backupDir, "data"));
for (const file of files) {
  const content = await readFile(join(backupDir, "data", file));
  const checksum = createHash("sha256").update(content).digest("hex");
  const expected = meta.checksums[file.replace(/\.csv$/, "")];
  if (expected !== checksum) throw new Error(`Prüfsumme weicht ab für ${file}`);
}
console.log(`Backup-Integrität ok: ${files.length} Dateien, ${meta.totalRows} Zeilen, Stand ${meta.createdAt}.`);

// 2) Ziel-Datenbank: Scratch (neue DB) oder explizit angegeben.
const sourceUrl = explicitUrl || process.env.DATABASE_URL;
if (!sourceUrl) throw new Error("Kein Ziel: --url angeben oder DATABASE_URL in .env.local setzen.");
const admin = new pg.Pool({ connectionString: sourceUrl, max: 1, connectionTimeoutMillis: 10000 });
let scratchName = "";
let targetUrl;
if (explicitUrl) {
  targetUrl = explicitUrl;
  console.log("Ziel: angegebene Datenbank (VORSICHT: vorhandene Daten werden überschrieben).");
} else {
  scratchName = `tarifwerk_restore_${Date.now()}`;
  await admin.query(`CREATE DATABASE "${scratchName}"`);
  const parsedSource = new URL(sourceUrl);
  parsedSource.pathname = `/${scratchName}`;
  targetUrl = parsedSource.toString();
  console.log(`Ziel: Scratch-Datenbank "${scratchName}".`);
}
await admin.end();

// 3) Schema: Migrations aus dem Repository auf das Ziel anwenden.
const migrate = spawnSync(process.execPath, ["scripts/migrate.mjs"], {
  env: { ...process.env, DATABASE_URL: targetUrl },
  stdio: "inherit",
  cwd: new URL("..", import.meta.url).pathname,
});
if (migrate.status !== 0) throw new Error("Migration auf dem Ziel fehlgeschlagen.");

const target = new pg.Pool({ connectionString: targetUrl, max: 3, connectionTimeoutMillis: 15000 });
const results = [];
const restoreTempDir = await mkdtemp(join(tmpdir(), "tw-restore-"));
const sqlQuote = (value) => `'${String(value).replace(/'/g, "''")}'`;
try {
  // 4) Fremdschlüssel-Reihenfolge (Topologisch) für die wiederholbare Wiederherstellung.
  const { rows: fkRows } = await target.query(
    `SELECT conrelid::regclass::text AS child, confrelid::regclass::text AS parent
     FROM pg_constraint
     WHERE contype = 'f' AND connamespace = 'public'::regnamespace`,
  );
  const names = Object.keys(meta.tables);
  const dependsOn = new Map(names.map((name) => [name, new Set()]));
  for (const row of fkRows) {
    const child = row.child.replace(/^public\./, "");
    const parent = row.parent.replace(/^public\./, "");
    if (dependsOn.has(child) && dependsOn.has(parent) && child !== parent) dependsOn.get(child).add(parent);
  }
  const ordered = [];
  const placed = new Set();
  const visit = (name, trail) => {
    if (placed.has(name)) return;
    if (trail.has(name)) throw new Error(`Zyklus in Fremdschlüssel-Beziehungen bei ${name}`);
    trail.add(name);
    for (const parent of dependsOn.get(name) ?? []) visit(parent, trail);
    trail.delete(name);
    placed.add(name);
    ordered.push(name);
  };
  for (const name of names) visit(name, new Set());

  // Replikationsmodus (best effort, superuser-only) überspringt zusätzlich
  // die Ledger-Schutz-Trigger; ansonsten genügt die Topologie-Reihenfolge.
  let replicaCapable = false;
  {
    const probe = await target.connect();
    try {
      await probe.query("SET session_replication_role = 'replica'");
      replicaCapable = true;
      await probe.query("RESET session_replication_role");
    } catch {
      replicaCapable = false;
    } finally {
      probe.release();
    }
  }

  for (const name of ordered) {
    const table = meta.tables[name];
    const csv = await readFile(join(backupDir, "data", `${name}.csv`));
    const client = await target.connect();
    if (replicaCapable) await client.query("SET session_replication_role = 'replica'");
    try {
      await client.query(`BEGIN`);
      await client.query(`TRUNCATE TABLE "${name}" CASCADE`);
      if (table.bytea?.length) {
        // bytea (base64 im Backup) über Staging-Table mit TEXT-Spalten zurückführen.
        const staging = `tmp_restore_${name}`;
        await client.query(`CREATE TABLE "${staging}" (LIKE "${name}")`);
        for (const column of table.bytea) {
          await client.query(`ALTER TABLE "${staging}" ALTER COLUMN "${column}" TYPE text USING encode("${column}", 'base64')`);
        }
        await copyCsvFromServerFile(client, staging, csv);
        const { rows: cols } = await client.query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
          [name],
        );
        const selectList = cols.map(({ column_name: c }) => (table.bytea.includes(c) ? `decode("${c}", 'base64') AS "${c}"` : `"${c}"`)).join(", ");
        const columnList = cols.map(({ column_name: c }) => `"${c}"`).join(", ");
        await client.query(`INSERT INTO "${name}" (${columnList}) SELECT ${selectList} FROM "${staging}"`);
        await client.query(`DROP TABLE "${staging}"`);
      } else {
        await copyCsvFromServerFile(client, name, csv);
      }
      const { rows: [{ count }] } = await client.query(`SELECT count(*)::int AS count FROM "${name}"`);
      if (count !== table.rows) throw new Error(`${name}: Zeilenzahl ${count} erwartet ${table.rows}`);
      await client.query(`COMMIT`);
      results.push({ table: name, rows: count, ok: true });
      console.log(`Wiederhergestellt: ${name} (${count} Zeilen)`);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      await client.query("RESET session_replication_role").catch(() => {});
      client.release();
    }
  }

  console.log(`\nRestore abgeschlossen: ${results.length} Tabellen, ${results.reduce((sum, row) => sum + row.rows, 0)} Zeilen. Integrität geprüft.`);
} finally {
  await rm(restoreTempDir, { recursive: true, force: true });
  await target.end();
}

if (scratchName) {
  const admin2 = new pg.Pool({ connectionString: sourceUrl, max: 1, connectionTimeoutMillis: 10000 });
  if (dropScratch) {
    await admin2.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`, [scratchName]);
    await admin2.query(`DROP DATABASE "${scratchName}"`);
    console.log(`Scratch-Datenbank "${scratchName}" gelöscht.`);
  } else {
    console.log(`Scratch-Datenbank "${scratchName}" erhalten. Löschen mit: node scripts/db-restore.mjs ${backupDir} --drop oder DROP DATABASE.`);
  }
  await admin2.end();
}

// Die Datenbank liest die CSV-Datei selbst (COPY ... FROM <datei>). Das
// funktioniert in jeder Umgebung, in der Server und App dasselbe Dateisystem
// teilen (Docker, VPS, lokale Instanz). Bei administrativ oder remote
// betriebenen Datenbanken (z. B. Neon) greift der Fallback auf
// Client-Streaming (COPY ... FROM STDIN) zurück.
async function copyCsvFromServerFile(client, table, csv) {
  const serverFile = join(restoreTempDir, `${table}.csv`);
  await writeFile(serverFile, csv);
  try {
    await client.query(`COPY "${table}" FROM ${sqlQuote(serverFile)} WITH (FORMAT csv)`);
  } catch (serverFileError) {
    const message = serverFileError instanceof Error ? serverFileError.message : String(serverFileError);
    if (!/permission denied|must be superuser|not allowed|read from local files|local files/i.test(message)) throw serverFileError;
    await copyCsvFromClientStream(client, table, csv);
  } finally {
    await rm(serverFile, { force: true });
  }
}

async function copyCsvFromClientStream(client, table, csv) {
  const copyQuery = new pg.Query({ name: `restore-${table}`, text: `COPY "${table}" FROM STDIN WITH (FORMAT csv)` });
  await new Promise((resolve, reject) => {
    client.query(copyQuery, (error) => {
      if (error) { reject(error); return; }
      const stream = copyQuery.stream;
      stream.on("error", reject);
      stream.end(csv, (endError) => (endError ? reject(endError) : resolve()));
    });
  });
}
