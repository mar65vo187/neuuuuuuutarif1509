import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/db";
import { isSameOriginRequest } from "@/lib/auth";
import { optimizationOfferDecisionSchema } from "@/lib/optimization-validation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { writeOptimizationEvent } from "@/lib/optimization";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ token: string; id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const { token, id } = await context.params;
  if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ ok: false, error: "Zugang ungültig." }, { status: 404 });
  const offerId = Number(id);
  if (!Number.isInteger(offerId) || offerId <= 0) return NextResponse.json({ ok: false, error: "Angebot ungültig." }, { status: 404 });

  let body: unknown;
  try {
    body = await readJsonBody(request, 8 * 1024);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." },
      { status: error instanceof RequestBodyError ? error.status : 400 },
    );
  }
  const parsed = optimizationOfferDecisionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Entscheidung ungültig." }, { status: 422 });

  const lookup = await pool.query<{ subscription_id: number; request_id: number; offer_status: string; subscription_status: string; billing_status: string }>(
    "select s.id as subscription_id,r.id as request_id,o.status as offer_status,s.status as subscription_status,s.billing_status" +
    " from optimization_offers o join optimization_requests r on r.id=o.request_id join optimization_subscriptions s on s.id=r.subscription_id" +
    " where o.id=$1 and s.public_token=$2 limit 1",
    [offerId, token],
  );
  const row = lookup.rows[0];
  if (!row) return NextResponse.json({ ok: false, error: "Angebot nicht gefunden." }, { status: 404 });
  if (row.subscription_status !== "active" || row.billing_status !== "active") {
    return NextResponse.json({ ok: false, error: "Das Abo ist nicht aktiv." }, { status: 402 });
  }
  if (!["sent", "accepted", "rejected"].includes(row.offer_status)) {
    return NextResponse.json({ ok: false, error: "Dieses Angebot ist noch nicht zur Entscheidung freigegeben." }, { status: 409 });
  }

  const decision = parsed.data.decision;
  await pool.query("begin");
  try {
    await pool.query(
      "update optimization_offers set status=$2,decision_at=now(),updated_at=now() where id=$1",
      [offerId, decision],
    );
    if (decision === "accepted") {
      await pool.query(
        "update optimization_offers set status='rejected',decision_at=coalesce(decision_at,now()),updated_at=now()" +
        " where request_id=$1 and id<>$2 and status='sent'",
        [row.request_id, offerId],
      );
      await pool.query(
        "update optimization_requests set status='accepted',updated_at=now(),review_due_at=now()+interval '1 day' where id=$1",
        [row.request_id],
      );
    } else {
      const remaining = await pool.query<{ count: number }>(
        "select count(*)::int as count from optimization_offers where request_id=$1 and status='sent' and id<>$2",
        [row.request_id, offerId],
      );
      if ((remaining.rows[0]?.count ?? 0) === 0) {
        await pool.query("update optimization_requests set status='market_scan',updated_at=now() where id=$1", [row.request_id]);
      }
    }
    await pool.query("commit");
  } catch (error) {
    await pool.query("rollback");
    throw error;
  }

  await writeOptimizationEvent({
    subscriptionId: row.subscription_id,
    requestId: row.request_id,
    actorType: "customer",
    eventType: "offer." + decision,
    payload: { offerId },
  });
  return NextResponse.json({ ok: true });
}
