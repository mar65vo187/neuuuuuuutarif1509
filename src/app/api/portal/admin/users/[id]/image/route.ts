import sharp from "sharp";
import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { employeeImages, employees } from "@/db/schema";
import { adminFailure, lockAdminMutation, AdminRequestError, authorizeAdmin, positiveId, readBoundedBody } from "@/lib/admin-server";
import { inspectProfileImage, MAX_PROFILE_IMAGE_BYTES } from "@/lib/advisor-image";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const employeeId = positiveId((await context.params).id);
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data;")) throw new AdminRequestError("Bitte das Bild als Datei hochladen.", 415);

    const body = await readBoundedBody(request, MAX_PROFILE_IMAGE_BYTES + 64 * 1024);
    let form: FormData;
    try { form = await new Response(new Uint8Array(body), { headers: { "Content-Type": contentType } }).formData(); }
    catch { throw new AdminRequestError("Der Datei-Upload ist ungültig.", 400); }

    const file = form.get("image");
    if (!(file instanceof File) || form.getAll("image").length !== 1 || file.size === 0) throw new AdminRequestError("Bitte genau ein Mitarbeiterbild auswählen.", 422);
    if (file.size > MAX_PROFILE_IMAGE_BYTES) throw new AdminRequestError("Das Bild darf höchstens 5 MB groß sein.", 413);

    const original = Buffer.from(await file.arrayBuffer());
    const image = inspectProfileImage(original);
    if (!image) throw new AdminRequestError("Bitte ein gültiges JPG-, PNG- oder WebP-Bild mit höchstens 20 Megapixeln auswählen.", 422);

    let data: Buffer;
    try {
      data = await sharp(original, { limitInputPixels: 20_000_000, failOn: "warning", animated: false })
        .rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 88 }).toBuffer();
    } catch {
      throw new AdminRequestError("Das Bild ist beschädigt oder kann nicht gelesen werden.", 422);
    }

    const digest = createHash("sha256").update(data).digest("hex");
    const imageUrl = `/api/portal/employees/${employeeId}/image?v=${digest.slice(0, 16)}`;

    await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      const [employee] = await tx.select({ id: employees.id }).from(employees).where(eq(employees.id, employeeId)).for("update");
      if (!employee) throw new AdminRequestError("Mitarbeiter nicht gefunden.", 404);
      await tx.insert(employeeImages).values({ employeeId, contentType: "image/webp", data, digest })
        .onConflictDoUpdate({ target: employeeImages.employeeId, set: { contentType: "image/webp", data, digest, updatedAt: new Date() } });
      await tx.update(employees).set({ imageUrl }).where(eq(employees.id, employeeId));
    });

    return NextResponse.json({ ok: true, imageUrl });
  } catch (error) {
    return adminFailure(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const employeeId = positiveId((await context.params).id);
    await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      const [employee] = await tx.select({ id: employees.id }).from(employees).where(eq(employees.id, employeeId)).for("update");
      if (!employee) throw new AdminRequestError("Mitarbeiter nicht gefunden.", 404);
      await tx.delete(employeeImages).where(eq(employeeImages.employeeId, employeeId));
      await tx.update(employees).set({ imageUrl: null }).where(eq(employees.id, employeeId));
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminFailure(error);
  }
}
