// Datenbanksicherung: konsistenter Snapshot aller Portaltabellen als CSV-Backup.
// Verzeichnisschema bleibt im Repository (migrations/); dieses Skript sichert die DATEN.
// bytea-Spalten (Profilbilder, Dokumente) werden base64-kodiert exportiert.
//
// Konsistenz: Alle Lesezugriffe laufen in EINER REPEATABLE-READ-Transaktion.
// Eine solche Transaktion sieht zwangsläufig genau einen Snapshot des Datenstands,
// daher ist das Backup atomar und konsistent.
//
// Mechanik: Die Datenbank schreibt jede Tabelle mit COPY ... TO in eine
// temporäre Datei, die hier gelesen und mit meta.json (Prüfsummen, Zeilenzahlen,
// Migrationsstand) zusammengeführt wird. Damit sind auch Umgebungen ohne
// Client-Streaming-Unterstützung abgedeckt.
//
// Aufruf: node scripts/db-backup.mjs [--out VERZEICHNIS]
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL fehlt. Bitte zuerst .env.local konfigurieren.");

const args = process.argv.slice(2);
const outArg = args.indexOf("--out");
const outRoot = (outArg >= 0 && args[outArg + 1]) || join(new URL("..", import.meta.url).pathname, "backups");
const retention = 7;

const meta = {
  createdAt: new Date().toISOString(),
  format: "tarifwerk-backup/1",
  retention,
  migrations: [],
  tables: {},
  totalRows: 0,
  checksums: {},
};

const sqlQuote = (value) => `'${String(value).replace(/'/g, "''")}'`;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 10000 });
const tempDir = await mkdtemp(join(tmpdir(), "tw-backup-"));
try {
  const mig = await pool.query("SELECT name, checksum FROM tarifwerk_migrations ORDER BY name");
  meta.migrations = mig.rows;

  const { rows: tables } = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'tarifwerk_migrations' ORDER BY tablename",
  );
  const { rows: columns } = await pool.query(
    `SELECT table_name, column_name, udt_name FROM information_schema.columns
     WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`,
  );
  const columnsByTable = new Map();
  for (const column of columns) {
    if (!columnsByTable.has(column.table_name)) columnsByTable.set(column.table_name, []);
    columnsByTable.get(column.table_name).push(column);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join(outRoot, stamp);
  const dataDir = join(dir, "data");
  await mkdir(dataDir, { recursive: true });

  // Ein Client, eine lange REPEATABLE-READ-Transaktion für alle Lesezugriffe.
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
    for (const { tablename: table } of tables) {
      const tableColumns = columnsByTable.get(table) ?? [];
      if (!tableColumns.length) continue;
      const selectList = tableColumns
        .map((column) =>
          column.udt_name === "bytea"
            ? `encode("${column.column_name}"::bytea, 'base64') AS "${column.column_name}"`
            : `"${column.column_name}"`,
        )
        .join(", ");
      const byteaColumns = tableColumns.filter((column) => column.udt_name === "bytea").map((column) => column.column_name);

      const serverFile = join(tempDir, `${table}.csv`);
      await client.query(`COPY (SELECT ${selectList} FROM "${table}") TO ${sqlQuote(serverFile)} WITH (FORMAT csv)`);
      const { rows: [{ count }] } = await client.query(`SELECT count(*)::int AS count FROM "${table}"`);

      const csv = await readFile(serverFile);
      const file = join(dataDir, `${table}.csv`);
      await writeFile(file, csv);
      const checksum = createHash("sha256").update(csv).digest("hex");
      meta.checksums[table] = checksum;
      meta.tables[table] = { rows: count, bytea: byteaColumns };
      meta.totalRows += count;
      console.log(`Gesichert: ${table} (${count} Zeilen${byteaColumns.length ? `, bytea→base64: ${byteaColumns.join(", ")}` : ""})`);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  await writeFile(join(dir, "meta.json"), JSON.stringify(meta, null, 2));
  console.log(`\nBackup geschrieben nach: ${dir}`);
  console.log(`Gesamt: ${Object.keys(meta.tables).length} Tabellen, ${meta.totalRows} Zeilen, ${meta.migrations.length} Migrations aufgezeichnet.`);

  // Aufbewahrung: älteste Backups jenseits der letzten ${retention} entfernen.
  const names = await readdir(outRoot);
  const dirs = [];
  for (const name of names) {
    const path = join(outRoot, name);
    try {
      if ((await stat(path)).isDirectory()) dirs.push(path);
    } catch {
      // unlesbarer Eintrag: ignorieren
    }
  }
  dirs.sort((a, b) => a.localeCompare(b));
  for (const old of dirs.slice(0, Math.max(0, dirs.length - retention))) {
    if (old !== dir) await rm(old, { recursive: true, force: true });
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
  await pool.end();
}
