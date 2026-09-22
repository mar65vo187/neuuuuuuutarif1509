import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { savedViews } from "@/db/enterprise-schema";
import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";
import { writeAudit } from "@/lib/enterprise";
import { readJsonBody, RequestBodyError } from "@/lib/request-body";

const areaSchema = z.enum(["leads", "orders", "customers", "tasks"]);

const saveSchema = z.object({
  area: areaSchema,
  name: z.string().trim().min(2).max(80),
  filters: z.record(z.string(), z.string().max(200)).default({}),
  isDefault: z.boolean().default(false),
});

const deleteSchema = z.object({
  id: z.number().int().positive(),
});

function sanitizeFilters(area: "leads" | "orders" | "customers" | "tasks", filters: Record<string, string>) {
  const allowed = area === "leads"
    ? new Set(["status", "type", "priority", "next", "product", "relation", "assignee", "q", "sort"])
    : area === "customers"
      ? new Set(["focus", "q"])
      : area === "tasks"
        ? new Set(["status", "priority", "due", "assignee", "entity", "q"])
        : new Set(["status", "q"]);
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([key, value]) => allowed.has(key) && value.trim())
      .map(([key, value]) => [key, value.trim().slice(0, 200)]),
  );
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  try {
    const parsed = saveSchema.safeParse(await readJsonBody(request, 24 * 1024));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Ansicht konnte nicht gespeichert werden." }, { status: 422 });
    const input = parsed.data;
    const filters = sanitizeFilters(input.area, input.filters);

    const id = await db.transaction(async (tx) => {
      if (input.isDefault) {
        await tx.update(savedViews).set({ isDefault: false })
          .where(and(eq(savedViews.employeeId, user.id), eq(savedViews.area, input.area)));
      }

      const [existing] = await tx.select({ id: savedViews.id }).from(savedViews)
        .where(and(
          eq(savedViews.employeeId, user.id),
          eq(savedViews.area, input.area),
          eq(savedViews.name, input.name),
        )).limit(1);

      if (existing) {
        await tx.update(savedViews).set({ filters, isDefault: input.isDefault }).where(eq(savedViews.id, existing.id));
        await writeAudit(tx, user.id, "saved_view.updated", "saved_view", existing.id, undefined, { area: input.area, name: input.name, filters, isDefault: input.isDefault });
        return existing.id;
      }

      const [created] = await tx.insert(savedViews).values({
        employeeId: user.id,
        area: input.area,
        name: input.name,
        filters,
        isDefault: input.isDefault,
      }).returning({ id: savedViews.id });
      await writeAudit(tx, user.id, "saved_view.created", "saved_view", created.id, undefined, { area: input.area, name: input.name, filters, isDefault: input.isDefault });
      return created.id;
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, error: "Ansicht konnte gerade nicht gespeichert werden." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 403 });
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  try {
    const parsed = deleteSchema.safeParse(await readJsonBody(request, 8 * 1024));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Ungültige Ansicht." }, { status: 422 });

    const deleted = await db.transaction(async (tx) => {
      const rows = await tx.delete(savedViews)
        .where(and(eq(savedViews.id, parsed.data.id), eq(savedViews.employeeId, user.id)))
        .returning({ id: savedViews.id, area: savedViews.area, name: savedViews.name });
      const row = rows[0];
      if (row) await writeAudit(tx, user.id, "saved_view.deleted", "saved_view", row.id, { area: row.area, name: row.name });
      return row;
    });

    if (!deleted) return NextResponse.json({ ok: false, error: "Ansicht nicht gefunden." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    return NextResponse.json({ ok: false, error: "Ansicht konnte gerade nicht gelöscht werden." }, { status: 500 });
  }
}
