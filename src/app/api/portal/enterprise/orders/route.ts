import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { createOrder } from "@/lib/enterprise";
import { requirePermission } from "@/lib/enterprise-access";
import { orderCreateSchema } from "@/lib/enterprise-validation";
import { isCompensationOwner } from "@/lib/compensation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  try {
    await requirePermission(user, "order.create");
    const parsed = orderCreateSchema.safeParse(await readJsonBody(request, 32 * 1024));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." }, { status: 422 });
    const data = parsed.data;
    const order = await createOrder({
      ...data,
      expectedCommission: typeof data.expectedCommission === "string" ? data.expectedCommission.replace(",", ".") : data.expectedCommission,
    }, user);
    const safeOrder = isCompensationOwner(user) ? order : { ...order, expectedCommission: null };
    return NextResponse.json({ ok: true, order: safeOrder }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    const status = typeof (error as { status?: unknown })?.status === "number" ? (error as { status: number }).status : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Auftrag konnte nicht gespeichert werden." }, { status });
  }
}
