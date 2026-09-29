import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { customers } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { hasPermission, PORTAL_PERMISSION } from "@/lib/enterprise-access";
import { anonymizeCustomer, PrivacyRequestError } from "@/lib/privacy-center";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

const eraseSchema = z.object({
  // Die Kundennummer muss zur Bestätigung abgetippt werden.
  confirmCustomerNumber: z.string().trim().min(1).max(60),
  reason: z.string().trim().min(3).max(500),
});

/** DSGVO Art. 17: irreversible anonymisation of one customer. */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403, headers: NO_STORE });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401, headers: NO_STORE });
  if (!await hasPermission(user, PORTAL_PERMISSION.PRIVACY_MANAGE)) {
    return NextResponse.json({ ok: false, error: "Keine Berechtigung für Datenschutz-Löschungen." }, { status: 403, headers: NO_STORE });
  }
  if (user.mfaVerified !== true) {
    return NextResponse.json(
      { ok: false, error: "Für Löschungen muss zuerst die Zwei-Faktor-Anmeldung unter Sicherheit aktiviert werden." },
      { status: 428, headers: NO_STORE },
    );
  }

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
  const parsed = eraseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Bitte Kundennummer und Grund angeben." }, { status: 422, headers: NO_STORE });

  try {
    const [customer] = await db.select({ customerNumber: customers.customerNumber }).from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!customer) return NextResponse.json({ ok: false, error: "Kunde nicht gefunden." }, { status: 404, headers: NO_STORE });
    if (customer.customerNumber !== parsed.data.confirmCustomerNumber) {
      return NextResponse.json({ ok: false, error: "Die eingegebene Kundennummer stimmt nicht überein." }, { status: 422, headers: NO_STORE });
    }
    const result = await anonymizeCustomer(customerId, user.id, parsed.data.reason);
    return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof PrivacyRequestError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status, headers: NO_STORE });
    console.error("[privacy erase] failed");
    return NextResponse.json({ ok: false, error: "Die Anonymisierung ist fehlgeschlagen. Es wurde nichts verändert." }, { status: 500, headers: NO_STORE });
  }
}
