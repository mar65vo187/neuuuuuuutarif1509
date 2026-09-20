import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { createCustomer } from "@/lib/enterprise";
import { requirePermission } from "@/lib/enterprise-access";
import { customerCreateSchema } from "@/lib/enterprise-validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  try {
    await requirePermission(user, "customer.edit");
    const body = await readJsonBody(request, 32 * 1024);
    const parsed = customerCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." }, { status: 422 });
    const customer = await createCustomer(parsed.data, user);
    return NextResponse.json({ ok: true, customer }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    const status = typeof (error as { status?: unknown })?.status === "number" ? (error as { status: number }).status : 500;
    const duplicate = typeof error === "object" && error && "duplicate" in error
      ? (error as { duplicate?: unknown }).duplicate
      : undefined;
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Kunde konnte nicht gespeichert werden.",
      ...(duplicate ? { duplicate } : {}),
    }, { status });
  }
}
