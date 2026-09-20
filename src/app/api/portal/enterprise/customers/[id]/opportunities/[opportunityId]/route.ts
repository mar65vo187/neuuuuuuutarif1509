import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { updateCustomerOpportunity } from "@/lib/enterprise";
import { PORTAL_PERMISSION, requirePermission } from "@/lib/enterprise-access";
import { customerOpportunityUpdateSchema } from "@/lib/enterprise-validation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string; opportunityId: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  const params = await ctx.params;
  const customerId = Number(params.id);
  const opportunityId = Number(params.opportunityId);
  if (!/^\d+$/.test(params.id) || !/^\d+$/.test(params.opportunityId) || !Number.isSafeInteger(customerId) || !Number.isSafeInteger(opportunityId) || customerId <= 0 || opportunityId <= 0) {
    return NextResponse.json({ ok: false, error: "Ungültige ID." }, { status: 400 });
  }

  try {
    await requirePermission(user, PORTAL_PERMISSION.CUSTOMER_EDIT);
    const parsed = customerOpportunityUpdateSchema.safeParse(await readJsonBody(request, 32 * 1024));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." }, { status: 422 });
    const opportunity = await updateCustomerOpportunity(customerId, opportunityId, parsed.data, user);
    return NextResponse.json({ ok: true, opportunity });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    const status = typeof (error as { status?: unknown })?.status === "number" ? Number((error as { status: number }).status) : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Opportunity konnte nicht gespeichert werden." }, { status });
  }
}
