import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { requirePermission, PORTAL_PERMISSION } from "@/lib/enterprise-access";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import {
  createOptimizationContract,
  createOptimizationGoal,
  createOptimizationOffer,
  updateOptimizationOfferStatus,
  upsertOptimizationMembership,
} from "@/lib/optimization-hub";
import { optimizationActionSchema } from "@/lib/optimization-validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  try {
    await requirePermission(user, PORTAL_PERMISSION.CUSTOMER_EDIT);
    const parsed = optimizationActionSchema.safeParse(await readJsonBody(request, 64 * 1024));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." }, { status: 422 });

    const input = parsed.data;
    if (input.action === "membership") {
      const row = await upsertOptimizationMembership(user, input);
      return NextResponse.json({ ok: true, id: row?.id }, { status: 200 });
    }
    if (input.action === "goal") {
      const row = await createOptimizationGoal(user, input);
      return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
    }
    if (input.action === "contract") {
      const row = await createOptimizationContract(user, input);
      return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
    }
    if (input.action === "offer") {
      const row = await createOptimizationOffer(user, input);
      return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
    }
    const row = await updateOptimizationOfferStatus(user, input.offerId, input.status);
    return NextResponse.json({ ok: true, id: row?.id }, { status: 200 });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: unknown }).status) : 500;
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Optimierungsservice konnte nicht aktualisiert werden.",
    }, { status: Number.isFinite(status) ? status : 500 });
  }
}
