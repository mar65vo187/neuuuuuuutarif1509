import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { internalDocuments } from "@/db/enterprise-schema";
import { getCurrentUser } from "@/lib/auth";
import { isCompensationOwner } from "@/lib/compensation";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  const raw = (await context.params).id;
  if (!/^\d+$/.test(raw)) return NextResponse.json({ ok: false, error: "Ungültige Dokument-ID." }, { status: 400 });
  const id = Number(raw);

  const [document] = await db.select().from(internalDocuments)
    .where(eq(internalDocuments.id, id)).limit(1);
  if (!document || !document.active) return NextResponse.json({ ok: false, error: "Dokument nicht gefunden." }, { status: 404 });
  if (document.visibility === "admin" && user.role !== "admin") return NextResponse.json({ ok: false, error: "Kein Zugriff." }, { status: 403 });
  if (document.visibility === "owner" && !isCompensationOwner(user)) return NextResponse.json({ ok: false, error: "Kein Zugriff." }, { status: 403 });

  const safeName = document.fileName.replace(/[\r\n"\\]/g, "_");
  return new NextResponse(new Uint8Array(document.data), {
    status: 200,
    headers: {
      "Content-Type": document.contentType,
      "Content-Length": String(document.sizeBytes),
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
