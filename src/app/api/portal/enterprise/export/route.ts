import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { commissionEvents, orders } from "@/db/enterprise-schema";
import { getCurrentUser } from "@/lib/auth";
import { listCustomers, listOrders } from "@/lib/enterprise";
import { hasPermission } from "@/lib/enterprise-access";
import { isCompensationOwner } from "@/lib/compensation";
import { createCsvStream } from "@/lib/csv-export";

function csvDownload<T>(
  filename: string,
  header: unknown[],
  pageSize: number,
  fetchPage: (page: number) => Promise<T[]>,
  mapRow: (row: T) => unknown[],
) {
  return new NextResponse(createCsvStream(header, pageSize, fetchPage, mapRow), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  const type = request.nextUrl.searchParams.get("type") ?? "orders";
  const owner = isCompensationOwner(user);

  if (type === "customers") {
    if (!await hasPermission(user, "customer.export") && user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Keine Exportberechtigung." }, { status: 403 });
    }

    const pageSize = 200;
    return csvDownload(
      "tarifwerk-kunden.csv",
      ["Kundennummer", "Typ", "Vorname", "Nachname", "Firma", "E-Mail", "Telefon", "PLZ", "Ort", "Erstellt"],
      pageSize,
      (page) => listCustomers(user, undefined, pageSize, { page }),
      (row) => [
        row.customerNumber,
        row.type,
        row.firstName,
        row.lastName,
        row.companyName,
        row.email,
        row.phone,
        row.postalCode,
        row.city,
        row.createdAt.toISOString(),
      ],
    );
  }

  if (type === "commissions") {
    if (!owner || !await hasPermission(user, "report.finance")) {
      return NextResponse.json({ ok: false, error: "Nur der Owner-Account darf Provider-Provisionen exportieren." }, { status: 403 });
    }

    const pageSize = 500;
    const access = user.role === "admin" ? sql`true` : eq(orders.advisorEmployeeId, user.id);
    const fetchPage = (page: number) => db.select({
      orderNumber: orders.orderNumber,
      type: commissionEvents.type,
      status: commissionEvents.status,
      expected: commissionEvents.expectedAmount,
      confirmed: commissionEvents.confirmedAmount,
      paid: commissionEvents.paidAmount,
      dueDate: commissionEvents.dueDate,
      paidAt: commissionEvents.paidAt,
    }).from(commissionEvents)
      .innerJoin(orders, eq(commissionEvents.orderId, orders.id))
      .where(and(access))
      .orderBy(desc(commissionEvents.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return csvDownload(
      "tarifwerk-provisionen.csv",
      ["Auftrag", "Typ", "Status", "Erwartet", "Bestätigt", "Ausgezahlt", "Fällig", "Ausgezahlt am"],
      pageSize,
      fetchPage,
      (row) => [
        row.orderNumber,
        row.type,
        row.status,
        row.expected,
        row.confirmed,
        row.paid,
        row.dueDate?.toISOString(),
        row.paidAt?.toISOString(),
      ],
    );
  }

  const pageSize = 300;
  const fetchPage = (page: number) => listOrders(user, { page }, pageSize);

  if (owner) {
    return csvDownload(
      "tarifwerk-auftraege.csv",
      ["Auftragsnummer", "Kundennummer", "Kunde", "Provider", "Produkt", "Status", "Providerstatus", "Externe ID", "Provider-Provision", "Erstellt"],
      pageSize,
      fetchPage,
      (row) => [
        row.order.orderNumber,
        row.customer.customerNumber,
        row.customer.companyName || [row.customer.firstName, row.customer.lastName].filter(Boolean).join(" "),
        row.providerName,
        row.productName,
        row.order.status,
        row.order.providerStatus,
        row.order.externalOrderId,
        row.order.expectedCommission,
        row.order.createdAt.toISOString(),
      ],
    );
  }

  return csvDownload(
    "tarifwerk-auftraege.csv",
    ["Auftragsnummer", "Kundennummer", "Kunde", "Provider", "Produkt", "Status", "Providerstatus", "Externe ID", "Erstellt"],
    pageSize,
    fetchPage,
    (row) => [
      row.order.orderNumber,
      row.customer.customerNumber,
      row.customer.companyName || [row.customer.firstName, row.customer.lastName].filter(Boolean).join(" "),
      row.providerName,
      row.productName,
      row.order.status,
      row.order.providerStatus,
      row.order.externalOrderId,
      row.order.createdAt.toISOString(),
    ],
  );
}
