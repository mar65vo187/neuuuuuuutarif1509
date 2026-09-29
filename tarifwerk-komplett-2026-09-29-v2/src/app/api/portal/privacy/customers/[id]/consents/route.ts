import { NextResponse, type NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { customers } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { customerAccess } from "@/lib/enterprise";
import { hasPermission, PORTAL_PERMISSION } from "@/lib/enterprise-access";
import { CONSENT_PURPOSES, CONSENT_SOURCES, recordConsent } from "@/lib/privacy-center";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

const consentSchema = z.object({
  purpose: z.enum(CONSENT_PURPOSES),
  granted: z.boolean(),
  source: z.enum(CONSENT_SOURCES),
  note: z.string().trim().max(500).default(""),
});

/** Records a consent or its withdrawal (UWG § 7/§ 7a, DSGVO Art. 7). Entries are append-only. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403, headers: NO_STORE });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401, headers: NO_STORE });
  const canEdit = await hasPermission(user, PORTAL_PERMISSION.CUSTOMER_EDIT) || await hasPermission(user, PORTAL_PERMISSION.PRIVACY_MANAGE);
  if (!canEdit) return NextResponse.json({ ok: false, error: "Keine Berechtigung." }, { status: 403, headers: NO_STORE });

  const raw = (await context.params).id;
  const customerId = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(customerId) || customerId <= 0 || customerId > 2147483647) {
    return NextResponse.json({ ok: false, error: "Ungültige ID." }, { status: 400, headers: NO_STORE });
  }

  let body: unknown;
  try { body = await readJsonBody(request); }
  catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." }, { status: error instanceof RequestBodyError ? error.status : 400, headers: NO_STORE });
  }
  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Bitte Zweck, Entscheidung und Quelle angeben." }, { status: 422, headers: NO_STORE });

  try {
    const [customer] = await db.select({ id: customers.id }).from(customers)
      .where(and(eq(customers.id, customerId), customerAccess(user), isNull(customers.archivedAt)))
      .limit(1);
    if (!customer) return NextResponse.json({ ok: false, error: "Kunde nicht gefunden." }, { status: 404, headers: NO_STORE });
    const row = await recordConsent({ customerId, actorId: user.id, ...parsed.data });
    return NextResponse.json({ ok: true, id: row.id, recordedAt: row.recordedAt.toISOString() }, { headers: NO_STORE });
  } catch {
    console.error("[privacy consent] failed");
    return NextResponse.json({ ok: false, error: "Die Einwilligung konnte nicht gespeichert werden." }, { status: 500, headers: NO_STORE });
  }
}
