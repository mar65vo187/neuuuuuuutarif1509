import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser, isSameOriginRequest, listActivePortalSessions, revokeOtherPortalSessions } from "@/lib/auth";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { db } from "@/db";
import { writeAudit } from "@/lib/enterprise";

const schema = z.object({ action: z.literal("revoke_others") }).strict();

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  try {
    const sessions = await listActivePortalSessions(user);
    return NextResponse.json({ ok: true, sessions }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Sitzungen konnten nicht geladen werden." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  try {
    const parsed = schema.safeParse(await readJsonBody(request, 4096));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Ungültige Sitzungsaktion." }, { status: 422 });
    const revoked = await revokeOtherPortalSessions(user);
    await db.transaction(async (tx) => {
      await writeAudit(tx, user.id, "sessions.others.revoked", "employee", user.id, undefined, { revoked });
    });
    return NextResponse.json({ ok: true, revoked }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, error: "Andere Sitzungen konnten nicht abgemeldet werden." }, { status: 503 });
  }
}
