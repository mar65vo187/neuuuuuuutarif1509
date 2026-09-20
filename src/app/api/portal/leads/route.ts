import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { advisors, leadNotes, leads } from "@/db/schema";
import { leadProductLinks, products, tasks } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { portalLeadCreateSchema } from "@/lib/validation";
import { emitEvent, runAutomationEvent, writeAudit } from "@/lib/enterprise";
import { PORTAL_PERMISSION, requirePermission } from "@/lib/enterprise-access";
import { contactDuplicateError, lockAndFindStrongContactDuplicate } from "@/lib/contact-identity";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  try { await requirePermission(user, PORTAL_PERMISSION.LEAD_EDIT); }
  catch (error) {
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: unknown }).status) : 403;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Keine Berechtigung." }, { status: Number.isFinite(status) ? status : 403 });
  }

  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof RequestBodyError ? error.message : "Ungültige Anfrage." }, { status: error instanceof RequestBodyError ? error.status : 400 });
  }

  const parsed = portalLeadCreateSchema.safeParse({ ...(body as object), consent: true, source: "portal" });
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Bitte die Eingaben prüfen." }, { status: 422 });
  const data = parsed.data;
  if (data.status === "termin_bestaetigt" && !data.confirmedSlot?.trim()) {
    return NextResponse.json({ ok: false, error: "Für einen terminierten Lead bitte eine Terminzeit eintragen." }, { status: 422 });
  }

  try {
    let advisorId: number | null = null;
    if (data.advisorSlug) {
      const [advisor] = await db.select({ id: advisors.id }).from(advisors).where(and(eq(advisors.slug, data.advisorSlug), eq(advisors.active, true))).limit(1);
      if (!advisor) return NextResponse.json({ ok: false, error: "Der ausgewählte Berater ist nicht verfügbar." }, { status: 422 });
      advisorId = advisor.id;
    }
    const created = await db.transaction(async (tx) => {
      const duplicate = await lockAndFindStrongContactDuplicate(tx, { email: data.email, phone: data.phone }, user);
      if (duplicate) throw contactDuplicateError(duplicate);

      const requestedProductSelections = [...data.productSelections];
      if (data.productId) {
        requestedProductSelections.push({
          productId: data.productId,
          relation: data.productRelation ?? "interest",
        });
      }
      const uniqueSelections = [...new Map(
        requestedProductSelections.map((selection) => [selection.productId, selection] as const),
      ).values()].slice(0, 30);

      let selectedProducts: Array<{ id: number; name: string; relation: "interest" | "existing" | "sold" }> = [];
      if (uniqueSelections.length > 0) {
        const productRows = await tx
          .select({ id: products.id, name: products.name })
          .from(products)
          .where(and(
            inArray(products.id, uniqueSelections.map((selection) => selection.productId)),
            eq(products.active, true),
          ));
        if (productRows.length !== uniqueSelections.length) {
          throw new Error("Mindestens eines der ausgewählten Produkte ist nicht verfügbar.");
        }
        const productById = new Map(productRows.map((product) => [product.id, product] as const));
        selectedProducts = uniqueSelections.map((selection) => ({
          ...productById.get(selection.productId)!,
          relation: selection.relation,
        }));
      }

      const now = new Date();
      const nextActionAt = data.nextActionAt ? new Date(data.nextActionAt) : null;
      const closed = ["abgeschlossen", "verloren"].includes(data.status);

      const [lead] = await tx.insert(leads).values({
        type: data.type,
        status: data.status,
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || null,
        topic: data.topic || null,
        region: data.region || null,
        situation: data.situation || null,
        message: data.message || null,
        preferredChannel: data.preferredChannel || null,
        preferredTime: data.preferredTime || null,
        advisorId,
        assignedEmployeeId: user.id,
        createdByEmployeeId: user.id,
        source: "portal",
        priority: data.priority,
        contactOutcome: data.contactOutcome,
        nextActionAt: closed ? null : nextActionAt,
        lastContactAt: data.contactOutcome !== "open" || data.status === "kontaktiert" ? now : null,
        closedAt: closed ? now : null,
        tags: [...new Set(data.tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 12),
        confirmedSlot: data.status === "termin_bestaetigt" ? data.confirmedSlot || null : null,
        confirmedAt: data.status === "termin_bestaetigt" ? now : null,
      }).returning({ id: leads.id });

      const leadLabel = data.name || data.email || data.phone || `Lead #${lead.id}`;
      const systemNotes = [`${user.name} hat den Lead im Mitarbeiterportal angelegt.`];
      if (selectedProducts.length > 0) {
        await tx.insert(leadProductLinks).values(selectedProducts.map((product) => ({
          leadId: lead.id,
          productId: product.id,
          relation: product.relation,
          createdByEmployeeId: user.id,
        })));
        systemNotes.push(`Produktzuordnungen beim Anlegen: ${selectedProducts.map((product) => `${product.name} · ${product.relation}`).join(", ")}.`);
      }

      if (!closed && nextActionAt) {
        await tx.insert(tasks).values({
          entityType: "lead",
          entityId: lead.id,
          assignedToEmployeeId: user.id,
          createdByEmployeeId: user.id,
          type: "crm_follow_up",
          title: `Lead nachfassen: ${leadLabel}`,
          priority: data.priority === "hot" ? "critical" : data.priority === "high" ? "high" : "normal",
          status: "open",
          dueAt: nextActionAt,
        });
        systemNotes.push("Wiedervorlage wurde automatisch als Aufgabe angelegt.");
      }

      await tx.insert(leadNotes).values(systemNotes.map((note) => ({ leadId: lead.id, employeeId: user.id, kind: "system", body: note })));
      await writeAudit(tx, user.id, "lead.created", "lead", lead.id, undefined, {
        source: "portal",
        type: data.type,
        status: data.status,
        priority: data.priority,
        contactOutcome: data.contactOutcome,
        nextActionAt: closed ? null : nextActionAt,
        productSelections: selectedProducts.map((product) => ({
          productId: product.id,
          relation: product.relation,
        })),
      });
      await emitEvent(tx, "lead.created", "lead", lead.id, {
        assignedEmployeeId: user.id,
        source: "portal",
        status: data.status,
        priority: data.priority,
      });
      await runAutomationEvent(tx, "lead.created", "lead", lead.id, {
        assignedEmployeeId: user.id,
        source: "portal",
        status: data.status,
        priority: data.priority,
      }, user.id);
      return lead;
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (error) {
    const status = typeof (error as { status?: unknown })?.status === "number" ? Number((error as { status: number }).status) : 503;
    const duplicate = typeof error === "object" && error && "duplicate" in error
      ? (error as { duplicate?: unknown }).duplicate
      : undefined;
    if (status >= 500) console.error("[portal/leads] insert failed");
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Der Lead konnte gerade nicht gespeichert werden.",
        ...(duplicate ? { duplicate } : {}),
      },
      { status },
    );
  }
}