import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { commissionEvents, orders } from "@/db/enterprise-schema";
import { getCurrentUser } from "@/lib/auth";
import { listCustomers, listOrders } from "@/lib/enterprise";
import { hasPermission } from "@/lib/enterprise-access";
import { isCompensationOwner } from "@/lib/compensation";

function cell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function csv(rows: unknown[][]) {
  return "\uFEFF" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });
  const type = request.nextUrl.searchParams.get("type") ?? "orders";
  const owner = isCompensationOwner(user);
  let body: string;
  let filename: string;

  if (type === "customers") {
    if (!await hasPermission(user, "customer.export") && user.role !== "admin") return NextResponse.json({ ok: false, error: "Keine Exportberechtigung." }, { status: 403 });
    const rows = await listCustomers(user, undefined, 200);
    body = csv([
      ["Kundennummer", "Typ", "Vorname", "Nachname", "Firma", "E-Mail", "Telefon", "PLZ", "Ort", "Erstellt"],
      ...rows.map((r) => [r.customerNumber, r.type, r.firstName, r.lastName, r.companyName, r.email, r.phone, r.postalCode, r.city, r.createdAt.toISOString()]),
    ]);
    filename = "tarifwerk-kunden.csv";
  } else if (type === "commissions") {
    if (!owner || !await hasPermission(user, "report.finance")) return NextResponse.json({ ok: false, error: "Nur der Owner-Account darf Provider-Provisionen exportieren." }, { status: 403 });
    const access = user.role === "admin" ? sql`true` : eq(orders.advisorEmployeeId, user.id);
    const rows = await db.select({
      orderNumber: orders.orderNumber,
      type: commissionEvents.type,
      status: commissionEvents.status,
      expected: commissionEvents.expectedAmount,
      confirmed: commissionEvents.confirmedAmount,
      paid: commissionEvents.paidAmount,
      dueDate: commissionEvents.dueDate,
      paidAt: commissionEvents.paidAt,
    }).from(commissionEvents).innerJoin(orders, eq(commissionEvents.orderId, orders.id))
      .where(and(access)).orderBy(desc(commissionEvents.createdAt)).limit(1000);
    body = csv([
      ["Auftrag", "Typ", "Status", "Erwartet", "Bestätigt", "Ausgezahlt", "Fällig", "Ausgezahlt am"],
      ...rows.map((r) => [r.orderNumber, r.type, r.status, r.expected, r.confirmed, r.paid, r.dueDate?.toISOString(), r.paidAt?.toISOString()]),
    ]);
    filename = "tarifwerk-provisionen.csv";
  } else {
    const rows = await listOrders(user, undefined, 300);
    body = owner ? csv([
      ["Auftragsnummer", "Kundennummer", "Kunde", "Provider", "Produkt", "Status", "Providerstatus", "Externe ID", "Provider-Provision", "Erstellt"],
      ...rows.map((r) => [
        r.order.orderNumber,
        r.customer.customerNumber,
        r.customer.companyName || [r.customer.firstName, r.customer.lastName].filter(Boolean).join(" "),
        r.providerName,
        r.productName,
        r.order.status,
        r.order.providerStatus,
        r.order.externalOrderId,
        r.order.expectedCommission,
        r.order.createdAt.toISOString(),
      ]),
    ]) : csv([
      ["Auftragsnummer", "Kundennummer", "Kunde", "Provider", "Produkt", "Status", "Providerstatus", "Externe ID", "Erstellt"],
      ...rows.map((r) => [
        r.order.orderNumber,
        r.customer.customerNumber,
        r.customer.companyName || [r.customer.firstName, r.customer.lastName].filter(Boolean).join(" "),
        r.providerName,
        r.productName,
        r.order.status,
        r.order.providerStatus,
        r.order.externalOrderId,
        r.order.createdAt.toISOString(),
      ]),
    ]);
    filename = "tarifwerk-auftraege.csv";
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
