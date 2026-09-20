import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { leadNotes, leads } from "@/db/schema";
import { leadProductLinks, products } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { leadAccessCondition } from "@/lib/queries";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { emitEvent, writeAudit } from "@/lib/enterprise";

export const dynamic = "force-dynamic";

const schema = z.object({
  productId: z.number().int().positive(),
  relation: z.enum(["interest", "existing", "sold"]),
  note: z.string().trim().max(500).optional(),
});

const RELATION_LABELS: Record<string, string> = {
  interest: "Interesse",
  existing: "Bereits vorhanden",
  sold: "Über TarifWerk abgeschlossen",
};

async function context(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return { error: NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 }) };
  const user = await getCurrentUser().catch(() => null);
  if (!user) return { error: NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 }) };
  const { id: raw } = await ctx.params;
  const leadId = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(leadId) || leadId <= 0 || leadId > 2147483647) {
    return { error: NextResponse.json({ ok: false, error: "Ungültige Lead-ID." }, { status: 400 }) };
  }
  return { user, leadId };
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const resolved = await context(request, ctx);
  if ("error" in resolved) return resolved.error;
  const { user, leadId } = resolved;

  try {
    const parsed = schema.safeParse(await readJsonBody(request, 16 * 1024));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Produktangabe ist ungültig." }, { status: 422 });
    const input = parsed.data;

    const result = await db.transaction(async (tx) => {
      const [lead] = await tx.select({ id: leads.id, name: leads.name }).from(leads)
        .where(and(eq(leads.id, leadId), leadAccessCondition(user))).limit(1).for("update");
      if (!lead) return null;

      const [product] = await tx.select({ id: products.id, name: products.name }).from(products)
        .where(and(eq(products.id, input.productId), eq(products.active, true))).limit(1);
      if (!product) throw new Error("Produkt nicht gefunden oder nicht aktiv.");

      await tx.insert(leadProductLinks).values({
        leadId,
        productId: product.id,
        relation: input.relation,
        note: input.note ?? "",
        createdByEmployeeId: user.id,
      }).onConflictDoUpdate({
        target: [leadProductLinks.leadId, leadProductLinks.productId, leadProductLinks.relation],
        set: { note: input.note ?? "", createdByEmployeeId: user.id },
      });

      await tx.insert(leadNotes).values({
        leadId,
        employeeId: user.id,
        kind: "system",
        body: `Produktzuordnung: ${RELATION_LABELS[input.relation]} · ${product.name}.`,
      });

      await writeAudit(tx, user.id, "lead.product.upserted", "lead", leadId, undefined, {
        productId: product.id,
        productName: product.name,
        relation: input.relation,
      });
      await emitEvent(tx, "lead.product.updated", "lead", leadId, {
        assignedEmployeeId: user.id,
        productId: product.id,
        relation: input.relation,
      });

      return { productId: product.id };
    });

    if (!result) return NextResponse.json({ ok: false, error: "Lead nicht gefunden." }, { status: 404 });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Produkt konnte nicht gespeichert werden." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const resolved = await context(request, ctx);
  if ("error" in resolved) return resolved.error;
  const { user, leadId } = resolved;

  try {
    const parsed = schema.pick({ productId: true, relation: true }).safeParse(await readJsonBody(request, 8 * 1024));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Produktangabe ist ungültig." }, { status: 422 });
    const input = parsed.data;

    const deleted = await db.transaction(async (tx) => {
      const [lead] = await tx.select({ id: leads.id }).from(leads)
        .where(and(eq(leads.id, leadId), leadAccessCondition(user))).limit(1);
      if (!lead) return false;

      const rows = await tx.delete(leadProductLinks).where(and(
        eq(leadProductLinks.leadId, leadId),
        eq(leadProductLinks.productId, input.productId),
        eq(leadProductLinks.relation, input.relation),
      )).returning({ productId: leadProductLinks.productId });

      if (rows.length) {
        await writeAudit(tx, user.id, "lead.product.deleted", "lead", leadId, {
          productId: input.productId,
          relation: input.relation,
        });
      }
      return rows.length > 0;
    });

    if (!deleted) return NextResponse.json({ ok: false, error: "Produktzuordnung nicht gefunden." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, error: "Produkt konnte nicht entfernt werden." }, { status: 500 });
  }
}
