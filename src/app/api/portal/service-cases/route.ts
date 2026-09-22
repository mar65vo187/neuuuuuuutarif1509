import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { permissionSnapshot, PORTAL_PERMISSION } from "@/lib/enterprise-access";
import { serviceCaseCreateSchema } from "@/lib/enterprise-validation";
import { createServiceCase } from "@/lib/service-cases";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  try {
    const capabilities = await permissionSnapshot(user, [
      PORTAL_PERMISSION.SERVICE_EDIT,
      PORTAL_PERMISSION.SERVICE_ASSIGN,
    ] as const);
    if (!capabilities[PORTAL_PERMISSION.SERVICE_EDIT] && user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Keine Berechtigung für Servicefälle." }, { status: 403 });
    }
    const parsed = serviceCaseCreateSchema.safeParse(await readJsonBody(request, 48 * 1024));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Falldaten sind unvollständig." }, { status: 422 });
    const created = await createServiceCase(user, parsed.data, capabilities[PORTAL_PERMISSION.SERVICE_ASSIGN] || user.role === "admin");
    return NextResponse.json({ ok: true, id: created.id, caseNumber: created.caseNumber }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: unknown }).status) : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Servicefall konnte nicht erstellt werden." }, { status: Number.isFinite(status) ? status : 500 });
  }
}
