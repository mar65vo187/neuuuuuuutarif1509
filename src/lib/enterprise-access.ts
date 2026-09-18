import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { employeeRoleAssignments, permissions, roleDefinitions, rolePermissions } from "@/db/enterprise-schema";
import type { SessionUser } from "@/lib/auth";

const ADVISOR_DEFAULTS = new Set([
  "lead.edit",
  "customer.read",
  "customer.edit",
  "order.read",
  "order.create",
  "order.edit",
  "task.manage",
  "commission.read.self",
]);

export async function permissionKeys(user: SessionUser): Promise<Set<string>> {
  if (user.role === "admin") return new Set(["*"]);
  const result = new Set(ADVISOR_DEFAULTS);
  try {
    const rows = await db
      .select({ key: permissions.key })
      .from(employeeRoleAssignments)
      .innerJoin(roleDefinitions, eq(employeeRoleAssignments.roleId, roleDefinitions.id))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, roleDefinitions.id))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(and(eq(employeeRoleAssignments.employeeId, user.id)));
    for (const row of rows) result.add(row.key);
  } catch {
    // Legacy installations retain the safe advisor baseline until migrations are applied.
  }
  return result;
}

export async function hasPermission(user: SessionUser, key: string) {
  const keys = await permissionKeys(user);
  return keys.has("*") || keys.has(key);
}

export async function requirePermission(user: SessionUser, key: string) {
  if (!await hasPermission(user, key)) {
    const error = new Error("Keine Berechtigung für diese Aktion.");
    Object.assign(error, { status: 403 });
    throw error;
  }
}
