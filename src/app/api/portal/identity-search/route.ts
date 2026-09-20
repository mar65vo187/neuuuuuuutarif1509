import { NextResponse, type NextRequest } from "next/server";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { customers } from "@/db/enterprise-schema";
import { getCurrentUser } from "@/lib/auth";
import { leadAccessCondition } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizedPhone(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function normalizedText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("de-DE");
}

function matchReason(q: string, email: string | null, phone: string | null, name: string) {
  const query = normalizedText(q);
  const queryPhone = normalizedPhone(q);
  if (email && normalizedText(email) === query) return "E-Mail exakt";
  if (queryPhone.length >= 7 && normalizedPhone(phone) === queryPhone) return "Telefon exakt";
  if (normalizedText(name) === query) return "Name exakt";
  if (email && normalizedText(email).includes(query)) return "E-Mail";
  if (queryPhone.length >= 4 && normalizedPhone(phone).includes(queryPhone)) return "Telefon";
  return "Name";
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ ok: false, error: "Bitte erneut anmelden." }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 120) ?? "";
  if (q.length < 2) {
    return NextResponse.json({
      ok: true,
      scope: user.role === "admin" ? "global" : "own",
      matches: [],
    });
  }

  const phoneDigits = normalizedPhone(q);
  const leadConditions = [
    leadAccessCondition(user),
    or(
      ilike(leads.name, `%${q}%`),
      ilike(leads.email, `%${q}%`),
      ...(phoneDigits.length >= 4
        ? [sql`replace(replace(replace(replace(replace(replace(replace(coalesce(${leads.phone}, ''), ' ', ''), '+', ''), '-', ''), '(', ''), ')', ''), '/', ''), '.', '') like ${`%${phoneDigits}%`}`]
        : [ilike(leads.phone, `%${q}%`)]),
    )!,
  ];

  const customerAccess = user.role === "admin"
    ? sql`true`
    : eq(customers.ownerEmployeeId, user.id);

  const customerConditions = [
    customerAccess,
    sql`${customers.archivedAt} is null`,
    or(
      ilike(customers.companyName, `%${q}%`),
      ilike(customers.firstName, `%${q}%`),
      ilike(customers.lastName, `%${q}%`),
      sql`lower(trim(concat_ws(' ', coalesce(${customers.firstName}, ''), coalesce(${customers.lastName}, '')))) like lower(${`%${q}%`})`,
      ilike(customers.email, `%${q}%`),
      ...(phoneDigits.length >= 4
        ? [sql`replace(replace(replace(replace(replace(replace(replace(coalesce(${customers.phone}, ''), ' ', ''), '+', ''), '-', ''), '(', ''), ')', ''), '/', ''), '.', '') like ${`%${phoneDigits}%`}`]
        : [ilike(customers.phone, `%${q}%`)]),
    )!,
  ];

  const [leadRows, customerRows] = await Promise.all([
    db.select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      status: leads.status,
      createdAt: leads.createdAt,
      ownerName: sql<string | null>`(
        select e.name from employees e
        where e.id = coalesce(${leads.createdByEmployeeId}, ${leads.assignedEmployeeId})
        limit 1
      )`,
      teamNames: sql<string[]>`coalesce((
        select array_agg(distinct t.name order by t.name)
        from team_members tm
        join teams t on t.id = tm.team_id
        where tm.employee_id = coalesce(${leads.createdByEmployeeId}, ${leads.assignedEmployeeId})
          and t.active = true
      ), '{}'::text[])`,
    }).from(leads)
      .where(and(...leadConditions))
      .orderBy(sql`case when lower(${leads.name}) = lower(${q}) then 0 else 1 end`, leads.name)
      .limit(30),
    db.select({
      id: customers.id,
      customerNumber: customers.customerNumber,
      firstName: customers.firstName,
      lastName: customers.lastName,
      companyName: customers.companyName,
      email: customers.email,
      phone: customers.phone,
      createdAt: customers.createdAt,
      ownerName: sql<string | null>`(
        select e.name from employees e
        where e.id = ${customers.ownerEmployeeId}
        limit 1
      )`,
      teamNames: sql<string[]>`coalesce((
        select array_agg(distinct t.name order by t.name)
        from team_members tm
        join teams t on t.id = tm.team_id
        where tm.employee_id = ${customers.ownerEmployeeId}
          and t.active = true
      ), '{}'::text[])`,
    }).from(customers)
      .where(and(...customerConditions))
      .orderBy(sql`case when lower(coalesce(${customers.companyName}, trim(concat_ws(' ', ${customers.firstName}, ${customers.lastName})))) = lower(${q}) then 0 else 1 end`, customers.companyName, customers.lastName)
      .limit(30),
  ]);

  const matches = [
    ...leadRows.map((row) => {
      const displayName = row.name || row.email || row.phone || `Lead #${row.id}`;
      return {
        entity: "lead" as const,
        id: row.id,
        label: displayName,
        subtitle: [row.email || null, row.phone || null, row.status].filter(Boolean).join(" · "),
        ownerName: row.ownerName,
        teamNames: row.teamNames ?? [],
        href: `/portal/leads/${row.id}`,
        reason: matchReason(q, row.email || null, row.phone, displayName),
        strongDuplicate: Boolean(
          (row.email && normalizedText(row.email) === normalizedText(q))
          || (phoneDigits.length >= 7 && normalizedPhone(row.phone) === phoneDigits)
        ),
        createdAt: row.createdAt.toISOString(),
      };
    }),
    ...customerRows.map((row) => {
      const displayName = row.companyName
        || [row.firstName, row.lastName].filter(Boolean).join(" ")
        || row.customerNumber;
      return {
        entity: "customer" as const,
        id: row.id,
        label: displayName,
        subtitle: [row.customerNumber, row.email || null, row.phone || null].filter(Boolean).join(" · "),
        ownerName: row.ownerName,
        teamNames: row.teamNames ?? [],
        href: `/portal/kunden/${row.id}`,
        reason: matchReason(q, row.email, row.phone, displayName),
        strongDuplicate: Boolean(
          (row.email && normalizedText(row.email) === normalizedText(q))
          || (phoneDigits.length >= 7 && normalizedPhone(row.phone) === phoneDigits)
        ),
        createdAt: row.createdAt.toISOString(),
      };
    }),
  ].sort((a, b) => Number(b.strongDuplicate) - Number(a.strongDuplicate)
    || a.label.localeCompare(b.label, "de"));

  return NextResponse.json({
    ok: true,
    scope: user.role === "admin" ? "global" : "own",
    matches: matches.slice(0, 50),
  });
}
