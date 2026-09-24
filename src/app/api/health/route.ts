import { pool } from "@/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REQUIRED_TABLES = [
  "customers", "orders", "tasks", "commission_events", "automation_rules", "login_events",
  "referral_rewards", "employee_compensation_profiles", "compensation_history", "loyalty_bonus_ledger",
  "provider_profiles", "product_catalog_profiles", "commission_list_versions", "commission_rate_versions",
  "benefit_pool_ledger", "product_updates", "product_update_reads", "incentive_campaigns", "training_modules",
  "employee_training_completions", "employee_benefits", "internal_documents", "reconciliation_imports",
  "employee_images", "team_messages", "portal_sessions", "portal_login_rate_limits",
  "marketing_campaign_spend", "public_intake_rate_limits", "ai_assistant_usage",
  "optimization_subscriptions", "optimization_requests", "optimization_offers", "optimization_documents", "optimization_events", "optimization_contract_notices",
  "prospect_contacts", "prospect_contact_product_links",
] as const;

export async function GET() {
  const started = Date.now();
  try {
    const result = await pool.query<{ missing: string[] }>(
      `select coalesce(array_agg(name) filter (where to_regclass('public.' || name) is null), array[]::text[]) as missing
       from unnest($1::text[]) as required(name)`,
      [REQUIRED_TABLES],
    );
    const missing = Array.isArray(result.rows[0]?.missing) ? result.rows[0].missing : [];
    if (missing.length) {
      return Response.json(
        { ok: false, status: "degraded", missingTables: missing.length },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json(
      { ok: true, status: "healthy", database: "ready", durationMs: Date.now() - started },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { ok: false, status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
