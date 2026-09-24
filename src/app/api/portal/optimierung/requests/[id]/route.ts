import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/db";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { getOptimizationAccess, writeOptimizationEvent } from "@/lib/optimization";
import { optimizationRequestUpdateSchema } from "@/lib/optimization-validation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  const requestId = Number((await context.params).id);
  if (!Number.isInteger(requestId) || requestId <= 0) return NextResponse.json({ ok: false, error: "Vorgang ungültig." }, { status: 404 });

  const access = await getOptimizationAccess(user, requestId);
  if (!access) return NextResponse.json({ ok: false, error: "Keine Berechtigung." }, { status: 403 });

  let body: unknown;
  try {
    body = await readJsonBody(request, 24 * 1024);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." },
      { status: error instanceof RequestBodyError ? error.status : 400 },
    );
  }
  const parsed = optimizationRequestUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Änderung ungültig." }, { status: 422 });
  if (user.role !== "admin" && parsed.data.assignedEmployeeId != null && parsed.data.assignedEmployeeId !== user.id) {
    return NextResponse.json({ ok: false, error: "Du kannst den Vorgang nur selbst übernehmen." }, { status: 403 });
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  const push = (column: string, value: unknown) => {
    values.push(value);
    sets.push(column + "=$" + values.length);
  };
  if (parsed.data.status !== undefined) push("status", parsed.data.status);
  if (parsed.data.priority !== undefined) push("priority", parsed.data.priority);
  if (parsed.data.assignedEmployeeId !== undefined) push("assigned_employee_id", parsed.data.assignedEmployeeId);
  if (parsed.data.reviewDueAt !== undefined) push("review_due_at", parsed.data.reviewDueAt ? new Date(parsed.data.reviewDueAt) : null);
  sets.push("updated_at=now()");
  values.push(requestId);
  await pool.query("update optimization_requests set " + sets.join(",") + " where id=$" + values.length, values);

  await writeOptimizationEvent({
    subscriptionId: access.subscription_id,
    requestId,
    actorEmployeeId: user.id,
    actorType: "employee",
    eventType: "request.updated",
    payload: parsed.data,
  });
  return NextResponse.json({ ok: true });
}
