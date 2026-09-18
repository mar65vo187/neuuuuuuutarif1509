import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { advisors, leadNotes, leads } from "@/db/schema";
import { referrers, referrals } from "@/db/referral-schema";
import { referralCustomerHash } from "@/lib/referrals";
import { leadSchema } from "@/lib/validation";
import { isSameOriginRequest } from "@/lib/auth";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { routeNewLead } from "@/lib/enterprise";

export const dynamic = "force-dynamic";

/* Einfaches In-Memory-Rate-Limit (Best-Effort pro Instanz) */
const buckets = new Map<string, { count: number; reset: number }>();
const LIMIT = 8;
const WINDOW_MS = 10 * 60 * 1000;

function rateLimited(ip: string) {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.reset <= now) buckets.delete(key);
  }
  if (buckets.size >= 10000 && !buckets.has(ip)) return true;
  const b = buckets.get(ip);
  if (!b || b.reset < now) {
    buckets.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  b.count += 1;
  return b.count > LIMIT;
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "Zu viele Anfragen. Bitte versuche es in ein paar Minuten erneut." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." }, { status: error instanceof RequestBodyError ? error.status : 400 });
  }

  // Bot-Anfragen werden ohne Speicherung quittiert.
  if (body && typeof body === "object" && "website" in body && typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true, id: 0 });
  }
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ ok: false, error: first?.message ?? "Bitte prüfe deine Angaben.", field: first?.path?.[0] }, { status: 422 });
  }
  const data = parsed.data;

  try {
    let advisorId: number | null = null;
    if (data.advisorSlug) {
      const [a] = await db.select({ id: advisors.id }).from(advisors).where(and(eq(advisors.slug, data.advisorSlug), eq(advisors.active, true))).limit(1);
      if (!a) return NextResponse.json({ ok: false, error: "Dieses Beraterprofil ist gerade nicht verfügbar. Bitte wähle einen anderen Berater oder stelle eine allgemeine Anfrage." }, { status: 422 });
      advisorId = a.id;
    }

    const created = await db.transaction(async (tx) => {
      const [lead] = await tx
      .insert(leads)
      .values({
        type: data.type,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        topic: data.topic || null,
        region: data.region || null,
        situation: data.situation || null,
        message: data.message || null,
        preferredChannel: data.preferredChannel || null,
        preferredTime: data.preferredTime || null,
        advisorId,
        source: data.source || "website",
        meta: { ...(data.meta ?? {}), userAgent: req.headers.get("user-agent")?.slice(0, 200) ?? null },
      })
      .returning({ id: leads.id });

    await tx.insert(leadNotes).values({
      leadId: lead.id,
      kind: "system",
      body: `Anfrage über die Website eingegangen (${data.type}).`,
    });
      if (data.referralCode && data.referralConsent && data.type !== "bewerbung") {
        const [owner] = await tx.select({ id: referrers.id, email: referrers.email }).from(referrers)
          .where(and(eq(referrers.code, data.referralCode), eq(referrers.active, true))).limit(1);
        if (owner && owner.email.toLowerCase() !== data.email.toLowerCase()) {
          await tx.insert(referrals).values({ referrerId: owner.id, leadId: lead.id, customerHash: referralCustomerHash(data.email) }).onConflictDoNothing();
        }
      }
      await routeNewLead(tx, lead.id, advisorId);
      return lead;
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch {
    console.error("[leads] insert failed");
    return NextResponse.json({ ok: false, error: "Die Anfrage konnte gerade nicht gespeichert werden. Bitte versuche es erneut oder schreib uns per WhatsApp." }, { status: 500 });
  }
}
