import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, dataRequests } from "@/db/enterprise-schema";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/enterprise";
import { hasPermission, PORTAL_PERMISSION } from "@/lib/enterprise-access";
import { buildCustomerPrivacyExport } from "@/lib/privacy-export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

/** DSGVO Art. 15: complete data export for one customer, logged as a completed data request. */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401, headers: NO_STORE });
  if (!await hasPermission(user, PORTAL_PERMISSION.PRIVACY_MANAGE)) {
    return NextResponse.json({ ok: false, error: "Keine Berechtigung für Datenschutz-Auskünfte." }, { status: 403, headers: NO_STORE });
  }
  if (user.mfaVerified !== true) {
    return NextResponse.json(
      { ok: false, error: "Für Datenschutz-Auskünfte muss zuerst die Zwei-Faktor-Anmeldung unter Sicherheit aktiviert werden." },
      { status: 428, headers: NO_STORE },
    );
  }

  const raw = (await context.params).id;
  const customerId = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(customerId) || customerId <= 0 || customerId > 2147483647) {
    return NextResponse.json({ ok: false, error: "Ungültige ID." }, { status: 400, headers: NO_STORE });
  }

  try {
    const [customer] = await db.select({ id: customers.id, customerNumber: customers.customerNumber })
      .from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!customer) return NextResponse.json({ ok: false, error: "Kunde nicht gefunden." }, { status: 404, headers: NO_STORE });

    const now = new Date();
    await db.transaction(async (tx) => {
      const [request] = await tx.insert(dataRequests).values({
        customerId,
        type: "access",
        status: "completed",
        requestedAt: now,
        completedAt: now,
        handledByEmployeeId: user.id,
        note: "Auskunft nach Art. 15 DSGVO als JSON-Export erstellt.",
      }).returning({ id: dataRequests.id });
      await writeAudit(tx, user.id, "privacy.access_export", "customer", customerId, undefined, { dataRequestId: request.id });
    });

    const payload = await buildCustomerPrivacyExport(customerId);
    if (!payload) return NextResponse.json({ ok: false, error: "Kunde nicht gefunden." }, { status: 404, headers: NO_STORE });

    const safeNumber = customer.customerNumber.replace(/[^A-Za-z0-9_-]/g, "");
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        ...NO_STORE,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="dsgvo-auskunft-${safeNumber || customerId}.json"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    console.error("[privacy export] failed");
    return NextResponse.json({ ok: false, error: "Die Auskunft konnte nicht erstellt werden." }, { status: 500, headers: NO_STORE });
  }
}
