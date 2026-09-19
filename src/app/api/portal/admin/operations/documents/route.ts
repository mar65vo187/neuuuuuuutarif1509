import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { desc, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { internalDocuments } from "@/db/enterprise-schema";
import { adminFailure, authorizeAdmin, lockAdminMutation } from "@/lib/admin-server";
import { isCompensationOwner } from "@/lib/compensation";
import { writeAudit } from "@/lib/enterprise";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "text/csv",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function text(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function optionalId(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const declared = Number(request.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_FILE_SIZE + 128 * 1024) {
      return NextResponse.json({ ok: false, error: "Datei ist zu groß. Maximal 5 MB." }, { status: 413 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Datei fehlt." }, { status: 422 });
    if (file.size < 1 || file.size > MAX_FILE_SIZE) return NextResponse.json({ ok: false, error: "Dateigröße muss zwischen 1 Byte und 5 MB liegen." }, { status: 422 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ ok: false, error: "Dieser Dateityp ist nicht erlaubt." }, { status: 415 });

    const category = text(form.get("category"), 100);
    const title = text(form.get("title"), 220);
    const visibility = text(form.get("visibility"), 20) || "team";
    if (!category || title.length < 2 || !["team", "admin", "owner"].includes(visibility)) return NextResponse.json({ ok: false, error: "Dokumentdaten sind unvollständig." }, { status: 422 });
    if (visibility === "owner" && !isCompensationOwner(admin)) return NextResponse.json({ ok: false, error: "Owner-Dokumente können nur vom Owner angelegt werden." }, { status: 403 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const digest = createHash("sha256").update(buffer).digest("hex");
    const productId = optionalId(form.get("productId"));
    const providerId = optionalId(form.get("providerId"));

    const result = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      const [versionRow] = await tx.select({ version: max(internalDocuments.version) }).from(internalDocuments)
        .where(eq(internalDocuments.title, title));
      const version = Number(versionRow?.version ?? 0) + 1;
      const [created] = await tx.insert(internalDocuments).values({
        category,
        title,
        fileName: file.name.slice(0, 240),
        contentType: file.type,
        data: buffer,
        digest,
        sizeBytes: file.size,
        version,
        productId,
        providerId,
        visibility,
        uploadedByEmployeeId: admin.id,
      }).returning({ id: internalDocuments.id });
      await writeAudit(tx, admin.id, "document.uploaded", "internal_document", created.id, undefined, { title, category, version, visibility, sizeBytes: file.size });
      return { ...created, version };
    });
    return NextResponse.json({ ok: true, id: result.id, version: result.version }, { status: 201 });
  } catch (error) { return adminFailure(error); }
}
