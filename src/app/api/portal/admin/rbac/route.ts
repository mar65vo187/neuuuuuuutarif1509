import { NextResponse, type NextRequest } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { employeeRoleAssignments, roleDefinitions } from "@/db/enterprise-schema";
import { AdminRequestError, adminFailure, authorizeAdmin, lockAdminMutation, readAdminJson } from "@/lib/admin-server";
import { writeAudit } from "@/lib/enterprise";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const roleKey = z.string().trim().min(2).max(80).regex(/^[a-z0-9_]+$/);
const updateSchema = z.object({
  employeeId: z.number().int().positive(),
  roleKeys: z.array(roleKey).min(1).max(10),
}).strict();

export async function PATCH(request: NextRequest) {
  try {
    const admin = await authorizeAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const parsed = updateSchema.safeParse(await readAdminJson(request));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Bitte mindestens eine gültige Enterprise-Rolle auswählen." }, { status: 422 });
    }
    const input = parsed.data;

    const result = await db.transaction(async (tx) => {
      await lockAdminMutation(tx, admin.id);

      const [target] = await tx.select({
        id: employees.id,
        name: employees.name,
        role: employees.role,
        active: employees.active,
      }).from(employees).where(eq(employees.id, input.employeeId)).limit(1).for("update");

      if (!target) throw new AdminRequestError("Mitarbeiter nicht gefunden.", 404);
      if (target.role === "admin") {
        throw new AdminRequestError("Administratoren besitzen bereits vollständigen Systemzugriff. Enterprise-Rollen werden nur für Nicht-Admins verwaltet.", 422);
      }

      const uniqueKeys = [...new Set(input.roleKeys)];
      if (uniqueKeys.includes("super_admin")) {
        throw new AdminRequestError("Die Enterprise-Rolle Super Admin kann nicht an einen normalen Mitarbeiterzugang vergeben werden.", 422);
      }

      const selectedRoles = await tx.select({
        id: roleDefinitions.id,
        key: roleDefinitions.key,
      }).from(roleDefinitions).where(inArray(roleDefinitions.key, uniqueKeys));

      if (selectedRoles.length !== uniqueKeys.length) {
        throw new AdminRequestError("Mindestens eine ausgewählte Rolle existiert nicht mehr.", 422);
      }

      const previousRows = await tx.select({
        roleId: employeeRoleAssignments.roleId,
        roleKey: roleDefinitions.key,
      }).from(employeeRoleAssignments)
        .innerJoin(roleDefinitions, eq(employeeRoleAssignments.roleId, roleDefinitions.id))
        .where(eq(employeeRoleAssignments.employeeId, target.id));

      await tx.delete(employeeRoleAssignments).where(eq(employeeRoleAssignments.employeeId, target.id));
      await tx.insert(employeeRoleAssignments).values(
        selectedRoles.map((role) => ({ employeeId: target.id, roleId: role.id })),
      );

      await writeAudit(tx, admin.id, "employee.roles.updated", "employee", target.id, {
        roleKeys: previousRows.map((row) => row.roleKey),
      }, {
        roleKeys: selectedRoles.map((role) => role.key),
      });

      return {
        employeeId: target.id,
        roleKeys: selectedRoles.map((role) => role.key).sort(),
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return adminFailure(error);
  }
}
