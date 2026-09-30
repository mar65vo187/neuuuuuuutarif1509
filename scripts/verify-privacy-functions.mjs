// Prüft die Datenschutz-Funktionen (Migration 0026) gegen die Datenbank aus DATABASE_URL.
// Alle Testdaten laufen in einer Transaktion, die am Ende zurückgerollt wird.
import { readFile } from "node:fs/promises";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL fehlt für die Datenschutz-Prüfung.");

const sql = await readFile(new URL("./sql/verify-privacy-functions.sql", import.meta.url), "utf8");
const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 10000 });
client.on("notice", (notice) => console.log(notice.message));
await client.connect();
try {
  await client.query(sql);
  console.log("Datenschutz-Prüfung erfolgreich.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Datenschutz-Prüfung fehlgeschlagen:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
