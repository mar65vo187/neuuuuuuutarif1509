import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { advisors, employees } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { createAccountSchema } from "@/lib/admin-validation";
import { accountSelection, adminFailure, lockAdminMutation, authorizeAdmin, listAdminAccounts, readAdminJson } from "@/lib/admin-server";
import { writeAudit } from "@/lib/enterprise";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request, false);
    if (admin instanceof NextResponse) return admin;
    return NextResponse.json({ ok: true, users: await listAdminAccounts() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return adminFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const parsed = createAccountSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte die Eingaben prüfen." }, { status: 422 });
    const { advisor, password, ...account } = parsed.data;
    const passwordHash = hashPassword(password);
    const user = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      let advisorId: number | null = null;
      if (advisor) {
        const [profile] = await tx.insert(advisors).values({ ...advisor, name: account.name }).returning({ id: advisors.id });
        advisorId = profile.id;
      }
      const [created] = await tx.insert(employees).values({ ...account, passwordHash, advisorId }).returning(accountSelection);
      await tx.execute(sql`insert into employee_compensation_profiles (employee_id) values (${created.id}) on conflict (employee_id) do nothing`);
      await writeAudit(tx, admin.id, "employee.created", "employee", created.id, undefined, {
        name: created.name,
        email: created.email,
        role: created.role,
        active: created.active,
        advisorId: created.advisorId,
      });
      return created;
    });
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) { return adminFailure(error); }
}
