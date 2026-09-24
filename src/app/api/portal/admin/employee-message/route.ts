import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { notificationQueue } from "@/db/enterprise-schema";
import { adminFailure, authorizeAdmin, lockAdminMutation, readAdminJson } from "@/lib/admin-server";
import { writeAudit } from "@/lib/enterprise";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const schema = z.object({
  employeeId: z.coerce.number().int().positive(),
  kind: z.enum(["personal_message", "nudge"]),
  subject: z.string().trim().min(2).max(180),
  body: z.string().trim().min(2).max(4000),
  priority: z.enum(["normal", "high", "critical"]).default("normal"),
  requiresAck: z.boolean().default(false),
  actionUrl: z.string().trim().max(500).refine((value) => value === "" || (value.startsWith("/portal/") && !value.startsWith("//")), {
    message: "Aktionslink muss ein interner Portal-Link sein.",
  }).optional().default(""),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;
    const parsed = schema.safeParse(await readAdminJson(request));
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Nachricht ungültig." }, { status: 422 });

    const result = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);
      const [recipient] = await tx.select({ id: employees.id, name: employees.name, active: employees.active })
        .from(employees).where(eq(employees.id, parsed.data.employeeId)).limit(1);
      if (!recipient || !recipient.active) throw new Error("EMPLOYEE_NOT_FOUND");

      const requiresAck = parsed.data.kind === "nudge" ? true : parsed.data.requiresAck;
      const [created] = await tx.insert(notificationQueue).values({
        employeeId: recipient.id,
        senderEmployeeId: admin.id,
        channel: "in_app",
        category: parsed.data.kind,
        priority: parsed.data.priority,
        subject: parsed.data.subject,
        body: parsed.data.body,
        actionUrl: parsed.data.actionUrl || null,
        requiresAck,
        metadata: { senderName: admin.name, recipientName: recipient.name, source: "admin_manual" },
        status: "pending",
      }).returning({ id: notificationQueue.id });

      await writeAudit(tx, admin.id, `employee_message.${parsed.data.kind}.sent`, "employee", recipient.id, undefined, {
        notificationId: created.id,
        priority: parsed.data.priority,
        requiresAck,
      });
      return { id: created.id, recipientName: recipient.name, requiresAck };
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "EMPLOYEE_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Mitarbeiter nicht gefunden." }, { status: 404 });
    }
    return adminFailure(error);
  }
}
