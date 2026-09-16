import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { advisors, employees } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { createAccountSchema } from "@/lib/admin-validation";
import { accountSelection, adminFailure, lockAdminMutation, authorizeAdmin, listAdminAccounts, readAdminJson } from "@/lib/admin-server";

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
      return created;
    });
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) { return adminFailure(error); }
}
