import { randomBytes } from "node:crypto";
import { z } from "zod";
import { pool } from "@/db";
import { isSameOriginRequest } from "@/lib/auth";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { sendTransactionalEmail } from "@/lib/transactional-email";
import { SITE } from "@/lib/content";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  action: z.enum(["cancellation", "withdrawal"]),
  customerName: z.string().trim().min(2).max(160),
  email: z.string().trim().toLowerCase().email().max(200),
  contractNumber: z.string().trim().regex(/^TW-OPT-\d{1,10}$/i, "Bitte gültige Vertragsnummer angeben."),
  cancellationType: z.enum(["ordinary", "extraordinary"]).optional(),
  requestedEnd: z.string().trim().max(40).optional().default(""),
  reason: z.string().trim().max(1500).optional().default(""),
  website: z.string().max(200).optional().default(""),
}).strict();

function siteOrigin() {
  return SITE.url.replace(/\/$/, "");
}

async function applyStripeCancellation(stripeSubscriptionId: string, requestedEnd: string) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return "manual_review";
  const form = new URLSearchParams();
  const normalized = requestedEnd.trim().toLowerCase();
  if (!normalized || normalized === "earliest") {
    form.set("cancel_at_period_end", "true");
  } else {
    const date = new Date(requestedEnd + "T23:59:59+02:00");
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
      form.set("cancel_at_period_end", "true");
    } else {
      form.set("cancel_at", String(Math.floor(date.getTime() / 1000)));
    }
  }
  const response = await fetch("https://api.stripe.com/v1/subscriptions/" + encodeURIComponent(stripeSubscriptionId), {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    cache: "no-store",
  });
  return response.ok ? "stripe_scheduled" : "manual_review";
}

async function stopStripeForWithdrawal(stripeSubscriptionId: string) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return "manual_review";
  const response = await fetch("https://api.stripe.com/v1/subscriptions/" + encodeURIComponent(stripeSubscriptionId), {
    method: "DELETE",
    headers: { Authorization: "Bearer " + key },
    cache: "no-store",
  });
  return response.ok ? "stripe_canceled" : "manual_review";
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  let body: unknown;
  try {
    body = await readJsonBody(request, 24 * 1024);
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." },
      { status: error instanceof RequestBodyError ? error.status : 400 },
    );
  }
  if (body && typeof body === "object" && "website" in body && typeof body.website === "string" && body.website.trim()) {
    return Response.json({ ok: true });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Angaben prüfen." }, { status: 422 });
  const data = parsed.data;
  const numericId = Number(data.contractNumber.replace(/\D/g, ""));
  const subscriptionResult = await pool.query<{
    id: number; customer_name: string; email: string; status: string; billing_status: string;
    stripe_subscription_id: string | null;
  }>(
    "select id,customer_name,email,status,billing_status,stripe_subscription_id from optimization_subscriptions" +
    " where id=$1 and lower(email)=lower($2) limit 1",
    [numericId, data.email],
  );
  const subscription = subscriptionResult.rows[0] ?? null;
  const receiptToken = randomBytes(32).toString("hex");
  const receivedAt = new Date();
  let billingAction = "manual_review";
  let status = "received";

  if (subscription) {
    if (data.action === "cancellation") {
      if (data.cancellationType === "ordinary" && subscription.stripe_subscription_id) {
        billingAction = await applyStripeCancellation(subscription.stripe_subscription_id, data.requestedEnd);
      }
      status = data.cancellationType === "extraordinary" ? "received_review_required" : "received";
      await pool.query(
        "update optimization_subscriptions set status='canceling',updated_at=now() where id=$1 and status not in ('canceled','withdrawn')",
        [subscription.id],
      );
    } else {
      if (subscription.stripe_subscription_id) billingAction = await stopStripeForWithdrawal(subscription.stripe_subscription_id);
      await pool.query(
        "update optimization_subscriptions set status='withdrawn',billing_status=case when $2='stripe_canceled' then 'canceled' else billing_status end,canceled_at=coalesce(canceled_at,now()),updated_at=now() where id=$1",
        [subscription.id, billingAction],
      );
    }
  } else {
    status = "received_unmatched";
  }

  const inserted = await pool.query<{ id: number; received_at: Date }>(
    "insert into optimization_contract_notices(subscription_id,receipt_token,notice_type,customer_name,email,contract_label,cancellation_type,reason,requested_end,status,billing_action)" +
    " values($1,$2,$3,$4,$5,'TarifWerk Optimierung+',$6,$7,$8,$9,$10) returning id,received_at",
    [
      subscription?.id ?? null,
      receiptToken,
      data.action,
      data.customerName,
      data.email,
      data.action === "cancellation" ? data.cancellationType ?? "ordinary" : null,
      data.reason || null,
      data.action === "cancellation" ? data.requestedEnd || "earliest" : null,
      status,
      billingAction,
    ],
  );
  const noticeId = inserted.rows[0]?.id;
  const recordedAt = inserted.rows[0]?.received_at ?? receivedAt;
  const actionLabel = data.action === "cancellation" ? "Kündigung" : "Widerruf";
  const requested = data.action === "cancellation"
    ? (data.requestedEnd && data.requestedEnd !== "earliest" ? data.requestedEnd : "zum frühestmöglichen Zeitpunkt")
    : "Widerruf des Vertrags";
  const receiptUrl = siteOrigin() + "/vertragsmitteilung/" + receiptToken;
  const mailText = [
    "Eingangsbestätigung – " + actionLabel,
    "",
    "Wir bestätigen den elektronischen Eingang deiner Erklärung.",
    "Vertrag: TarifWerk Optimierung+",
    "Vertragsnummer: " + data.contractNumber.toUpperCase(),
    "Name: " + data.customerName,
    "E-Mail: " + data.email,
    data.action === "cancellation" ? "Beendigungswunsch: " + requested : "Erklärung: Vertrag widerrufen",
    data.reason ? "Angegebener Grund: " + data.reason : "",
    "Eingang: " + recordedAt.toLocaleString("de-DE", { timeZone: "Europe/Berlin" }) + " Uhr",
    "Beleg: " + receiptUrl,
    "",
    subscription ? "Die Erklärung wurde dem gefundenen Vertrag zugeordnet." : "Die Erklärung ist eingegangen; die Vertragszuordnung wird anhand deiner Angaben geprüft.",
  ].filter(Boolean).join("\n");
  const sent = await sendTransactionalEmail({
    to: data.email,
    subject: "TarifWerk – Eingangsbestätigung " + actionLabel,
    text: mailText,
    tag: data.action,
  });
  if (noticeId) {
    await pool.query(
      "update optimization_contract_notices set confirmation_email_status=$2,confirmation_email_id=$3 where id=$1",
      [noticeId, sent.ok ? "sent" : "failed", sent.ok ? sent.id : null],
    );
  }

  if (subscription) {
    await pool.query(
      "insert into optimization_events(subscription_id,actor_type,event_type,payload) values($1,'customer',$2,$3::jsonb)",
      [subscription.id, "contract." + data.action, JSON.stringify({ noticeId, billingAction, requestedEnd: data.requestedEnd || null })],
    );
  }

  return Response.json({
    ok: true,
    receiptUrl: "/vertragsmitteilung/" + receiptToken,
    receivedAt: recordedAt.toISOString(),
    emailConfirmation: sent.ok,
  }, { status: 201 });
}
