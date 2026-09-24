import { createHmac, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/db";
import { isSameOriginRequest } from "@/lib/auth";
import { optimizationCheckoutSchema } from "@/lib/optimization-validation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { SITE } from "@/lib/content";
import { transactionalEmailReady } from "@/lib/transactional-email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const localBuckets = new Map<string, { count: number; reset: number }>();
const LIMIT = 6;
const WINDOW_MS = 10 * 60 * 1000;

function localRateLimited(key: string) {
  const now = Date.now();
  const current = localBuckets.get(key);
  if (!current || current.reset <= now) {
    localBuckets.set(key, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > LIMIT;
}

async function rateLimited(networkKey: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return localRateLimited(networkKey);
  const hash = createHmac("sha256", secret).update("optimization-checkout:v1:" + networkKey).digest("hex");
  try {
    const result = await pool.query<{ request_count: number }>(
      "insert into public_intake_rate_limits(key_hash,window_started_at,request_count,updated_at) values($1,now(),1,now())" +
      " on conflict(key_hash) do update set request_count=case when public_intake_rate_limits.window_started_at <= now()-interval '10 minutes' then 1 else public_intake_rate_limits.request_count+1 end," +
      " window_started_at=case when public_intake_rate_limits.window_started_at <= now()-interval '10 minutes' then now() else public_intake_rate_limits.window_started_at end,updated_at=now()" +
      " returning request_count",
      [hash],
    );
    return (result.rows[0]?.request_count ?? 1) > LIMIT;
  } catch {
    return localRateLimited(hash);
  }
}

function stripeOrigin() {
  const value = SITE.url.replace(/\/$/, "");
  return value.startsWith("http") ? value : "https://www.tarifwerk.eu";
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  }

  const networkKey = (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown"
  ).slice(0, 100);
  if (await rateLimited(networkKey)) {
    return NextResponse.json({ ok: false, error: "Zu viele Versuche. Bitte später erneut versuchen." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await readJsonBody(request, 32 * 1024);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." },
      { status: error instanceof RequestBodyError ? error.status : 400 },
    );
  }

  if (body && typeof body === "object" && "website" in body && typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true, pending: true });
  }

  const parsed = optimizationCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Angaben prüfen." }, { status: 422 });
  }

  const data = parsed.data;
  const token = randomBytes(32).toString("hex");
  const now = new Date();

  const onlineBillingReady = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_OPTIMIZATION_PRICE_ID && transactionalEmailReady());
  const created = await pool.query<{ id: number }>(
    "insert into optimization_subscriptions(public_token,plan_code,price_cents,currency,billing_provider,billing_status,status,customer_name,email,phone,consent_terms_at,consent_privacy_at)" +
    " values($1,'optimierung_plus',199,'EUR',$2,$3,'onboarding',$4,$5,$6,$7,$7) returning id",
    [
      token,
      onlineBillingReady ? "stripe" : "manual",
      onlineBillingReady ? "pending" : "pending_manual",
      data.name,
      data.email,
      data.phone || null,
      now,
    ],
  );
  const subscriptionId = created.rows[0]?.id;
  if (!subscriptionId) return NextResponse.json({ ok: false, error: "Abo konnte nicht angelegt werden." }, { status: 500 });

  await pool.query(
    "insert into optimization_events(subscription_id,actor_type,event_type,payload) values($1,'customer','subscription.signup',$2::jsonb)",
    [subscriptionId, JSON.stringify({ source: "website", priceCents: 199 })],
  );

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const stripePrice = process.env.STRIPE_OPTIMIZATION_PRICE_ID;
  if (!onlineBillingReady || !stripeSecret || !stripePrice) {
    return NextResponse.json({
      ok: true,
      pending: true,
      subscriptionId,
      message: "Deine Anmeldung ist gespeichert. Der Online-Zahlungsabschluss wird gerade vorbereitet; TarifWerk meldet sich zur Aktivierung.",
    }, { status: 201 });
  }

  const origin = stripeOrigin();
  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("customer_email", data.email);
  form.set("client_reference_id", String(subscriptionId));
  form.set("line_items[0][price]", stripePrice);
  form.set("line_items[0][quantity]", "1");
  form.set("success_url", origin + "/mein-tarifwerk/" + token + "?checkout=success");
  form.set("cancel_url", origin + "/optimieren?checkout=cancelled");
  form.set("locale", "de");
  form.set("allow_promotion_codes", "true");
  form.set("metadata[optimization_subscription_id]", String(subscriptionId));
  form.set("subscription_data[metadata][optimization_subscription_id]", String(subscriptionId));

  try {
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + stripeSecret,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
      cache: "no-store",
    });
    const payload = await stripeResponse.json() as { id?: string; url?: string; error?: { message?: string } };
    if (!stripeResponse.ok || !payload.id || !payload.url) {
      await pool.query("update optimization_subscriptions set billing_status='checkout_error',updated_at=now() where id=$1", [subscriptionId]);
      return NextResponse.json({ ok: false, error: "Zahlungsseite konnte gerade nicht gestartet werden. Bitte erneut versuchen." }, { status: 502 });
    }
    await pool.query(
      "update optimization_subscriptions set stripe_checkout_session_id=$2,updated_at=now() where id=$1",
      [subscriptionId, payload.id],
    );
    return NextResponse.json({ ok: true, redirectUrl: payload.url }, { status: 201 });
  } catch {
    await pool.query("update optimization_subscriptions set billing_status='checkout_error',updated_at=now() where id=$1", [subscriptionId]);
    return NextResponse.json({ ok: false, error: "Zahlungsdienst ist vorübergehend nicht erreichbar." }, { status: 502 });
  }
}
