import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { employees, leads } from "@/db/schema";
import { tasks } from "@/db/enterprise-schema";
import { getCurrentUser } from "@/lib/auth";
import { listCustomers, listOrders } from "@/lib/enterprise";
import { leadAccessCondition } from "@/lib/queries";
import { permissionSnapshot, PORTAL_PERMISSION } from "@/lib/enterprise-access";

export const dynamic = "force-dynamic";

type SearchResult = {
  id: string;
  kind: "lead" | "customer" | "order" | "task" | "employee";
  title: string;
  subtitle: string;
  href: string;
};

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 120) ?? "";
  if (q.length < 2) return NextResponse.json({ ok: true, results: [] satisfies SearchResult[] });

  try {
    const capabilities = await permissionSnapshot(user, [
      PORTAL_PERMISSION.LEAD_EDIT,
      PORTAL_PERMISSION.CUSTOMER_READ,
      PORTAL_PERMISSION.CUSTOMER_EDIT,
      PORTAL_PERMISSION.ORDER_READ,
      PORTAL_PERMISSION.ORDER_EDIT,
      PORTAL_PERMISSION.TASK_MANAGE,
    ] as const);
    const canLead = capabilities[PORTAL_PERMISSION.LEAD_EDIT];
    const canCustomer = capabilities[PORTAL_PERMISSION.CUSTOMER_READ] || capabilities[PORTAL_PERMISSION.CUSTOMER_EDIT];
    const canOrder = capabilities[PORTAL_PERMISSION.ORDER_READ] || capabilities[PORTAL_PERMISSION.ORDER_EDIT];
    const canTask = capabilities[PORTAL_PERMISSION.TASK_MANAGE];
    const taskCondition = user.role === "admin" ? sql`true` : eq(tasks.assignedToEmployeeId, user.id);
    const employeePromise = user.role === "admin"
      ? db.select({ id: employees.id, name: employees.name, email: employees.email, role: employees.role })
          .from(employees)
          .where(and(eq(employees.active, true), or(ilike(employees.name, `%${q}%`), ilike(employees.email, `%${q}%`))))
          .orderBy(employees.name)
          .limit(5)
      : Promise.resolve([]);

    const [leadRows, customerRows, orderRows, taskRows, employeeRows] = await Promise.all([
      canLead ? db.select({
        id: leads.id,
        name: leads.name,
        topic: leads.topic,
        status: leads.status,
        email: leads.email,
        phone: leads.phone,
      }).from(leads)
        .where(and(
          leadAccessCondition(user),
          or(
            ilike(leads.name, `%${q}%`),
            ilike(leads.email, `%${q}%`),
            ilike(leads.phone, `%${q}%`),
            ilike(leads.topic, `%${q}%`),
            ilike(leads.region, `%${q}%`),
          ),
        ))
        .orderBy(desc(leads.updatedAt))
        .limit(7) : Promise.resolve([]),
      canCustomer ? listCustomers(user, q, 7) : Promise.resolve([]),
      canOrder ? listOrders(user, { search: q }, 7) : Promise.resolve([]),
      canTask ? db.select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        priority: tasks.priority,
        status: tasks.status,
        entityType: tasks.entityType,
        entityId: tasks.entityId,
      }).from(tasks)
        .where(and(
          taskCondition,
          or(ilike(tasks.title, `%${q}%`), ilike(tasks.description, `%${q}%`)),
        ))
        .orderBy(desc(tasks.updatedAt))
        .limit(6) : Promise.resolve([]),
      employeePromise,
    ]);

    const results: SearchResult[] = [
      ...leadRows.map((row) => ({
        id: `lead-${row.id}`,
        kind: "lead" as const,
        title: row.name,
        subtitle: [row.topic ?? "Anfrage", row.status, row.email || row.phone].filter(Boolean).join(" · "),
        href: `/portal/leads/${row.id}`,
      })),
      ...customerRows.map((row) => ({
        id: `customer-${row.id}`,
        kind: "customer" as const,
        title: row.companyName || [row.firstName, row.lastName].filter(Boolean).join(" ") || row.customerNumber,
        subtitle: [row.customerNumber, row.city, row.email || row.phone].filter(Boolean).join(" · "),
        href: `/portal/kunden/${row.id}`,
      })),
      ...orderRows.map((row) => ({
        id: `order-${row.order.id}`,
        kind: "order" as const,
        title: row.order.orderNumber,
        subtitle: [row.customer.companyName || [row.customer.firstName, row.customer.lastName].filter(Boolean).join(" "), row.providerName, row.order.status].filter(Boolean).join(" · "),
        href: `/portal/auftraege/${row.order.id}`,
      })),
      ...taskRows.map((row) => ({
        id: `task-${row.id}`,
        kind: "task" as const,
        title: row.title,
        subtitle: [row.priority, row.status, row.description].filter(Boolean).join(" · "),
        href: row.entityType === "order" && canOrder
          ? `/portal/auftraege/${row.entityId}`
          : row.entityType === "customer" && canCustomer
            ? `/portal/kunden/${row.entityId}`
            : row.entityType === "lead" && canLead
              ? `/portal/leads/${row.entityId}`
              : "/portal/aufgaben",
      })),
      ...employeeRows.map((row) => ({
        id: `employee-${row.id}`,
        kind: "employee" as const,
        title: row.name,
        subtitle: `${row.role === "admin" ? "Administrator" : "Mitarbeiter"} · ${row.email}`,
        href: "/portal/verwaltung",
      })),
    ];

    return NextResponse.json({ ok: true, results: results.slice(0, 30) });
  } catch {
    return NextResponse.json({ ok: false, error: "Suche momentan nicht verfügbar." }, { status: 500 });
  }
}
