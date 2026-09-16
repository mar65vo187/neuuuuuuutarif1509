import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { teamMessages } from "@/db/schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { listTeamMessages } from "@/lib/queries";
import { chatMessageSchema } from "@/lib/validation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
    const messages = await listTeamMessages(100);
    return NextResponse.json({ ok: true, messages, me: user.id }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Nachrichten konnten nicht geladen werden." }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } });
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  let user;
  try { user = await getCurrentUser(); }
  catch { return NextResponse.json({ ok: false, error: "Anmeldung momentan nicht überprüfbar. Bitte erneut versuchen." }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } }); }
  if (!user) return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
  let body: unknown;
  try {
    body = await readJsonBody(req, 8192);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." }, { status: error instanceof RequestBodyError ? error.status : 400 });
  }
  const parsed = chatMessageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Nachricht darf nicht leer sein." }, { status: 422 });
  try {
    await db.insert(teamMessages).values({ employeeId: user.id, body: parsed.data.body });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Senden fehlgeschlagen." }, { status: 500 });
  }
}
