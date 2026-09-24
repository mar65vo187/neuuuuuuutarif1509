import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { teamMessages } from "@/db/schema";
import { getCurrentUser, isPortalOwner, isSameOriginRequest } from "@/lib/auth";
import { findChatRecipient, listChatRecipients, listTeamMessages, type ChatChannel } from "@/lib/queries";
import { chatMessageSchema } from "@/lib/validation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";

function resolveChannel(request: NextRequest): ChatChannel | null {
  const channel = request.nextUrl.searchParams.get("channel") ?? "all";
  return channel === "all" || channel === "admins" || channel === "direct" ? channel : null;
}

function resolveRecipientId(request: NextRequest): number | null | "invalid" {
  const raw = request.nextUrl.searchParams.get("recipientId");
  if (!raw) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : "invalid";
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

    const recipientId = resolveRecipientId(request);
    if (recipientId === "invalid") {
      return NextResponse.json({ ok: false, error: "Ungültiger Empfänger." }, { status: 400 });
    }

    const ownerAll = channel === "direct" && request.nextUrl.searchParams.get("scope") === "owner-all";
    if (ownerAll && !isPortalOwner(user)) {
      return NextResponse.json({ ok: false, error: "Nur der Owner darf alle Direktnachrichten einsehen." }, { status: 403 });
    }

    const [messages, recipients] = await Promise.all([
      listTeamMessages(channel, 100, user, recipientId, ownerAll),
      channel === "direct" ? listChatRecipients(user) : Promise.resolve([]),
    ]);

    return NextResponse.json(
      {
        ok: true,
        messages,
        recipients,
        me: user.id,
        role: user.role,
        owner: isPortalOwner(user),
        channel,
        recipientId,
        ownerAll,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Nachrichten konnten nicht geladen werden." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });

  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Anmeldung momentan nicht überprüfbar. Bitte erneut versuchen." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } },
    );
  }
  if (!user) return NextResponse.json({ ok: false, error: "Nicht angemeldet." }, { status: 401 });

  let body: unknown;
  try {
    body = await readJsonBody(req, 8192);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." },
      { status: error instanceof RequestBodyError ? error.status : 400 },
    );
  }

  const parsed = chatMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Nachricht ist ungültig." },
      { status: 422 },
    );
  }

  if (parsed.data.channel === "admins" && user.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Nur Administratoren dürfen diesen Chat verwenden." }, { status: 403 });
  }

  let recipientEmployeeId: number | null = null;
  if (parsed.data.channel === "direct") {
    const recipient = await findChatRecipient({
      id: parsed.data.recipientId,
      email: parsed.data.recipientEmail,
    });
    if (!recipient) {
      return NextResponse.json({ ok: false, error: "Kein aktiver Berater mit diesem Empfänger gefunden." }, { status: 404 });
    }
    if (recipient.id === user.id) {
      return NextResponse.json({ ok: false, error: "Du kannst dir nicht selbst eine Direktnachricht senden." }, { status: 422 });
    }
    recipientEmployeeId = recipient.id;
  }

  try {
    await db.insert(teamMessages).values({
      employeeId: user.id,
      recipientEmployeeId,
      body: parsed.data.body,
      channel: parsed.data.channel,
    });
    return NextResponse.json({ ok: true, recipientEmployeeId });
  } catch {
    return NextResponse.json({ ok: false, error: "Senden fehlgeschlagen." }, { status: 500 });
  }
}
