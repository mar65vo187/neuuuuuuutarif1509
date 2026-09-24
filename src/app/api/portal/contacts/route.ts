import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { products, prospectContactProductLinks, prospectContacts } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { contactDuplicateError, lockAndFindStrongContactDuplicate, normalizeContactEmail, normalizeContactPhone } from "@/lib/contact-identity";
import { writeAudit } from "@/lib/enterprise";
import { PORTAL_PERMISSION, requirePermission } from "@/lib/enterprise-access";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

export const dynamic = "force-dynamic";

const text = (max: number) => z.string().trim().max(max);
const schema = z.object({
  name: text(120).optional().default(""),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(200)]).optional().default(""),
  phone: text(40).optional().default(""),
  region: text(80).optional().default(""),
  topic: text(1000).optional().default(""),
  preferredChannel: text(40).optional().default(""),
  preferredTime: text(120).optional().default(""),
  note: text(2000).optional().default(""),
  tags: z.array(text(40)).max(12).default([]),
  nextContactAt: z.string().datetime().nullable().optional(),
  productSelections: z.array(z.object({
    productId: z.number().int().positive(),
    relation: z.enum(["interest", "existing", "sold"]).default("interest"),
  })).max(30).default([]),
}).superRefine((data, ctx) => {
  if (![data.name, data.email, data.phone, data.topic, data.note].some((value) => value.trim())) {
    ctx.addIssue({ code: "custom", path: ["name"], message: "Bitte mindestens Name, E-Mail, Telefon, Thema oder Notiz eintragen." });
  }
});

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  try { await requirePermission(user, PORTAL_PERMISSION.LEAD_EDIT); }
  catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Keine Berechtigung." }, { status: 403 });
  }

  let body: unknown;
  try { body = await readJsonBody(request, 32 * 1024); }
  catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." }, { status: error instanceof RequestBodyError ? error.status : 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." }, { status: 422 });
  const data = parsed.data;

  try {
    const created = await db.transaction(async (tx) => {
      const duplicate = await lockAndFindStrongContactDuplicate(tx, { email: data.email, phone: data.phone }, user);
      if (duplicate) throw contactDuplicateError(duplicate);

      const uniqueSelections = [...new Map(data.productSelections.map((item) => [item.productId, item] as const)).values()];
      if (uniqueSelections.length) {
        const available = await tx.select({ id: products.id }).from(products).where(and(
          inArray(products.id, uniqueSelections.map((item) => item.productId)),
          eq(products.active, true),
        ));
        if (available.length !== uniqueSelections.length) throw new Error("PRODUCT_NOT_FOUND");
      }

      const normalizedEmail = normalizeContactEmail(data.email) || null;
      const normalizedPhone = normalizeContactPhone(data.phone) || null;
      const [contact] = await tx.insert(prospectContacts).values({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        normalizedEmail,
        normalizedPhone,
        region: data.region || null,
        topic: data.topic || null,
        preferredChannel: data.preferredChannel || null,
        preferredTime: data.preferredTime || null,
        note: data.note,
        tags: [...new Set(data.tags.map((tag) => tag.trim()).filter(Boolean))],
        ownerEmployeeId: user.id,
        createdByEmployeeId: user.id,
        nextContactAt: data.nextContactAt ? new Date(data.nextContactAt) : null,
      }).returning({ id: prospectContacts.id });

      if (uniqueSelections.length) {
        await tx.insert(prospectContactProductLinks).values(uniqueSelections.map((item) => ({
          contactId: contact.id,
          productId: item.productId,
          relation: item.relation,
          createdByEmployeeId: user.id,
        })));
      }

      await writeAudit(tx, user.id, "contact_pool.created", "contact", contact.id, undefined, {
        topic: data.topic || null,
        nextContactAt: data.nextContactAt ?? null,
        productSelections: uniqueSelections,
      });
      return contact;
    });

    return NextResponse.json({ ok: true, id: created.id, kind: "contact" }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Mindestens ein ausgewähltes Produkt ist nicht verfügbar." }, { status: 422 });
    }
    const status = typeof (error as { status?: unknown })?.status === "number" ? Number((error as { status: number }).status) : 503;
    const duplicate = typeof error === "object" && error && "duplicate" in error ? (error as { duplicate?: unknown }).duplicate : undefined;
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Kontakt konnte nicht gespeichert werden.",
      ...(duplicate ? { duplicate } : {}),
    }, { status });
  }
}
