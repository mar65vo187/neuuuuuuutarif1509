import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { customerConsents, dataRequests } from "@/db/enterprise-schema";
import { writeAudit } from "@/lib/enterprise";

export const CONSENT_PURPOSES = ["phone_marketing", "email_marketing", "whatsapp_contact"] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export const CONSENT_PURPOSE_LABELS: Record<ConsentPurpose, string> = {
  phone_marketing: "Telefonische Werbung / Angebote",
  email_marketing: "Werbung per E-Mail",
  whatsapp_contact: "Kontakt per WhatsApp",
};

export const CONSENT_SOURCES = ["written", "online_form", "phone", "in_person", "email"] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];

export const CONSENT_SOURCE_LABELS: Record<ConsentSource, string> = {
  written: "Schriftlich (unterschrieben)",
  online_form: "Online-Formular",
  phone: "Telefonisch",
  in_person: "Persönlich im Gespräch",
  email: "Per E-Mail",
};

export type ConsentState = {
  purpose: ConsentPurpose;
  granted: boolean | null;
  source: string | null;
  recordedAt: string | null;
};

export class PrivacyRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

function databaseErrorCode(error: unknown): string {
  if (typeof error !== "object" || !error) return "";
  const direct = (error as { code?: unknown }).code;
  if (typeof direct === "string") return direct;
  const cause = (error as { cause?: { code?: unknown } }).cause;
  return typeof cause?.code === "string" ? cause.code : "";
}

function databaseErrorMessage(error: unknown): string {
  if (typeof error !== "object" || !error) return "";
  const cause = (error as { cause?: { message?: unknown } }).cause;
  const message = typeof cause?.message === "string" ? cause.message : error instanceof Error ? error.message : "";
  return message.replace(/^tarifwerk_privacy:\s*/, "");
}

/** Latest consent decision per purpose; purposes without an entry are reported as unknown. */
export async function getConsentStates(customerId: number): Promise<ConsentState[]> {
  const rows = await db.select({
    purpose: customerConsents.purpose,
    granted: customerConsents.granted,
    source: customerConsents.source,
    recordedAt: customerConsents.recordedAt,
  }).from(customerConsents)
    .where(eq(customerConsents.customerId, customerId))
    .orderBy(desc(customerConsents.recordedAt), desc(customerConsents.id));

  return CONSENT_PURPOSES.map((purpose) => {
    const latest = rows.find((row) => row.purpose === purpose);
    return {
      purpose,
      granted: latest ? latest.granted : null,
      source: latest?.source ?? null,
      recordedAt: latest ? latest.recordedAt.toISOString() : null,
    };
  });
}

export async function recordConsent(input: {
  customerId: number;
  actorId: number;
  purpose: ConsentPurpose;
  granted: boolean;
  source: ConsentSource;
  note: string;
}) {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(customerConsents).values({
      customerId: input.customerId,
      purpose: input.purpose,
      granted: input.granted,
      source: input.source,
      proof: { note: input.note, recordedVia: "portal" },
      recordedByEmployeeId: input.actorId,
    }).returning({ id: customerConsents.id, recordedAt: customerConsents.recordedAt });
    await writeAudit(tx, input.actorId, input.granted ? "privacy.consent_granted" : "privacy.consent_revoked", "customer", input.customerId, undefined, {
      consentId: row.id,
      purpose: input.purpose,
      source: input.source,
    });
    return row;
  });
}

export async function getErasureBlockers(customerId: number): Promise<string[]> {
  const result = await db.execute(sql`select tarifwerk_customer_erasure_blockers(${customerId}) as reasons`);
  const reasons = (result.rows[0] as { reasons?: unknown } | undefined)?.reasons;
  return Array.isArray(reasons) ? reasons.map(String) : [];
}

export async function isCustomerAnonymized(customerId: number): Promise<boolean> {
  const result = await db.execute(sql`select coalesce(metadata->>'anonymizedAt', '') <> '' as anonymized from customers where id = ${customerId}`);
  return Boolean((result.rows[0] as { anonymized?: unknown } | undefined)?.anonymized);
}

/**
 * DSGVO Art. 17: anonymises the customer and every record that only belongs to
 * them in one transaction (see migration 0026). Orders, commissions and the
 * financial journal stay for statutory retention.
 */
export async function anonymizeCustomer(customerId: number, actorId: number, reason: string) {
  try {
    return await db.transaction(async (tx) => {
      const now = new Date();
      const [request] = await tx.insert(dataRequests).values({
        customerId,
        type: "erasure",
        status: "in_progress",
        requestedAt: now,
        handledByEmployeeId: actorId,
        note: reason,
      }).returning({ id: dataRequests.id });

      const result = await tx.execute(sql`select tarifwerk_anonymize_customer(${customerId}) as summary`);
      const summary = ((result.rows[0] as { summary?: unknown } | undefined)?.summary ?? {}) as Record<string, unknown>;

      await tx.update(dataRequests)
        .set({ status: "completed", completedAt: new Date() })
        .where(and(eq(dataRequests.id, request.id), eq(dataRequests.customerId, customerId)));
      await writeAudit(tx, actorId, "privacy.erasure", "customer", customerId, undefined, { dataRequestId: request.id, ...summary });
      return { dataRequestId: request.id, summary };
    });
  } catch (error) {
    const code = databaseErrorCode(error);
    if (code === "P0002") throw new PrivacyRequestError("Kunde nicht gefunden.", 404);
    if (code === "P0003") throw new PrivacyRequestError("Dieser Kunde ist bereits anonymisiert.", 409);
    if (code === "P0004") throw new PrivacyRequestError(`Anonymisierung noch nicht möglich: ${databaseErrorMessage(error)}`, 409);
    throw error;
  }
}

/**
 * DSGVO Art. 17 for a lead that never became a customer. Leads that belong to a
 * customer or an order are erased through the customer record instead.
 */
export async function anonymizeLead(leadId: number, actorId: number, reason: string) {
  return db.transaction(async (tx) => {
    // Serialise concurrent erasures of the same lead before checking its state.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('tarifwerk-lead-erasure'), ${leadId})`);
    const check = await tx.execute(sql`
      select
        exists (select 1 from leads where id = ${leadId}) as found,
        coalesce((select meta->>'anonymizedAt' from leads where id = ${leadId}), '') <> '' as anonymized,
        exists (
          select 1 from customers where created_from_lead_id = ${leadId}
          union all select 1 from customer_lead_links where lead_id = ${leadId}
          union all select 1 from orders where lead_id = ${leadId}
          union all select 1 from customer_referrals where referred_lead_id = ${leadId}
        ) as linked
    `);
    const state = (check.rows[0] ?? {}) as { found?: boolean; anonymized?: boolean; linked?: boolean };
    if (!state.found) throw new PrivacyRequestError("Lead nicht gefunden.", 404);
    if (state.anonymized) throw new PrivacyRequestError("Dieser Lead ist bereits anonymisiert.", 409);
    if (state.linked) throw new PrivacyRequestError("Dieser Lead gehört zu einem Kunden oder Auftrag. Bitte über die Kundenakte anonymisieren.", 409);

    const result = await tx.execute(sql`select tarifwerk_anonymize_leads(array[${leadId}]::integer[]) as count`);
    const count = Number((result.rows[0] as { count?: unknown } | undefined)?.count ?? 0);
    if (count !== 1) throw new PrivacyRequestError("Dieser Lead ist bereits anonymisiert.", 409);
    await writeAudit(tx, actorId, "privacy.erasure", "lead", leadId, undefined, { reason });
    return { leads: count };
  });
}
