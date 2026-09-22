import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { employeeRoleAssignments, permissions, roleDefinitions, rolePermissions } from "@/db/enterprise-schema";
import type { SessionUser } from "@/lib/auth";

export const PORTAL_PERMISSION = {
  LEAD_EDIT: "lead.edit",
  LEAD_ASSIGN: "lead.assign",
  CUSTOMER_READ: "customer.read",
  CUSTOMER_EDIT: "customer.edit",
  CUSTOMER_EXPORT: "customer.export",
  ORDER_READ: "order.read",
  ORDER_CREATE: "order.create",
  ORDER_EDIT: "order.edit",
  ORDER_CANCEL: "order.cancel",
  TASK_MANAGE: "task.manage",
  COMMISSION_READ_SELF: "commission.read.self",
  COMMISSION_READ_TEAM: "commission.read.team",
  COMMISSION_READ_ALL: "commission.read.all",
  COMMISSION_ADJUST: "commission.adjust",
  REPORT_SALES: "report.sales",
  REPORT_FINANCE: "report.finance",
  EMPLOYEE_MANAGE: "employee.manage",
  AUDIT_READ: "audit.read",
  AUTOMATION_MANAGE: "automation.manage",
  INTEGRATION_MANAGE: "integration.manage",
  PRIVACY_MANAGE: "privacy.manage",
} as const;

export type PortalPermission = (typeof PORTAL_PERMISSION)[keyof typeof PORTAL_PERMISSION];

const LEGACY_ADVISOR_DEFAULTS = new Set<PortalPermission>([
  PORTAL_PERMISSION.LEAD_EDIT,
  PORTAL_PERMISSION.CUSTOMER_READ,
  PORTAL_PERMISSION.CUSTOMER_EDIT,
  PORTAL_PERMISSION.ORDER_READ,
  PORTAL_PERMISSION.ORDER_CREATE,
  PORTAL_PERMISSION.ORDER_EDIT,
  PORTAL_PERMISSION.TASK_MANAGE,
  PORTAL_PERMISSION.COMMISSION_READ_SELF,
]);

/**
 * Resolve the effective permission set.
 *
 * Important invariant:
 * - Admin sessions keep full access.
 * - Once an employee has at least one enterprise role assignment, ONLY the
 *   permissions granted by those roles apply. This makes restrictive roles
 *   such as read_only actually restrictive.
 * - The legacy advisor baseline exists only for employees that have no role
 *   assignment yet, so older installations remain usable during rollout.
 */
export async function listEnterpriseRoleState() {
  const [roles, grants, assignments] = await Promise.all([
    db.select({
      id: roleDefinitions.id,
      key: roleDefinitions.key,
      name: roleDefinitions.name,
      description: roleDefinitions.description,
      system: roleDefinitions.system,
    }).from(roleDefinitions).orderBy(roleDefinitions.name),
    db.select({
      roleId: rolePermissions.roleId,
      permissionKey: permissions.key,
      permissionDescription: permissions.description,
    }).from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id)),
    db.select({
      employeeId: employeeRoleAssignments.employeeId,
      roleId: employeeRoleAssignments.roleId,
    }).from(employeeRoleAssignments),
  ]);

  return {
    roles: roles.map((role) => ({
      ...role,
      permissions: grants
        .filter((grant) => grant.roleId === role.id)
        .map((grant) => ({
          key: grant.permissionKey,
          description: grant.permissionDescription ?? grant.permissionKey,
        }))
        .sort((a, b) => a.key.localeCompare(b.key)),
    })),
    assignments,
  };
}

export async function permissionKeys(user: SessionUser): Promise<Set<string>> {
  if (user.role === "admin") return new Set(["*"]);

  try {
    const assignments = await db
      .select({ id: employeeRoleAssignments.id })
      .from(employeeRoleAssignments)
      .where(eq(employeeRoleAssignments.employeeId, user.id))
      .limit(1);

    if (assignments.length === 0) return new Set(LEGACY_ADVISOR_DEFAULTS);

    const rows = await db
      .select({ key: permissions.key })
      .from(employeeRoleAssignments)
      .innerJoin(roleDefinitions, eq(employeeRoleAssignments.roleId, roleDefinitions.id))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, roleDefinitions.id))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(and(eq(employeeRoleAssignments.employeeId, user.id)));

    return new Set(rows.map((row) => row.key));
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : typeof error === "object" && error && "cause" in error && (error as { cause?: { code?: unknown } }).cause?.code
        ? String((error as { cause?: { code?: unknown } }).cause?.code ?? "")
        : "";
    if (code === "42P01") return new Set(LEGACY_ADVISOR_DEFAULTS);
    return new Set();
  }
}

function assignableForPermissionCondition(permissionKey: PortalPermission) {
  const legacyAllowed = LEGACY_ADVISOR_DEFAULTS.has(permissionKey);
  return or(
    eq(employees.role, "admin"),
    legacyAllowed
      ? sql`not exists (
          select 1 from employee_role_assignments era
          where era.employee_id = ${employees.id}
        )`
      : sql`false`,
    sql`exists (
      select 1
      from employee_role_assignments era
      join role_permissions rp on rp.role_id = era.role_id
      join permissions p on p.id = rp.permission_id
      where era.employee_id = ${employees.id}
        and p.key = ${permissionKey}
    )`,
  )!;
}

async function listAssignableEmployees(permissionKey: PortalPermission) {
  try {
    return await db.select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(and(eq(employees.active, true), assignableForPermissionCondition(permissionKey)))
      .orderBy(employees.name);
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : typeof error === "object" && error && "cause" in error && (error as { cause?: { code?: unknown } }).cause?.code
        ? String((error as { cause?: { code?: unknown } }).cause?.code ?? "")
        : "";
    if (code !== "42P01") throw error;
    if (!LEGACY_ADVISOR_DEFAULTS.has(permissionKey)) {
      return db.select({ id: employees.id, name: employees.name })
        .from(employees)
        .where(and(eq(employees.active, true), eq(employees.role, "admin")))
        .orderBy(employees.name);
    }
    return db.select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(eq(employees.active, true))
      .orderBy(employees.name);
  }
}

async function getAssignableEmployee(employeeId: number, permissionKey: PortalPermission) {
  if (!Number.isSafeInteger(employeeId) || employeeId < 1) return null;
  try {
    const [row] = await db.select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(and(
        eq(employees.id, employeeId),
        eq(employees.active, true),
        assignableForPermissionCondition(permissionKey),
      ))
      .limit(1);
    return row ?? null;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : typeof error === "object" && error && "cause" in error && (error as { cause?: { code?: unknown } }).cause?.code
        ? String((error as { cause?: { code?: unknown } }).cause?.code ?? "")
        : "";
    if (code !== "42P01") throw error;
    if (!LEGACY_ADVISOR_DEFAULTS.has(permissionKey)) {
      const [row] = await db.select({ id: employees.id, name: employees.name })
        .from(employees)
        .where(and(eq(employees.id, employeeId), eq(employees.active, true), eq(employees.role, "admin")))
        .limit(1);
      return row ?? null;
    }
    const [row] = await db.select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(and(eq(employees.id, employeeId), eq(employees.active, true)))
      .limit(1);
    return row ?? null;
  }
}

export function listTaskAssignableEmployees() {
  return listAssignableEmployees(PORTAL_PERMISSION.TASK_MANAGE);
}

export function getTaskAssignableEmployee(employeeId: number) {
  return getAssignableEmployee(employeeId, PORTAL_PERMISSION.TASK_MANAGE);
}

export function leadAssignableEmployeeCondition() {
  return assignableForPermissionCondition(PORTAL_PERMISSION.LEAD_EDIT);
}

export function listLeadAssignableEmployees() {
  return listAssignableEmployees(PORTAL_PERMISSION.LEAD_EDIT);
}

export function getLeadAssignableEmployee(employeeId: number) {
  return getAssignableEmployee(employeeId, PORTAL_PERMISSION.LEAD_EDIT);
}

export async function hasPermission(user: SessionUser, key: PortalPermission | string) {
  const keys = await permissionKeys(user);
  return keys.has("*") || keys.has(key);
}

export async function permissionSnapshot<K extends string>(
  user: SessionUser,
  keys: readonly K[],
): Promise<Record<K, boolean>> {
  const effective = await permissionKeys(user);
  return Object.fromEntries(keys.map((key) => [key, effective.has("*") || effective.has(key)])) as Record<K, boolean>;
}

export async function requirePermission(user: SessionUser, key: PortalPermission | string) {
  if (!await hasPermission(user, key)) {
    const error = new Error("Keine Berechtigung für diese Aktion.");
    Object.assign(error, { status: 403 });
    throw error;
  }
}
