import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { leadNotes, leads } from "@/db/schema";
import { leadProductLinks, prospectContactProductLinks, prospectContacts, tasks } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { contactDuplicateError, lockAndFindStrongContactDuplicate } from "@/lib/contact-identity";
import { emitEvent, runAutomationEvent, writeAudit } from "@/lib/enterprise";
import { PORTAL_PERMISSION, requirePermission } from "@/lib/enterprise-access";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  try { await requirePermission(user, PORTAL_PERMISSION.LEAD_EDIT); }
  catch (error) { return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Keine Berechtigung." }, { status: 403 }); }

  const contactId = Number((await context.params).id);
  if (!Number.isInteger(contactId) || contactId <= 0) return NextResponse.json({ ok: false, error: "Kontakt nicht gefunden." }, { status: 404 });

  try {
    const lead = await db.transaction(async (tx) => {
      const [contact] = await tx.select().from(prospectContacts)
        .where(eq(prospectContacts.id, contactId)).limit(1).for("update");
      if (!contact) throw new Error("CONTACT_NOT_FOUND");
      const owner = contact.ownerEmployeeId ?? contact.createdByEmployeeId;
      if (user.role !== "admin" && owner !== user.id) throw Object.assign(new Error("Keine Berechtigung für diesen Kontakt."), { status: 403 });
      if (contact.convertedLeadId) return { id: contact.convertedLeadId, existing: true };

      const duplicate = await lockAndFindStrongContactDuplicate(
        tx,
        { email: contact.email, phone: contact.phone },
        user,
        { excludeContactId: contact.id },
      );
      if (duplicate) throw contactDuplicateError(duplicate);

      const [created] = await tx.insert(leads).values({
        type: "kontakt",
        status: "neu",
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        topic: contact.topic,
        region: contact.region,
        message: contact.note || null,
        preferredChannel: contact.preferredChannel,
        preferredTime: contact.preferredTime,
        assignedEmployeeId: owner ?? user.id,
        createdByEmployeeId: user.id,
        source: "contact_pool",
        priority: "normal",
        contactOutcome: "open",
        nextActionAt: contact.nextContactAt,
        tags: contact.tags,
      }).returning({ id: leads.id });

      const productLinks = await tx.select({
        productId: prospectContactProductLinks.productId,
        relation: prospectContactProductLinks.relation,
      }).from(prospectContactProductLinks)
        .where(eq(prospectContactProductLinks.contactId, contact.id));
      if (productLinks.length) {
        await tx.insert(leadProductLinks).values(productLinks.map((item) => ({
          leadId: created.id,
          productId: item.productId,
          relation: item.relation,
          createdByEmployeeId: user.id,
        })));
      }

      await tx.insert(leadNotes).values({
        leadId: created.id,
        employeeId: user.id,
        kind: "system",
        body: `${user.name} hat Kontakt #${contact.id} aus dem Kontaktpool als Lead qualifiziert.`,
      });

      if (contact.nextContactAt) {
        await tx.insert(tasks).values({
          entityType: "lead",
          entityId: created.id,
          assignedToEmployeeId: owner ?? user.id,
          createdByEmployeeId: user.id,
          type: "crm_follow_up",
          title: `Lead nachfassen: ${contact.name || contact.email || contact.phone || "#" + created.id}`,
          priority: "normal",
          status: "open",
          dueAt: contact.nextContactAt,
        });
      }

      await tx.update(prospectContacts).set({
        status: "converted",
        convertedLeadId: created.id,
        updatedAt: new Date(),
      }).where(eq(prospectContacts.id, contact.id));

      await writeAudit(tx, user.id, "contact_pool.converted", "contact", contact.id, { status: contact.status }, { leadId: created.id });
      await writeAudit(tx, user.id, "lead.created", "lead", created.id, undefined, { source: "contact_pool", contactId: contact.id });
      await emitEvent(tx, "lead.created", "lead", created.id, {
        assignedEmployeeId: owner ?? user.id,
        source: "contact_pool",
        status: "neu",
        priority: "normal",
      });
      await runAutomationEvent(tx, "lead.created", "lead", created.id, {
        assignedEmployeeId: owner ?? user.id,
        source: "contact_pool",
        status: "neu",
        priority: "normal",
      }, user.id);

      return { id: created.id, existing: false };
    });

    return NextResponse.json({ ok: true, leadId: lead.id, existing: lead.existing });
  } catch (error) {
    if (error instanceof Error && error.message === "CONTACT_NOT_FOUND") return NextResponse.json({ ok: false, error: "Kontakt nicht gefunden." }, { status: 404 });
    const status = typeof (error as { status?: unknown })?.status === "number" ? Number((error as { status: number }).status) : 503;
    const duplicate = typeof error === "object" && error && "duplicate" in error ? (error as { duplicate?: unknown }).duplicate : undefined;
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Kontakt konnte nicht in einen Lead umgewandelt werden.",
      ...(duplicate ? { duplicate } : {}),
    }, { status });
  }
}
