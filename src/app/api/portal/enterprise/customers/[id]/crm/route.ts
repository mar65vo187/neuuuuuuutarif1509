import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { updateCustomerCrmProfile } from "@/lib/enterprise";
import { PORTAL_PERMISSION, requirePermission } from "@/lib/enterprise-access";
import { customerCrmUpdateSchema } from "@/lib/enterprise-validation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";

function customerId(raw: string) {
  const id = Number(raw);
  return /^\d+$/.test(raw) && Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  const id = customerId((await ctx.params).id);
  if (!id) return NextResponse.json({ ok: false, error: "Ungültige Kunden-ID." }, { status: 400 });

  try {
    await requirePermission(user, PORTAL_PERMISSION.CUSTOMER_EDIT);
    const parsed = customerCrmUpdateSchema.safeParse(await readJsonBody(request, 32 * 1024));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." }, { status: 422 });
    const profile = await updateCustomerCrmProfile(id, parsed.data, user);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    const status = typeof (error as { status?: unknown })?.status === "number" ? Number((error as { status: number }).status) : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "CRM-Profil konnte nicht gespeichert werden." }, { status });
  }
}
