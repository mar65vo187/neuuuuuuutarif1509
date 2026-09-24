import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { internalDocuments, providers } from "@/db/enterprise-schema";
import { adminFailure, authorizeAdmin, lockAdminMutation } from "@/lib/admin-server";
import { isCompensationOwner } from "@/lib/compensation";
import { writeAudit } from "@/lib/enterprise";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SIZE = 12 * 1024 * 1024;
const ALLOWED = new Set([
  "text/csv",
  "application/csv",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

function safeFilename(value: string) {
  return value.replace(/[\u0000-\u001f\u007f/\\]/g, "_").slice(0, 180) || "provisionsliste";
}

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    if (!isCompensationOwner(admin)) {
      return NextResponse.json({ ok: false, error: "Nur der Owner-Account darf Provisionslisten hochladen." }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get("file");
    const providerId = Number(form.get("providerId"));
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Bitte eine Datei auswählen." }, { status: 422 });
    if (!Number.isInteger(providerId) || providerId <= 0) return NextResponse.json({ ok: false, error: "Bitte einen Partner auswählen." }, { status: 422 });
    if (file.size < 1 || file.size > MAX_SIZE) return NextResponse.json({ ok: false, error: "Datei darf maximal 12 MB groß sein." }, { status: 413 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ ok: false, error: "Erlaubt sind CSV, XLS/XLSX und PDF." }, { status: 415 });

    const [provider] = await db.select({ id: providers.id, name: providers.name }).from(providers).where(eq(providers.id, providerId)).limit(1);
    if (!provider) return NextResponse.json({ ok: false, error: "Partner nicht gefunden." }, { status: 404 });

    const data = Buffer.from(await file.arrayBuffer());
    const digest = createHash("sha256").update(data).digest("hex");
    const filename = safeFilename(file.name);

    const result = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      const [document] = await tx.insert(internalDocuments).values({
        category: "commission_list_source",
        title: `Provisionsliste · ${provider.name} · ${filename}`,
        fileName: filename,
        contentType: file.type,
        data,
        digest,
        sizeBytes: data.length,
        providerId: provider.id,
        visibility: "owner",
        uploadedByEmployeeId: admin.id,
      }).returning({ id: internalDocuments.id });
      await writeAudit(tx, admin.id, "commission_list.source_uploaded", "provider", provider.id, undefined, {
        documentId: document.id,
        filename,
        sizeBytes: data.length,
      });
      return document;
    });

    return NextResponse.json({ ok: true, documentId: result.id, filename, contentType: file.type }, { status: 201 });
  } catch (error) {
    return adminFailure(error);
  }
}
