import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/db";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { getOptimizationAccess, writeOptimizationEvent } from "@/lib/optimization";
import { optimizationOfferUpsertSchema } from "@/lib/optimization-validation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  const requestId = Number((await context.params).id);
  if (!Number.isInteger(requestId) || requestId <= 0) return NextResponse.json({ ok: false, error: "Vorgang ungültig." }, { status: 404 });

  const access = await getOptimizationAccess(user, requestId);
  if (!access) return NextResponse.json({ ok: false, error: "Keine Berechtigung." }, { status: 403 });

  let body: unknown;
  try {
    body = await readJsonBody(request, 32 * 1024);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." },
      { status: error instanceof RequestBodyError ? error.status : 400 },
    );
  }
  const parsed = optimizationOfferUpsertSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Angebot ungültig." }, { status: 422 });
  const data = parsed.data;
  const status = data.sendNow ? "sent" : "draft";

  const result = await pool.query<{ id: number }>(
    "insert into optimization_offers(request_id,provider_id,product_id,rank,title,monthly_cents,one_time_cents,estimated_savings_cents,term_months,highlights,limitations,status,external_reference,created_by_employee_id,sent_at)" +
    " values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,case when $12='sent' then now() else null end)" +
    " on conflict(request_id,rank) do update set provider_id=excluded.provider_id,product_id=excluded.product_id,title=excluded.title,monthly_cents=excluded.monthly_cents," +
    " one_time_cents=excluded.one_time_cents,estimated_savings_cents=excluded.estimated_savings_cents,term_months=excluded.term_months,highlights=excluded.highlights," +
    " limitations=excluded.limitations,status=excluded.status,external_reference=excluded.external_reference,created_by_employee_id=excluded.created_by_employee_id," +
    " sent_at=case when excluded.status='sent' then coalesce(optimization_offers.sent_at,now()) else optimization_offers.sent_at end,updated_at=now() returning id",
    [
      requestId,
      data.providerId ?? null,
      data.productId ?? null,
      data.rank,
      data.title,
      data.monthlyCents ?? null,
      data.oneTimeCents ?? null,
      data.estimatedSavingsCents ?? null,
      data.termMonths ?? null,
      data.highlights,
      data.limitations,
      status,
      data.externalReference || null,
      user.id,
    ],
  );

  const offerId = result.rows[0]?.id;
  if (data.sendNow) {
    const countResult = await pool.query<{ count: number }>(
      "select count(*)::int as count from optimization_offers where request_id=$1 and status='sent'",
      [requestId],
    );
    const count = countResult.rows[0]?.count ?? 0;
    await pool.query(
      "update optimization_requests set status=$2,updated_at=now(),review_due_at=now()+interval '3 days' where id=$1",
      [requestId, count >= 3 ? "waiting_customer" : "offers_ready"],
    );
  } else {
    await pool.query("update optimization_requests set status=case when status='new' then 'market_scan' else status end,updated_at=now() where id=$1", [requestId]);
  }

  await writeOptimizationEvent({
    subscriptionId: access.subscription_id,
    requestId,
    actorEmployeeId: user.id,
    actorType: "employee",
    eventType: data.sendNow ? "offer.sent" : "offer.saved",
    payload: { offerId, rank: data.rank },
  });
  return NextResponse.json({ ok: true, id: offerId }, { status: 201 });
}
