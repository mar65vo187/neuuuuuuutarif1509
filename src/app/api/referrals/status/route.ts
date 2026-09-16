import { NextResponse, type NextRequest } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { referrers, referrals } from "@/db/referral-schema";
import { leads } from "@/db/schema";
import { REFERRAL_TOKEN, referralBenefits, referralTokenHash } from "@/lib/referrals";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!REFERRAL_TOKEN.test(token)) return NextResponse.json({ ok: false, error: "Bitte öffne deinen privaten Status-Link." }, { status: 401, headers });
  try {
    const [owner] = await db.select({ id: referrers.id, code: referrers.code }).from(referrers)
      .where(and(eq(referrers.tokenHash, referralTokenHash(token)), eq(referrers.active, true))).limit(1);
    if (!owner) return NextResponse.json({ ok: false, error: "Dieser Status-Link ist nicht gültig." }, { status: 401, headers });
    const [counts] = await db.select({
      referralCount: sql<number>`count(*)::int`,
      qualifiedCount: sql<number>`count(*) filter (where ${leads.status} in ('in_beratung', 'termin_bestaetigt', 'abgeschlossen'))::int`,
      completedCount: sql<number>`count(*) filter (where ${leads.status} = 'abgeschlossen')::int`,
    }).from(referrals).innerJoin(leads, eq(referrals.leadId, leads.id)).where(eq(referrals.referrerId, owner.id));
    // Aggregate only: no customer identity, contact information or individual case status is disclosed.
    return NextResponse.json({ ok: true, code: owner.code, ...counts, benefit: referralBenefits(),
    }, { headers });
  } catch {
    return NextResponse.json({ ok: false, error: "Der Status ist gerade nicht erreichbar. Bitte erneut versuchen." }, { status: 503, headers });
  }
}
