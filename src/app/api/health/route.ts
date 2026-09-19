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
    await db.execute(sql`select employee_id from employee_images limit 0`);
    await db.execute(sql`select channel from team_messages limit 0`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
