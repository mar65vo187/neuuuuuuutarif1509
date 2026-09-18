// Explicit, idempotent setup: node scripts/seed.mjs
// Existing profiles and passwords are preserved. Reset only with PORTAL_ADMIN_RESET_PASSWORD=true.
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}

const advisors = [
  {
    slug: "marvin-egenolf",
    name: "Marvin Noel Egenolf",
    title: "Gründer & Senior Sales Consultant",
    city: "Wiesbaden",
    region: "Rhein-Main",
    regions: ["Wiesbaden", "Mainz", "Frankfurt am Main", "Worms", "Deutschlandweit (digital)"],
    topics: ["Internet, Mobilfunk, TV", "Strom & Gas", "Versicherungen", "Sicherheitslösungen", "Klimaanlagen", "Solar (Photovoltaik) & Wärmepumpe", "Edelmetalle", "Immobilien"],
    bio: "Marvin hat TarifWerk gegründet, weil er selbst erlebt hat, wie unübersichtlich Verträge und große Entscheidungen sein können. Sein Anspruch: erklären, bis es wirklich verständlich ist – und danach erreichbar bleiben.",
    quote: "Ich will, dass du nach unserem Gespräch klarer siehst als davor. Alles andere ergibt sich.",
    phone: "+4915782301076",
    whatsapp: "4915782301076",
    email: "m.egenolf@tarifwerk.eu",
    initials: "ME",
    isFounder: true,
    sortOrder: 1,
  },
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const adminEmail = (process.env.PORTAL_ADMIN_EMAIL || "m.egenolf@tarifwerk.eu").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) throw new Error("PORTAL_ADMIN_EMAIL is invalid");
  const adminPassword = process.env.PORTAL_ADMIN_PASSWORD;
  const resetPassword = process.env.PORTAL_ADMIN_RESET_PASSWORD === "true";
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000 });
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("select pg_advisory_xact_lock(7480321)");
    const { rows } = await client.query("select id, role from employees where lower(email) = $1", [adminEmail]);
    if ((!rows.length || resetPassword) && (!adminPassword || adminPassword.length < 12 || adminPassword.length > 200)) {
      throw new Error("PORTAL_ADMIN_PASSWORD muss ein eigenes Passwort mit 12 bis 200 Zeichen enthalten.");
    }
    if (rows.length && rows[0].role !== "admin") {
      throw new Error("PORTAL_ADMIN_EMAIL gehört bereits zu einem Beraterkonto. Bitte eine andere Admin-Adresse verwenden.");
    }
    for (const a of advisors) {
      await client.query(
        `insert into advisors (slug, name, title, city, region, regions, topics, bio, quote, phone, whatsapp, email, initials, is_founder, sort_order)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         on conflict (slug) do nothing`,
        [a.slug, a.name, a.title, a.city, a.region, a.regions, a.topics, a.bio, a.quote, a.phone, a.whatsapp, a.email, a.initials, a.isFounder, a.sortOrder],
      );
    }
    const { rows: adv } = await client.query("select id from advisors where slug = 'marvin-egenolf'");
    if (!rows.length) {
      await client.query(
        `insert into employees (name, email, password_hash, role, advisor_id) values ($1,$2,$3,'admin',$4)`,
        ["Marvin Noel Egenolf", adminEmail, hashPassword(adminPassword), adv[0]?.id ?? null],
      );
      console.log(`Admin angelegt: ${adminEmail}`);
    } else if (resetPassword) {
      await client.query("update employees set password_hash = $1, active = true where id = $2", [hashPassword(adminPassword), rows[0].id]);
      console.log("Admin-Passwort erneuert; bestehende Sitzungen werden ungültig.");
    } else {
      console.log("Admin existiert bereits – Zugangsdaten unverändert.");
    }
    await client.query("COMMIT");
    console.log("Seed abgeschlossen.");
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Seed fehlgeschlagen:", error instanceof Error ? error.message : "Unbekannter Fehler");
  process.exitCode = 1;
});
