import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { requirePermission, PORTAL_PERMISSION } from "@/lib/enterprise-access";
import { storeOptimizationDocument } from "@/lib/optimization-hub";

export const dynamic = "force-dynamic";

function positiveId(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  try {
    await requirePermission(user, PORTAL_PERMISSION.CUSTOMER_EDIT);
    const form = await request.formData();
    const file = form.get("file");
    const customerId = positiveId(form.get("customerId"));
    if (!customerId) return NextResponse.json({ ok: false, error: "Kunde fehlt." }, { status: 422 });
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Datei fehlt." }, { status: 422 });

    const row = await storeOptimizationDocument(user, {
      customerId,
      title: String(form.get("title") ?? ""),
      kind: String(form.get("kind") ?? "contract"),
      goalId: positiveId(form.get("goalId")),
      contractId: positiveId(form.get("contractId")),
      offerId: positiveId(form.get("offerId")),
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      data: Buffer.from(await file.arrayBuffer()),
    });
    return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: unknown }).status) : 500;
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Dokument konnte nicht gespeichert werden.",
    }, { status: Number.isFinite(status) ? status : 500 });
  }
}
