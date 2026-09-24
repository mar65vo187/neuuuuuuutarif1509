import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, PORTAL_PERMISSION } from "@/lib/enterprise-access";
import { getOptimizationDocument } from "@/lib/optimization-hub";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  const canRead = user.role === "admin"
    || await hasPermission(user, PORTAL_PERMISSION.CUSTOMER_READ)
    || await hasPermission(user, PORTAL_PERMISSION.CUSTOMER_EDIT);
  if (!canRead) return NextResponse.json({ ok: false, error: "Keine Berechtigung." }, { status: 403 });

  const id = Number((await context.params).id);
  const row = await getOptimizationDocument(user, id);
  if (!row) return NextResponse.json({ ok: false, error: "Dokument nicht gefunden." }, { status: 404 });

  const safeName = row.fileName.replace(/[\r\n"]/g, "_");
  const body = Uint8Array.from(row.data);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": row.contentType,
      "Content-Length": String(row.byteSize),
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "X-TarifWerk-SHA256": row.digest,
    },
  });
}
