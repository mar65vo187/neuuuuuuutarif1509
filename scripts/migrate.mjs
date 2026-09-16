import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL fehlt. Bitte zuerst .env.local konfigurieren.");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
const directory = fileURLToPath(new URL("../migrations/", import.meta.url));
let client;
try {
  client = await pool.connect();
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(867392401)");
  await client.query("CREATE TABLE IF NOT EXISTS tarifwerk_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
  const files = (await readdir(directory)).filter((name) => /^\d.*\.sql$/.test(name)).sort();
  for (const name of files) {
    const sql = await readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const { rows } = await client.query("SELECT checksum FROM tarifwerk_migrations WHERE name = $1", [name]);
    if (rows.length) {
      if (rows[0].checksum !== checksum) throw new Error(`Bereits ausgeführte Migration wurde verändert: ${name}`);
      console.log(`Bereits angewendet: ${name}`);
      continue;
    }
    await client.query(sql);
    await client.query("INSERT INTO tarifwerk_migrations (name, checksum) VALUES ($1, $2)", [name, checksum]);
    console.log(`Angewendet: ${name}`);
  }
  await client.query("COMMIT");
  console.log("Datenbankmigration abgeschlossen.");
} catch (error) {
  if (client) await client.query("ROLLBACK").catch(() => {});
  console.error("Migration fehlgeschlagen:", error instanceof Error ? error.message : "Unbekannter Fehler");
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
