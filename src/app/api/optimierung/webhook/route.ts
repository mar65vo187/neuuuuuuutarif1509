import { createHmac, timingSafeEqual } from "node:crypto";
import { pool } from "@/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function verifyStripeSignature(raw: string, signature: string, secret: string) {
  const parts = signature.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || !signatures.length) return false;
  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) return false;
  const expected = createHmac("sha256", secret).update(timestamp + "." + raw).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return signatures.some((value) => {
    try {
      const actual = Buffer.from(value, "hex");
      return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
    } catch {
      return false;
    }
  });
}

type StripeObject = {
  id?: string;
  client_reference_id?: string | null;
  customer?: string | { id?: string } | null;
  subscription?: string | { id?: string } | null;
  status?: string;
  metadata?: Record<string, string>;
};

function idValue(value: StripeObject["customer"] | StripeObject["subscription"]) {
  if (typeof value === "string") return value;
  return value && typeof value === "object" ? value.id ?? null : null;
}

function subscriptionIdFromObject(object: StripeObject) {
  const metaId = object.metadata?.optimization_subscription_id;
  const candidate = metaId || object.client_reference_id || "";
  const parsed = Number(candidate);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function logBilling(subscriptionId: number, eventType: string, payload: Record<string, unknown>) {
  await pool.query(
    "insert into optimization_events(subscription_id,actor_type,event_type,payload) values($1,'billing',$2,$3::jsonb)",
    [subscriptionId, eventType, JSON.stringify(payload)],
  );
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ ok: false }, { status: 503 });
  const raw = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  if (!verifyStripeSignature(raw, signature, secret)) return Response.json({ ok: false }, { status: 400 });

  let event: { id?: string; type?: string; data?: { object?: StripeObject } };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const type = event.type ?? "";
  const object = event.data?.object ?? {};
  const directId = subscriptionIdFromObject(object);

  if (type === "checkout.session.completed" && directId) {
    const stripeSubscriptionId = idValue(object.subscription);
    const stripeCustomerId = idValue(object.customer);
    await pool.query(
      "update optimization_subscriptions set billing_provider='stripe',billing_status='active',status='active'," +
      " stripe_checkout_session_id=coalesce($2,stripe_checkout_session_id),stripe_customer_id=coalesce($3,stripe_customer_id)," +
      " stripe_subscription_id=coalesce($4,stripe_subscription_id),started_at=coalesce(started_at,now())," +
      " next_review_at=coalesce(next_review_at,now()+interval '30 days'),updated_at=now() where id=$1",
      [directId, object.id ?? null, stripeCustomerId, stripeSubscriptionId],
    );
    await logBilling(directId, "billing.checkout.completed", { stripeEventId: event.id ?? null });
  } else if (type === "customer.subscription.updated" || type === "customer.subscription.deleted") {
    const stripeSubscriptionId = object.id ?? null;
    if (stripeSubscriptionId) {
      const mapped = type === "customer.subscription.deleted" || object.status === "canceled"
        ? "canceled"
        : object.status === "active" || object.status === "trialing"
          ? "active"
          : object.status === "past_due" || object.status === "unpaid"
            ? "past_due"
            : "pending";
      const result = await pool.query<{ id: number }>(
        "update optimization_subscriptions set billing_status=$2,status=case when $2='canceled' then 'canceled' when $2='active' and status='onboarding' then 'active' else status end," +
        " canceled_at=case when $2='canceled' then now() else canceled_at end,updated_at=now() where stripe_subscription_id=$1 returning id",
        [stripeSubscriptionId, mapped],
      );
      const subscriptionId = result.rows[0]?.id;
      if (subscriptionId) await logBilling(subscriptionId, "billing.subscription." + mapped, { stripeEventId: event.id ?? null, stripeStatus: object.status ?? null });
    }
  } else if (type === "invoice.payment_failed") {
    const stripeSubscriptionId = idValue(object.subscription);
    if (stripeSubscriptionId) {
      const result = await pool.query<{ id: number }>(
        "update optimization_subscriptions set billing_status='past_due',updated_at=now() where stripe_subscription_id=$1 returning id",
        [stripeSubscriptionId],
      );
      const subscriptionId = result.rows[0]?.id;
      if (subscriptionId) await logBilling(subscriptionId, "billing.payment.failed", { stripeEventId: event.id ?? null });
    }
  }

  return Response.json({ received: true });
}
