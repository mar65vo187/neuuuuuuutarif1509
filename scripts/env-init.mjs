import { randomBytes } from "node:crypto";
import { lstat, writeFile } from "node:fs/promises";

// Never replace existing configuration: rotating a session key logs everybody out.
try {
  for (const path of [".env", ".env.local"]) {
    const exists = await lstat(path).then(() => true, (error) => {
      if (error.code === "ENOENT") return false;
      throw error;
    });
    if (exists) throw new Error(`${path} existiert bereits. Bestehende Konfiguration bleibt unverändert.`);
  }
  const password = randomBytes(32).toString("hex");
  const content = [
    "# Lokal erzeugte Zugangsdaten. Nicht hochladen oder weitergeben.",
    "# PostgreSQL wird mit npm run db:up gestartet; Daten bleiben im Docker-Volume.",
    `DATABASE_URL=postgresql://tarifwerk:${password}@127.0.0.1:5432/tarifwerk`,
    `POSTGRES_PASSWORD=${password}`,
    `SESSION_SECRET=${randomBytes(48).toString("hex")}`,
    "PORTAL_ADMIN_EMAIL=m.egenolf@tarifwerk.eu",
    `PORTAL_ADMIN_PASSWORD=${randomBytes(24).toString("base64url")}`,
    "",
  ].join("\n");
  await writeFile(".env.local", content, { flag: "wx", mode: 0o600 });
  console.log(".env.local mit individuellen Zugangsdaten angelegt. Admin-Passwort nur dort ablesen.");
  console.log("Weiter: npm run db:up && npm run db:setup && npm run dev");
} catch (error) {
  console.error(error?.code === "EEXIST" ? ".env.local existiert bereits; nichts überschrieben." : error.message);
  process.exitCode = 1;
}
