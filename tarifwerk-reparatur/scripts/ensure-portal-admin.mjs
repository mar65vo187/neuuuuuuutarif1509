// Stellt sicher, dass das konfigurierte Inhaber-Konto (PORTAL_ADMIN_EMAIL /
// PORTAL_OWNER_EMAIL) im Portal aktiv ist und Admin-Rechte hat.
//
// * Legt NIE ein Konto neu an und ändert NIE Passwort oder Profildaten.
// * Ein vorhandenes Konto mit dieser E-Mail wird nur auf role = 'admin' und
//   active = true gesetzt. Alle anderen Mitarbeiter, Leads und Kunden bleiben
//   unverändert.
// * Gibt keine E-Mail-Adressen, Namen oder Zugangsdaten aus (öffentliche Logs).
//
// Aufruf: DATABASE_URL=… PORTAL_ADMIN_EMAIL=… node scripts/ensure-portal-admin.mjs

import { config } from "dotenv";
import pg from "pg";

config({ path: [".env.local", ".env"], quiet: true });

const emails = [...new Set(
  [process.env.PORTAL_ADMIN_EMAIL, process.env.PORTAL_OWNER_EMAIL]
    .map((value) => (value || "").trim().toLowerCase())
    .filter(Boolean),
)];

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL fehlt.");
  process.exit(1);
}
if (!emails.length) {
  console.error("PORTAL_ADMIN_EMAIL fehlt.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10000 });
let missing = 0;
try {
  for (const [index, email] of emails.entries()) {
    const label = index === 0 ? "Admin-Konto (PORTAL_ADMIN_EMAIL)" : "Owner-Konto (PORTAL_OWNER_EMAIL)";
    const { rows } = await pool.query(
      "SELECT id, role, active FROM employees WHERE lower(email) = $1 ORDER BY id LIMIT 1",
      [email],
    );
    if (!rows.length) {
      missing += 1;
      console.error(`${label}: kein Mitarbeiterkonto mit dieser E-Mail gefunden.`);
      continue;
    }
    const account = rows[0];
    if (account.role === "admin" && account.active === true) {
      console.log(`${label}: vorhanden, aktiv, Admin.`);
      continue;
    }
    await pool.query("UPDATE employees SET role = 'admin', active = true WHERE id = $1", [account.id]);
    console.log(`${label}: auf aktiv + Admin gesetzt (Passwort und Profil unverändert).`);
  }

  const { rows: [counts] } = await pool.query(
    "SELECT count(*) FILTER (WHERE active)::int AS active_employees, count(*) FILTER (WHERE active AND role = 'admin')::int AS active_admins FROM employees",
  );
  console.log(`Aktive Mitarbeiterkonten: ${counts.active_employees} · davon Admins: ${counts.active_admins}`);
  if (missing) {
    console.error("Bitte die E-Mail in apphosting.yaml (PORTAL_ADMIN_EMAIL/PORTAL_OWNER_EMAIL) und im Workflow auf die Adresse setzen, mit der du dich im Portal anmeldest.");
    process.exitCode = 1;
  }
} catch (error) {
  const code = error?.code ? ` (${String(error.code).replace(/[^A-Z0-9_]/gi, "").slice(0, 40)})` : "";
  console.error(`Admin-Prüfung fehlgeschlagen${code}.`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
