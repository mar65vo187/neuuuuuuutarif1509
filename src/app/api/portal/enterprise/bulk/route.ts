import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { orders, tasks } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { leadAccessCondition } from "@/lib/queries";
import { orderUpdateSchema } from "@/lib/enterprise-validation";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";
import { writeAudit } from "@/lib/enterprise";

const schema = z.object({
  entity: z.enum(["lead", "order", "task"]),
  ids: z.array(z.number().int().positive()).min(1).max(500),
  action: z.enum(["status", "assign_to_me"]),
  value: z.string().trim().max(120).optional(),
});

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  try {
    const parsed = schema.safeParse(await readJsonBody(request, 32 * 1024));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Ungültige Bulk-Aktion." }, { status: 422 });
    const { entity, ids, action, value } = parsed.data;
    const changed = await db.transaction(async (tx) => {
      if (entity === "lead") {
        if (action === "assign_to_me") {
          const rows = await tx.update(leads).set({ assignedEmployeeId: user.id, updatedAt: new Date() })
            .where(and(inArray(leads.id, ids), leadAccessCondition(user))).returning({ id: leads.id });
          await writeAudit(tx, user.id, "lead.bulk_assign", "lead", null, undefined, { ids: rows.map((r) => r.id), assignedEmployeeId: user.id });
          return rows.length;
        }
        const allowed = ["neu","kontaktiert","termin_bestaetigt","in_beratung","abgeschlossen","verloren"];
        if (!value || !allowed.includes(value)) throw new Error("Ungültiger Lead-Status.");
        const rows = await tx.update(leads).set({ status: value as typeof leads.status.enumValues[number], updatedAt: new Date() })
          .where(and(inArray(leads.id, ids), leadAccessCondition(user))).returning({ id: leads.id });
        await writeAudit(tx, user.id, "lead.bulk_status", "lead", null, undefined, { ids: rows.map((r) => r.id), status: value });
        return rows.length;
      }
      if (entity === "order") {
        if (action !== "status" || !value || !orderUpdateSchema.shape.status.safeParse(value).success) throw new Error("Ungültiger Auftragsstatus.");
        const condition = user.role === "admin" ? inArray(orders.id, ids) : and(inArray(orders.id, ids), eq(orders.advisorEmployeeId, user.id));
        const rows = await tx.update(orders).set({ status: value, updatedAt: new Date() }).where(condition).returning({ id: orders.id });
        await writeAudit(tx, user.id, "order.bulk_status", "order", null, undefined, { ids: rows.map((r) => r.id), status: value });
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
