import { createHmac } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { advisors, leadNotes, leads } from "@/db/schema";
import { referrers, referrals } from "@/db/referral-schema";
import { referralCustomerHash } from "@/lib/referrals";
import { leadSchema } from "@/lib/validation";
import { isSameOriginRequest } from "@/lib/auth";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { routeNewLead } from "@/lib/enterprise";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const buckets = new Map<string, { count: number; reset: number }>();
const LIMIT = 8;
const WINDOW_MS = 10 * 60 * 1000;

function localRateLimited(key: string) {
  const now = Date.now();
  for (const [bucketKey, bucket] of buckets) {
    if (bucket.reset <= now) buckets.delete(bucketKey);
  }
  if (buckets.size >= 10000 && !buckets.has(key)) return true;
  const current = buckets.get(key);
  if (!current || current.reset < now) {
    buckets.set(key, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > LIMIT;
}

async function sharedRateLimit(networkKey: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return { limited: localRateLimited(networkKey), retryAfter: 60 };
  const keyHash = createHmac("sha256", secret).update("lead-intake:v1:" + networkKey).digest("hex");
  try {
    const result = await pool.query<{ request_count: number; reset_at: Date }>(
      `
        WITH cleanup AS (
          DELETE FROM public_intake_rate_limits
          WHERE updated_at < now() - interval '24 hours'
        ),
        updated AS (
          INSERT INTO public_intake_rate_limits (key_hash, window_started_at, request_count, updated_at)
          VALUES ($1, now(), 1, now())
          ON CONFLICT (key_hash) DO UPDATE SET
            request_count = CASE
              WHEN public_intake_rate_limits.window_started_at <= now() - interval '10 minutes' THEN 1
              ELSE public_intake_rate_limits.request_count + 1
            END,
            window_started_at = CASE
              WHEN public_intake_rate_limits.window_started_at <= now() - interval '10 minutes' THEN now()
              ELSE public_intake_rate_limits.window_started_at
            END,
            updated_at = now()
          RETURNING request_count, window_started_at
        )
        SELECT request_count, window_started_at + interval '10 minutes' AS reset_at
        FROM updated
      `,
      [keyHash],
    );
    const row = result.rows[0];
    if (!row) return { limited: localRateLimited(keyHash), retryAfter: 60 };
    const retryAfter = Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000));
    return { limited: row.request_count > LIMIT, retryAfter };
  } catch {
    console.error("[leads] shared rate limit unavailable");
    return { limited: localRateLimited(keyHash), retryAfter: 60 };
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const networkKey = (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")?.trim()
    || "unknown"
  ).slice(0, 100);
  const limit = await sharedRateLimit(networkKey);
  if (limit.limited) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen. Bitte später erneut versuchen." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
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
    return NextResponse.json({ ok: false, error: first?.message ?? "Bitte prüfen Sie Ihre Angaben.", field: first?.path?.[0] }, { status: 422 });
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
        meta: {\n          ...(data.meta ?? {}),\n          userAgent: req.headers.get("user-agent")?.slice(0, 200) ?? null,\n          consentGranted: true,\n          consentPurpose: "lead_response",\n          consentRecordedAt: new Date().toISOString(),\n          consentSource: "website_form",\n        },
      })
      .returning({ id: leads.id });

    const audienceLabel = data.meta?.audience === "b2b" ? "Business" : data.meta?.audience === "b2c" ? "Privat" : null;
    const companyLabel = typeof data.meta?.companyName === "string" && data.meta.companyName ? data.meta.companyName : null;
    await tx.insert(leadNotes).values({
      leadId: lead.id,
      kind: "system",
      body: [
        `Anfrage über die Website eingegangen (${data.type})`,
        audienceLabel,
        data.topic || null,
        companyLabel,
      ].filter(Boolean).join(" · ") + ".",
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
    return NextResponse.json({ ok: false, error: "Die Anfrage konnte gerade nicht gespeichert werden. Bitte versuchen Sie es erneut oder kontaktieren Sie uns telefonisch." }, { status: 500 });
  }
}
