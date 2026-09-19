import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    await db.execute(sql`select id from customers limit 0`);
    await db.execute(sql`select id from orders limit 0`);
    await db.execute(sql`select id from tasks limit 0`);
    await db.execute(sql`select id from commission_events limit 0`);
    await db.execute(sql`select id from automation_rules limit 0`);
    await db.execute(sql`select id from login_events limit 0`);
    await db.execute(sql`select id from referral_rewards limit 0`);
    await db.execute(sql`select employee_id from employee_compensation_profiles limit 0`);
    await db.execute(sql`select id from compensation_history limit 0`);
    await db.execute(sql`select id from loyalty_bonus_ledger limit 0`);
    await db.execute(sql`select provider_id from provider_profiles limit 0`);
    await db.execute(sql`select product_id from product_catalog_profiles limit 0`);
    await db.execute(sql`select id from commission_list_versions limit 0`);
    await db.execute(sql`select id from commission_rate_versions limit 0`);
    await db.execute(sql`select id from benefit_pool_ledger limit 0`);
    await db.execute(sql`select id from product_updates limit 0`);
    await db.execute(sql`select update_id from product_update_reads limit 0`);
    await db.execute(sql`select id from incentive_campaigns limit 0`);
    await db.execute(sql`select id from training_modules limit 0`);
    await db.execute(sql`select id from employee_training_completions limit 0`);
    await db.execute(sql`select id from employee_benefits limit 0`);
    await db.execute(sql`select id from internal_documents limit 0`);
    await db.execute(sql`select id from reconciliation_imports limit 0`);
    await db.execute(sql`select employee_id from employee_images limit 0`);
    await db.execute(sql`select channel from team_messages limit 0`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
