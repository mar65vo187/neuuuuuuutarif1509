import { and, eq, or, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { customers, prospectContacts } from "@/db/enterprise-schema";
import type { SessionUser } from "@/lib/auth";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type StrongContactDuplicate = {
  entity: "lead" | "customer" | "contact";
  id: number;
  label: string;
  href: string;
  ownerEmployeeId: number | null;
  visible: boolean;
};

export function normalizeContactEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("de-DE");
}

export function normalizeContactPhone(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 7 ? digits : "";
}

function normalizedPhoneExpression(phoneExpression: SQLWrapper) {
  return sql`replace(replace(replace(replace(replace(replace(replace(coalesce(${phoneExpression}, ''), ' ', ''), '+', ''), '-', ''), '(', ''), ')', ''), '/', ''), '.', '')`;
}

function duplicateConditions(
  emailExpression: SQLWrapper,
  phoneExpression: SQLWrapper,
  email: string,
  phone: string,
) {
  const conditions: SQL[] = [];
  if (email) conditions.push(sql`lower(trim(coalesce(${emailExpression}, ''))) = ${email}`);
  if (phone) conditions.push(sql`${normalizedPhoneExpression(phoneExpression)} = ${phone}`);
  return conditions;
}

export async function lockAndFindStrongContactDuplicate(
  tx: Tx,
  input: { email?: string | null; phone?: string | null },
  user: SessionUser,
  options: { excludeContactId?: number } = {},
): Promise<StrongContactDuplicate | null> {
  const email = normalizeContactEmail(input.email);
  const phone = normalizeContactPhone(input.phone);
  if (!email && !phone) return null;

  const lockKeys = [
    ...(email ? ["contact:email:" + email] : []),
    ...(phone ? ["contact:phone:" + phone] : []),
  ].sort();

  for (const key of lockKeys) {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
  }

  const customerConditions = duplicateConditions(customers.email, customers.phone, email, phone);
  if (customerConditions.length) {
    const [customer] = await tx.select({
      id: customers.id,
      customerNumber: customers.customerNumber,
      companyName: customers.companyName,
      firstName: customers.firstName,
      lastName: customers.lastName,
      ownerEmployeeId: customers.ownerEmployeeId,
    }).from(customers)
      .where(and(
        sql`${customers.archivedAt} is null`,
        or(...customerConditions)!,
      ))
      .limit(1);

    if (customer) {
      const label = customer.companyName
        || [customer.firstName, customer.lastName].filter(Boolean).join(" ")
        || customer.customerNumber;
      return {
        entity: "customer",
        id: customer.id,
        label,
        href: "/portal/kunden/" + customer.id,
        ownerEmployeeId: customer.ownerEmployeeId,
        visible: user.role === "admin" || customer.ownerEmployeeId === user.id,
      };
    }
  }

  const leadConditions = duplicateConditions(leads.email, leads.phone, email, phone);
  if (leadConditions.length) {
    const [lead] = await tx.select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      createdByEmployeeId: leads.createdByEmployeeId,
      assignedEmployeeId: leads.assignedEmployeeId,
    }).from(leads)
      .where(or(...leadConditions)!)
      .limit(1);

    if (lead) {
      const ownerEmployeeId = lead.assignedEmployeeId ?? lead.createdByEmployeeId;
      return {
        entity: "lead",
        id: lead.id,
        label: lead.name || lead.email || lead.phone || "Lead #" + lead.id,
        href: "/portal/leads/" + lead.id,
        ownerEmployeeId,
        visible: user.role === "admin" || lead.createdByEmployeeId === user.id || lead.assignedEmployeeId === user.id,
      };
    }
  }


  const contactConditions = duplicateConditions(prospectContacts.email, prospectContacts.phone, email, phone);
  if (contactConditions.length) {
    const conditions = [or(...contactConditions)!];
    if (options.excludeContactId) conditions.push(sql`${prospectContacts.id} <> ${options.excludeContactId}`);
    const [contact] = await tx.select({
      id: prospectContacts.id,
      name: prospectContacts.name,
      email: prospectContacts.email,
      phone: prospectContacts.phone,
      ownerEmployeeId: prospectContacts.ownerEmployeeId,
      createdByEmployeeId: prospectContacts.createdByEmployeeId,
      status: prospectContacts.status,
    }).from(prospectContacts)
      .where(and(...conditions))
      .limit(1);

    if (contact && contact.status !== "converted" && contact.status !== "archived") {
      const ownerEmployeeId = contact.ownerEmployeeId ?? contact.createdByEmployeeId;
      return {
        entity: "contact",
        id: contact.id,
        label: contact.name || contact.email || contact.phone || "Kontakt #" + contact.id,
        href: "/portal/kontakte?id=" + contact.id,
        ownerEmployeeId,
        visible: user.role === "admin" || ownerEmployeeId === user.id,
      };
    }
  }

  return null;
}

export function contactDuplicateError(duplicate: StrongContactDuplicate) {
  const message = duplicate.visible
    ? `Kontakt existiert bereits als ${duplicate.entity === "lead" ? "Lead" : "Kunde"}: ${duplicate.label}. Bitte den bestehenden Datensatz öffnen statt einen zweiten anzulegen.`
    : "Dieser Kontakt ist bereits im System vorhanden. Bitte keine zweite Akte anlegen; ein Admin kann die bestehende Zuordnung prüfen.";
  return Object.assign(new Error(message), {
    status: 409,
    duplicate: duplicate.visible
      ? {
        entity: duplicate.entity,
        id: duplicate.id,
        label: duplicate.label,
        href: duplicate.href,
      }
      : null,
  });
}
