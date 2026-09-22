import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { tasks } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { getCustomer, getOrder, writeAudit } from "@/lib/enterprise";
import { getTaskAssignableEmployee, requirePermission } from "@/lib/enterprise-access";
import { getLead } from "@/lib/queries";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

const schema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).optional().default(""),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  dueAt: z.string().datetime().nullable().optional(),
  assignedToEmployeeId: z.number().int().positive().optional(),
  entityType: z.enum(["general", "lead", "customer", "order"]).default("general"),
  entityId: z.number().int().nonnegative().default(0),
});

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  try {
    await requirePermission(user, "task.manage");
    const parsed = schema.safeParse(await readJsonBody(request, 32 * 1024));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Aufgabendaten sind unvollständig." }, { status: 422 });
    const input = parsed.data;

    let entityId = input.entityType === "general" ? 0 : input.entityId;
    if (input.entityType !== "general" && entityId < 1) return NextResponse.json({ ok: false, error: "Bitte einen gültigen Bezug angeben." }, { status: 422 });

    if (input.entityType === "lead" && !await getLead(entityId, user)) return NextResponse.json({ ok: false, error: "Lead nicht gefunden oder keine Berechtigung." }, { status: 404 });
    if (input.entityType === "customer" && !await getCustomer(entityId, user)) return NextResponse.json({ ok: false, error: "Kunde nicht gefunden oder keine Berechtigung." }, { status: 404 });
    if (input.entityType === "order" && !await getOrder(entityId, user)) return NextResponse.json({ ok: false, error: "Auftrag nicht gefunden oder keine Berechtigung." }, { status: 404 });

    let assignee = user.id;
    if (user.role === "admin" && input.assignedToEmployeeId) {
      const target = await getTaskAssignableEmployee(input.assignedToEmployeeId);
      if (!target) return NextResponse.json({ ok: false, error: "Mitarbeiter ist nicht aktiv oder hat keinen Zugriff auf Aufgaben." }, { status: 422 });
      assignee = target.id;
    }

    const result = await db.transaction(async (tx) => {
      if (input.entityType !== "general") {
        const [existing] = await tx.select({ id: tasks.id }).from(tasks)
          .where(and(
            eq(tasks.entityType, input.entityType),
            eq(tasks.entityId, entityId),
            eq(tasks.assignedToEmployeeId, assignee),
            eq(tasks.title, input.title),
            inArray(tasks.status, ["open", "in_progress"]),
          ))
          .limit(1);
        if (existing) return { id: existing.id, deduplicated: true };
      }

      const [created] = await tx.insert(tasks).values({
        entityType: input.entityType,
        entityId,
        assignedToEmployeeId: assignee,
        createdByEmployeeId: user.id,
        type: "follow_up",
        title: input.title,
        description: input.description || null,
        priority: input.priority,
        status: "open",
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
      }).returning({ id: tasks.id });

      await writeAudit(tx, user.id, "task.create", "task", String(created.id), undefined, {
        title: input.title,
        priority: input.priority,
        assignedToEmployeeId: assignee,
        entityType: input.entityType,
        entityId,
      });
      return { id: created.id, deduplicated: false };
    });

    return NextResponse.json({ ok: true, ...result }, { status: result.deduplicated ? 200 : 201 });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    const status = typeof error === "object" && error && "status" in error ? Number((error as { status?: unknown }).status) : 500;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Aufgabe konnte nicht erstellt werden." }, { status: Number.isFinite(status) ? status : 500 });
  }
}
