import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { customerCrmProfiles, customers, orders, tasks } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { leadAccessCondition } from "@/lib/queries";
import { orderUpdateSchema } from "@/lib/enterprise-validation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { customerAccess, updateOrder, writeAudit } from "@/lib/enterprise";
import { getLeadAssignableEmployee, getOrderAssignableEmployee, getTaskAssignableEmployee, PORTAL_PERMISSION, requirePermission } from "@/lib/enterprise-access";
import { reassignLeadFollowUps } from "@/lib/lead-mutation";

const schema = z.object({
  entity: z.enum(["lead", "order", "task", "customer"]),
  ids: z.array(z.number().int().positive()).min(1).max(500),
  action: z.enum(["status", "assign_to_me", "assign_employee", "customer_lifecycle", "customer_relationship", "customer_risk", "customer_review"]),
  value: z.string().trim().max(120).optional(),
  employeeId: z.number().int().positive().optional(),
});

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  try {
    const parsed = schema.safeParse(await readJsonBody(request, 32 * 1024));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Ungültige Bulk-Aktion." }, { status: 422 });
    const { entity, action, value, employeeId } = parsed.data;
    const ids = [...new Set(parsed.data.ids)];

    const validActions: Record<typeof entity, Set<typeof action>> = {
      lead: new Set(["status", "assign_to_me", "assign_employee"]),
      order: new Set(["status", "assign_employee"]),
      task: new Set(["status", "assign_employee"]),
      customer: new Set(["customer_lifecycle", "customer_relationship", "customer_risk", "customer_review"]),
    };
    if (!validActions[entity].has(action)) {
      return NextResponse.json({ ok: false, error: "Diese Bulk-Aktion ist für den Datensatztyp nicht zulässig." }, { status: 422 });
    }

    if (entity === "lead") await requirePermission(user, action === "assign_employee" ? PORTAL_PERMISSION.LEAD_ASSIGN : PORTAL_PERMISSION.LEAD_EDIT);
    if (entity === "order") await requirePermission(user, PORTAL_PERMISSION.ORDER_EDIT);
    if (entity === "order" && action === "assign_employee" && user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Nur Administratoren dürfen Aufträge gesammelt neu zuweisen." }, { status: 403 });
    }
    if (entity === "task") await requirePermission(user, PORTAL_PERMISSION.TASK_MANAGE);
    if (entity === "task" && action === "assign_employee" && user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Nur Administratoren dürfen Aufgaben gesammelt neu zuweisen." }, { status: 403 });
    }
    if (entity === "customer") await requirePermission(user, PORTAL_PERMISSION.CUSTOMER_EDIT);

    if (entity === "order") {
      if (ids.length > 100) return NextResponse.json({ ok: false, error: "Maximal 100 Aufträge pro Bulk-Aktion." }, { status: 422 });

      if (action === "assign_employee") {
        if (!employeeId) return NextResponse.json({ ok: false, error: "Bitte einen Mitarbeiter für die Zuweisung auswählen." }, { status: 422 });
        const target = await getOrderAssignableEmployee(employeeId);
        if (!target) return NextResponse.json({ ok: false, error: "Mitarbeiter ist nicht aktiv oder hat keinen Zugriff auf Aufträge." }, { status: 422 });
        const changed = await db.transaction(async (tx) => {
          const now = new Date();
          const rows = await tx.update(orders).set({
            advisorEmployeeId: target.id,
            updatedAt: now,
          }).where(inArray(orders.id, ids)).returning({ id: orders.id });
          const changedIds = rows.map((row) => row.id);
          if (changedIds.length) {
            await tx.update(tasks).set({
              assignedToEmployeeId: target.id,
              updatedAt: now,
            }).where(and(
              eq(tasks.entityType, "order"),
              inArray(tasks.entityId, changedIds),
              inArray(tasks.status, ["open", "in_progress"]),
            ));
          }
          await writeAudit(tx, user.id, "order.bulk_assign_employee", "order", null, undefined, {
            ids: changedIds,
            advisorEmployeeId: target.id,
            financialOwnershipChanged: false,
          });
          return changedIds.length;
        });
        return NextResponse.json({ ok: true, changed });
      }

      if (action !== "status" || !value || !orderUpdateSchema.shape.status.safeParse(value).success) {
        return NextResponse.json({ ok: false, error: "Ungültiger Auftragsstatus." }, { status: 422 });
      }
      if (["cancelled", "storno"].includes(value)) await requirePermission(user, PORTAL_PERMISSION.ORDER_CANCEL);

      let changed = 0;
      const failed: Array<{ id: number; error: string }> = [];
      for (const id of ids) {
        try {
          await updateOrder(id, { status: value }, user);
          changed += 1;
        } catch (error) {
          failed.push({ id, error: error instanceof Error ? error.message : "Aktualisierung fehlgeschlagen." });
        }
      }
      return NextResponse.json({
        ok: changed > 0,
        changed,
        failedCount: failed.length,
        failed: failed.slice(0, 20),
      }, { status: changed > 0 ? 200 : 422 });
    }

    const changed = await db.transaction(async (tx) => {
      if (entity === "customer") {
        if (ids.length > 100) throw new Error("Maximal 100 Kunden pro Bulk-Aktion.");

        const accessibleRows = await tx.select({ id: customers.id })
          .from(customers)
          .where(and(inArray(customers.id, ids), customerAccess(user)))
          .for("update");
        const accessibleIds = accessibleRows.map((row) => row.id);
        if (!accessibleIds.length) return 0;

        const now = new Date();
        const profilePatch: {
          lifecycleStage?: string;
          relationshipStatus?: string;
          riskLevel?: string;
          nextReviewAt?: Date | null;
          updatedByEmployeeId: number;
          updatedAt: Date;
        } = {
          updatedByEmployeeId: user.id,
          updatedAt: now,
        };
        let field = "";
        let auditedValue: string | null = value ?? null;

        if (action === "customer_lifecycle") {
          if (!value || !["prospect", "active", "retention", "dormant", "closed"].includes(value)) throw new Error("Ungültiger Lifecycle.");
          profilePatch.lifecycleStage = value;
          field = "lifecycleStage";
        } else if (action === "customer_relationship") {
          if (!value || !["new", "developing", "established", "at_risk", "inactive"].includes(value)) throw new Error("Ungültiger Beziehungsstatus.");
          profilePatch.relationshipStatus = value;
          field = "relationshipStatus";
        } else if (action === "customer_risk") {
          if (!value || !["low", "normal", "high", "critical"].includes(value)) throw new Error("Ungültige Risikostufe.");
          profilePatch.riskLevel = value;
          field = "riskLevel";
        } else if (action === "customer_review") {
          field = "nextReviewAt";
          if (value === "clear") {
            profilePatch.nextReviewAt = null;
            auditedValue = null;
          } else {
            const days = Number(value);
            if (!Number.isInteger(days) || ![7, 30, 90, 180].includes(days)) throw new Error("Ungültiger Review-Zeitraum.");
            profilePatch.nextReviewAt = new Date(now.getTime() + days * 24 * 60 * 60_000);
            auditedValue = profilePatch.nextReviewAt.toISOString();
          }
        } else {
          throw new Error("Ungültige Kundenaktion.");
        }

        await tx.insert(customerCrmProfiles)
          .values(accessibleIds.map((customerId) => ({ customerId, ...profilePatch })))
          .onConflictDoUpdate({
            target: customerCrmProfiles.customerId,
            set: profilePatch,
          });
        await tx.update(customers).set({ updatedAt: now }).where(inArray(customers.id, accessibleIds));
        await writeAudit(tx, user.id, "customer.bulk_profile", "customer", null, undefined, {
          ids: accessibleIds,
          field,
          value: auditedValue,
          changed: accessibleIds.length,
        });
        return accessibleIds.length;
      }

      if (entity === "lead") {
        if (action === "assign_to_me") {
          const now = new Date();
          const rows = await tx.update(leads).set({ assignedEmployeeId: user.id, updatedAt: now })
            .where(and(inArray(leads.id, ids), leadAccessCondition(user))).returning({ id: leads.id });
          const changedIds = rows.map((row) => row.id);
          await reassignLeadFollowUps(tx, changedIds, user.id, now);
          await writeAudit(tx, user.id, "lead.bulk_assign", "lead", null, undefined, { ids: changedIds, assignedEmployeeId: user.id });
          return rows.length;
        }
        if (action === "assign_employee") {
          if (!employeeId) throw new Error("Bitte einen Mitarbeiter für die Zuweisung auswählen.");
          const target = await getLeadAssignableEmployee(employeeId);
          if (!target) throw new Error("Mitarbeiter ist nicht aktiv oder hat keinen Zugriff auf Leads.");
          const now = new Date();
          const rows = await tx.update(leads).set({ assignedEmployeeId: target.id, updatedAt: now })
            .where(and(inArray(leads.id, ids), leadAccessCondition(user))).returning({ id: leads.id });
          const changedIds = rows.map((row) => row.id);
          await reassignLeadFollowUps(tx, changedIds, target.id, now);
          await writeAudit(tx, user.id, "lead.bulk_assign_employee", "lead", null, undefined, { ids: changedIds, assignedEmployeeId: target.id });
          return rows.length;
        }
        const allowed = ["neu","kontaktiert","in_beratung","abgeschlossen","verloren"];
        if (!value || !allowed.includes(value)) {
          if (value === "termin_bestaetigt") throw new Error("Termine bitte einzeln öffnen und mit konkreter Terminzeit speichern.");
          throw new Error("Ungültiger Lead-Status.");
        }
        const now = new Date();
        const patch: Partial<typeof leads.$inferInsert> = {
          status: value as typeof leads.status.enumValues[number],
          updatedAt: now,
        };
        if (value === "kontaktiert") patch.lastContactAt = now;
        if (["abgeschlossen", "verloren"].includes(value)) {
          patch.closedAt = now;
          patch.nextActionAt = null;
        } else {
          patch.closedAt = null;
        }

        const rows = await tx.update(leads).set(patch)
          .where(and(inArray(leads.id, ids), leadAccessCondition(user))).returning({ id: leads.id });
        const changedIds = rows.map((row) => row.id);

        if (changedIds.length && ["abgeschlossen", "verloren"].includes(value)) {
          await tx.update(tasks).set({ status: "cancelled", completedAt: null, updatedAt: now }).where(and(
            eq(tasks.entityType, "lead"),
            eq(tasks.type, "crm_follow_up"),
            inArray(tasks.entityId, changedIds),
            inArray(tasks.status, ["open", "in_progress"]),
          ));
        }

        await writeAudit(tx, user.id, "lead.bulk_status", "lead", null, undefined, { ids: changedIds, status: value });
        return rows.length;
      }
      const condition = user.role === "admin" ? inArray(tasks.id, ids) : and(inArray(tasks.id, ids), eq(tasks.assignedToEmployeeId, user.id));
      if (action === "assign_employee") {
        if (!employeeId) throw new Error("Bitte einen Mitarbeiter für die Zuweisung auswählen.");
        const target = await getTaskAssignableEmployee(employeeId);
        if (!target) throw new Error("Mitarbeiter ist nicht aktiv oder hat keinen Zugriff auf Aufgaben.");
        const rows = await tx.update(tasks).set({
          assignedToEmployeeId: target.id,
          updatedAt: new Date(),
        }).where(condition).returning({ id: tasks.id });
        await writeAudit(tx, user.id, "task.bulk_assign_employee", "task", null, undefined, {
          ids: rows.map((row) => row.id),
          assignedToEmployeeId: target.id,
        });
        return rows.length;
      }

      if (action !== "status" || !value || !["open","in_progress","completed","cancelled"].includes(value)) throw new Error("Ungültiger Aufgabenstatus.");
      const rows = await tx.update(tasks).set({
        status: value,
        completedAt: value === "completed" ? sql`coalesce(${tasks.completedAt}, now())` : null,
        updatedAt: new Date(),
      }).where(condition).returning({ id: tasks.id });
      await writeAudit(tx, user.id, "task.bulk_status", "task", null, undefined, { ids: rows.map((r) => r.id), status: value });
      return rows.length;
    });
    return NextResponse.json({ ok: true, changed });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    const errorStatus = typeof error === "object" && error && "status" in error ? Number(error.status) : 500;
    const status = Number.isInteger(errorStatus) && errorStatus >= 400 && errorStatus < 500 ? errorStatus : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Bulk-Aktion fehlgeschlagen." }, { status });
  }
}
