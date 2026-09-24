import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/db";
import { isSameOriginRequest } from "@/lib/auth";
import { optimizationCustomerRequestSchema } from "@/lib/optimization-validation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { writeOptimizationEvent } from "@/lib/optimization";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function validToken(token: string) {
  return /^[a-f0-9]{64}$/.test(token);
}

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const { token } = await context.params;
  if (!validToken(token)) return NextResponse.json({ ok: false, error: "Zugang ungültig." }, { status: 404 });

  let body: unknown;
  try {
    body = await readJsonBody(request, 64 * 1024);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." },
      { status: error instanceof RequestBodyError ? error.status : 400 },
    );
  }
  const parsed = optimizationCustomerRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Angaben prüfen." }, { status: 422 });

  const subResult = await pool.query<{
    id: number; customer_id: number | null; owner_employee_id: number | null; status: string; billing_status: string;
  }>(
    "select id,customer_id,owner_employee_id,status,billing_status from optimization_subscriptions where public_token=$1 limit 1",
    [token],
  );
  const sub = subResult.rows[0];
  if (!sub) return NextResponse.json({ ok: false, error: "Zugang ungültig." }, { status: 404 });
  if (sub.status !== "active" || sub.billing_status !== "active") {
    return NextResponse.json({ ok: false, error: "Das Abo ist noch nicht aktiv. Bitte Zahlungsstatus prüfen." }, { status: 402 });
  }

  const data = parsed.data;
  const created = await pool.query<{ id: number }>(
    "insert into optimization_requests(subscription_id,customer_id,assigned_employee_id,request_type,status,priority,title,description,financing_wanted,budget_cents,target_date,review_due_at)" +
    " values($1,$2,$3,$4,'new','normal',$5,$6,$7,$8,$9,now()+interval '1 day') returning id",
    [
      sub.id,
      sub.customer_id,
      sub.owner_employee_id,
      data.requestType,
      data.title,
      data.description,
      data.financingWanted,
      data.budgetCents ?? null,
      data.targetDate ?? null,
    ],
  );
  const requestId = created.rows[0]?.id;
  if (!requestId) return NextResponse.json({ ok: false, error: "Wunsch konnte nicht gespeichert werden." }, { status: 500 });
  await writeOptimizationEvent({
    subscriptionId: sub.id,
    requestId,
    actorType: "customer",
    eventType: "request.created",
    payload: { requestType: data.requestType, financingWanted: data.financingWanted },
  });
  return NextResponse.json({ ok: true, id: requestId }, { status: 201 });
}
