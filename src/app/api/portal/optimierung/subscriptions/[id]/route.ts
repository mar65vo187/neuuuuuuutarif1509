import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/db";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { optimizationSubscriptionUpdateSchema } from "@/lib/optimization-validation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { writeOptimizationEvent } from "@/lib/optimization";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ ok: false, error: "Nur Admins können Abo-Status ändern." }, { status: 403 });
  const subscriptionId = Number((await context.params).id);
  if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) return NextResponse.json({ ok: false, error: "Abo ungültig." }, { status: 404 });

  let body: unknown;
  try {
    body = await readJsonBody(request, 24 * 1024);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." },
      { status: error instanceof RequestBodyError ? error.status : 400 },
    );
  }
  const parsed = optimizationSubscriptionUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Änderung ungültig." }, { status: 422 });

  const sets: string[] = [];
  const values: unknown[] = [];
  const push = (column: string, value: unknown) => {
    values.push(value);
    sets.push(column + "=$" + values.length);
  };
  if (parsed.data.status !== undefined) push("status", parsed.data.status);
  if (parsed.data.billingStatus !== undefined) push("billing_status", parsed.data.billingStatus);
  if (parsed.data.ownerEmployeeId !== undefined) push("owner_employee_id", parsed.data.ownerEmployeeId);
  if (parsed.data.nextReviewAt !== undefined) push("next_review_at", parsed.data.nextReviewAt ? new Date(parsed.data.nextReviewAt) : null);
  if (parsed.data.status === "active") sets.push("started_at=coalesce(started_at,now())");
  if (parsed.data.status === "canceled") sets.push("canceled_at=coalesce(canceled_at,now())");
  sets.push("updated_at=now()");
  values.push(subscriptionId);
  const result = await pool.query<{ id: number }>(
    "update optimization_subscriptions set " + sets.join(",") + " where id=$" + values.length + " returning id",
    values,
  );
  if (!result.rows[0]) return NextResponse.json({ ok: false, error: "Abo nicht gefunden." }, { status: 404 });

  await writeOptimizationEvent({
    subscriptionId,
    actorEmployeeId: user.id,
    actorType: "employee",
    eventType: "subscription.updated",
    payload: parsed.data,
  });
  return NextResponse.json({ ok: true });
}
