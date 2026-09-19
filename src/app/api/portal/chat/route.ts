import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { teamMessages } from "@/db/schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { listTeamMessages } from "@/lib/queries";
import { chatMessageSchema } from "@/lib/validation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";

function resolveChannel(request: NextRequest): "all" | "admins" | null {
  const channel = request.nextUrl.searchParams.get("channel") ?? "all";
  return channel === "all" || channel === "admins" ? channel : null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });
    const channel = resolveChannel(request);
    if (!channel) return NextResponse.json({ ok: false, error: "Unbekannter Chat-Kanal." }, { status: 400 });
    if (channel === "admins" && user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Dieser Chat ist nur für Administratoren sichtbar." }, { status: 403 });
    }
    const messages = await listTeamMessages(channel, 100, user);
    return NextResponse.json(
      { ok: true, messages, me: user.id, role: user.role, channel },
      { headers: { "Cache-Control": "private, no-store" } },
    );
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
  if (parsed.data.channel === "admins" && user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Nur Administratoren dürfen diesen Chat verwenden." }, { status: 403 });
  }

  try {
    await db.insert(teamMessages).values({ employeeId: user.id, body: parsed.data.body, channel: parsed.data.channel });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Senden fehlgeschlagen." }, { status: 500 });
  }
}
