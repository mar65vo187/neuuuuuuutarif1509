import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { config } from "dotenv";
import pg from "pg";

config({ path: [".env.local", ".env"], quiet: true });
let pool;
try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL fehlt.");
  if (!process.env.PORTAL_ADMIN_EMAIL) throw new Error("PORTAL_ADMIN_EMAIL fehlt.");
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000, query_timeout: 10000 });
  const directory = new URL("../migrations/", import.meta.url);
  const applied = await pool.query("SELECT name, checksum FROM tarifwerk_migrations");
  const checksums = new Map(applied.rows.map((row) => [row.name, row.checksum]));
  for (const name of (await readdir(directory)).filter((file) => /^\d.*\.sql$/.test(file)).sort()) {
    const checksum = createHash("sha256").update(await readFile(new URL(name, directory))).digest("hex");
    if (checksums.get(name) !== checksum) throw new Error(`Migration fehlt oder weicht ab: ${name}. npm run db:migrate ausführen.`);
  }
  for (const table of ["employees", "advisors", "advisor_images", "leads", "lead_notes", "team_messages", "referrers", "referrals"]) {
    // Identifiers are a fixed internal allowlist, never user input.
    await pool.query(`SELECT * FROM ${table} LIMIT 0`);
  }
  const result = await pool.query("SELECT id FROM employees WHERE lower(email) = $1 AND role = 'admin' AND active = true", [process.env.PORTAL_ADMIN_EMAIL.trim().toLowerCase()]);
  if (!result.rowCount) throw new Error("Kein aktiver Admin für PORTAL_ADMIN_EMAIL vorhanden. npm run db:seed ausführen bzw. Kontostatus prüfen.");
  console.log("PostgreSQL erreichbar; Migrationen, Portaltabellen und aktiver Admin geprüft.");
} catch (error) {
  // Driver error messages may contain connection details; expose only a safe code.
  if (pool && error.code) console.error(`Datenbankprüfung fehlgeschlagen (${String(error.code).replace(/[^A-Z0-9_]/gi, "").slice(0,40)}). Verbindung, Berechtigungen und Migrationen prüfen.`);
  else console.error(pool ? "Datenbankprüfung fehlgeschlagen. Migrationen und aktiven Admin mit db:migrate / db:seed prüfen." : error.message);
  process.exitCode = 1;
} finally {
  await pool?.end();
}
