import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { internalDocuments } from "@/db/enterprise-schema";
import { authorizeAdmin } from "@/lib/admin-server";
import { isCompensationOwner } from "@/lib/compensation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await authorizeAdmin(request);
  if (admin instanceof NextResponse) return admin;
  if (!isCompensationOwner(admin)) return new Response("Keine Berechtigung", { status: 403 });

  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("Nicht gefunden", { status: 404 });

  const [document] = await db.select({
    fileName: internalDocuments.fileName,
    contentType: internalDocuments.contentType,
    data: internalDocuments.data,
    category: internalDocuments.category,
  }).from(internalDocuments).where(eq(internalDocuments.id, id)).limit(1);

  if (!document || document.category !== "commission_list_source") return new Response("Nicht gefunden", { status: 404 });
  const safeName = document.fileName.replace(/[\r\n"]/g, "_");
  return new Response(new Uint8Array(document.data), {
    headers: {
      "Content-Type": document.contentType,
      "Content-Disposition": "inline; filename*=UTF-8''" + encodeURIComponent(safeName),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
