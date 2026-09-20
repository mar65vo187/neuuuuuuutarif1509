import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { webhookEndpoints } from "@/db/enterprise-schema";
import { authorizeAdmin, adminFailure, readAdminJson } from "@/lib/admin-server";
import { encryptMfaSecret } from "@/lib/mfa";
import { writeAudit } from "@/lib/enterprise";

const schema = z.object({
  name: z.string().trim().min(2).max(160),
  url: z.string().url().max(1000).refine((value) => new URL(value).protocol === "https:", "Webhook-URL muss HTTPS verwenden."),
  eventTypes: z.array(z.string().trim().min(1).max(120)).min(1).max(100),
});

const patchSchema = z.object({
  id: z.number().int().positive(),
  active: z.boolean(),
});

export async function GET(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request, false);
    if (admin instanceof NextResponse) return admin;
    const endpoints = await db.select({
      id: webhookEndpoints.id,
      name: webhookEndpoints.name,
      url: webhookEndpoints.url,
      eventTypes: webhookEndpoints.eventTypes,
      active: webhookEndpoints.active,
      createdAt: webhookEndpoints.createdAt,
    }).from(webhookEndpoints).orderBy(webhookEndpoints.name);
    return NextResponse.json({ ok: true, endpoints }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return adminFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const parsed = schema.safeParse(await readAdminJson(request));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." }, { status: 422 });
    const secret = randomBytes(32).toString("hex");
    const endpoint = await db.transaction(async (tx) => {
      const [created] = await tx.insert(webhookEndpoints).values({
        ...parsed.data,
        secretHash: encryptMfaSecret(secret),
        createdByEmployeeId: admin.id,
      }).returning({ id: webhookEndpoints.id, name: webhookEndpoints.name, url: webhookEndpoints.url, eventTypes: webhookEndpoints.eventTypes });
      await writeAudit(tx, admin.id, "webhook.created", "webhook_endpoint", created.id, undefined, { name: created.name, url: created.url, eventTypes: created.eventTypes });
      return created;
    });
    return NextResponse.json({ ok: true, endpoint, secret }, { status: 201 });
  } catch (error) { return adminFailure(error); }
}


export async function PATCH(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const parsed = patchSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Ungültige Webhook-Aktion." }, { status: 422 });

    const endpoint = await db.transaction(async (tx) => {
      const [before] = await tx.select({
        id: webhookEndpoints.id,
        name: webhookEndpoints.name,
        active: webhookEndpoints.active,
      }).from(webhookEndpoints).where(eq(webhookEndpoints.id, parsed.data.id)).limit(1);
      if (!before) return null;

      const [updated] = await tx.update(webhookEndpoints)
        .set({ active: parsed.data.active, updatedAt: new Date() })
        .where(eq(webhookEndpoints.id, parsed.data.id))
        .returning({ id: webhookEndpoints.id, name: webhookEndpoints.name, active: webhookEndpoints.active });

      await writeAudit(tx, admin.id, "webhook.status", "webhook_endpoint", updated.id, { active: before.active }, { active: updated.active, name: updated.name });
      return updated;
    });

    if (!endpoint) return NextResponse.json({ ok: false, error: "Webhook nicht gefunden." }, { status: 404 });
    return NextResponse.json({ ok: true, endpoint });
  } catch (error) { return adminFailure(error); }
}
