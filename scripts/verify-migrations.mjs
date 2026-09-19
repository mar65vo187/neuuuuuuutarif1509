import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL fehlt für die Migrationsprüfung.");

const requiredTables = [
  "employees",
  "employee_images",
  "advisors",
  "advisor_images",
  "leads",
  "lead_notes",
  "team_messages",
  "referrers",
  "referrals",
  "customers",
  "customer_lead_links",
  "customer_consents",
  "providers",
  "products",
  "orders",
  "order_status_history",
  "commission_events",
  "employee_compensation_profiles",
  "compensation_history",
  "loyalty_bonus_ledger",
  "provider_profiles",
  "product_catalog_profiles",
  "commission_list_versions",
  "commission_rate_versions",
  "benefit_pool_ledger",
  "product_updates",
  "incentive_campaigns",
  "training_modules",
  "employee_training_completions",
  "employee_benefits",
  "internal_documents",
  "reconciliation_imports",
  "tasks",
  "audit_events",
  "automation_rules",
  "automation_runs",
  "outbox_events",
  "notification_queue",
  "webhook_endpoints",
  "webhook_deliveries",
  "reconciliation_issues",
  "saved_views",
  "data_requests",
  "document_records",
  "teams",
  "team_members",
  "role_definitions",
  "permissions",
  "role_permissions",
  "employee_role_assignments",
  "mfa_credentials",
  "login_events",
  "referral_rewards",
  "referral_reward_events",
];

const pool = new Pool({
  connectionString: databaseUrl,
  max: 1,
  connectionTimeoutMillis: 10000,
  query_timeout: 12000,
});

try {
  const directory = new URL("../migrations/", import.meta.url);
  const applied = await pool.query("SELECT name, checksum FROM tarifwerk_migrations");
  const checksums = new Map(applied.rows.map((row) => [row.name, row.checksum]));

  for (const name of (await readdir(directory)).filter((file) => /^\d.*\.sql$/.test(file)).sort()) {
    const checksum = createHash("sha256").update(await readFile(new URL(name, directory))).digest("hex");
    if (checksums.get(name) !== checksum) throw new Error(`Migration nicht vollständig angewendet: ${name}`);
  }

  const { rows } = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1::text[])",
    [requiredTables],
  );
  const present = new Set(rows.map((row) => row.tablename));
  const missing = requiredTables.filter((table) => !present.has(table));
  if (missing.length) throw new Error(`Portal-Datenbankschema unvollständig: ${missing.join(", ")}`);

  console.log(`Migrationsprüfung erfolgreich: ${requiredTables.length} erforderliche Tabellen vorhanden.`);
} finally {
  await pool.end();
}
