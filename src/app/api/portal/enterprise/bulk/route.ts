import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { employees, leads } from "@/db/schema";
import { tasks } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { leadAccessCondition } from "@/lib/queries";
import { orderUpdateSchema } from "@/lib/enterprise-validation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { updateOrder, writeAudit } from "@/lib/enterprise";
import { PORTAL_PERMISSION, requirePermission } from "@/lib/enterprise-access";

const schema = z.object({
  entity: z.enum(["lead", "order", "task"]),
  ids: z.array(z.number().int().positive()).min(1).max(500),
  action: z.enum(["status", "assign_to_me", "assign_employee"]),
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
    const { entity, ids, action, value, employeeId } = parsed.data;

    if (entity === "lead") await requirePermission(user, action === "assign_employee" ? PORTAL_PERMISSION.LEAD_ASSIGN : PORTAL_PERMISSION.LEAD_EDIT);
    if (entity === "order") await requirePermission(user, PORTAL_PERMISSION.ORDER_EDIT);
    if (entity === "task") await requirePermission(user, PORTAL_PERMISSION.TASK_MANAGE);

    if (entity === "order") {
      if (action !== "status" || !value || !orderUpdateSchema.shape.status.safeParse(value).success) {
        return NextResponse.json({ ok: false, error: "Ungültiger Auftragsstatus." }, { status: 422 });
      }
      if (ids.length > 100) return NextResponse.json({ ok: false, error: "Maximal 100 Aufträge pro Bulk-Aktion." }, { status: 422 });

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
      if (entity === "lead") {
        if (action === "assign_to_me") {
          const rows = await tx.update(leads).set({ assignedEmployeeId: user.id, updatedAt: new Date() })
            .where(and(inArray(leads.id, ids), leadAccessCondition(user))).returning({ id: leads.id });
          await writeAudit(tx, user.id, "lead.bulk_assign", "lead", null, undefined, { ids: rows.map((r) => r.id), assignedEmployeeId: user.id });
          return rows.length;
        }
        if (action === "assign_employee") {
          if (user.role !== "admin" || !employeeId) throw new Error("Nur Administratoren dürfen Leads gezielt zuweisen.");
          const [target] = await tx.select({ id: employees.id }).from(employees)
            .where(and(eq(employees.id, employeeId), eq(employees.active, true))).limit(1);
          if (!target) throw new Error("Mitarbeiter nicht gefunden oder nicht aktiv.");
          const rows = await tx.update(leads).set({ assignedEmployeeId: employeeId, updatedAt: new Date() })
            .where(and(inArray(leads.id, ids), leadAccessCondition(user))).returning({ id: leads.id });
          await writeAudit(tx, user.id, "lead.bulk_assign_employee", "lead", null, undefined, { ids: rows.map((r) => r.id), assignedEmployeeId: employeeId });
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
      if (action !== "status" || !value || !["open","in_progress","completed","cancelled"].includes(value)) throw new Error("Ungültiger Aufgabenstatus.");
      const condition = user.role === "admin" ? inArray(tasks.id, ids) : and(inArray(tasks.id, ids), eq(tasks.assignedToEmployeeId, user.id));
      const rows = await tx.update(tasks).set({
        status: value,
        completedAt: value === "completed" ? new Date() : null,
        updatedAt: new Date(),
      }).where(condition).returning({ id: tasks.id });
      await writeAudit(tx, user.id, "task.bulk_status", "task", null, undefined, { ids: rows.map((r) => r.id), status: value });
      return rows.length;
    });
    return NextResponse.json({ ok: true, changed });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Bulk-Aktion fehlgeschlagen." }, { status: 500 });
  }
}
