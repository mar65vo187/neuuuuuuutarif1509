import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";

/**
 * DSGVO Art. 15 – Auskunft: collects every stored record that belongs to one
 * customer, including the leads the customer originated from.
 *
 * All statements are anchored on a single integer parameter (the customer id);
 * table and column names are fixed literals, never user input. Binary file
 * contents are left out (only their metadata is exported); the files
 * themselves can be handed over separately on request.
 */

type Relation = { key: string; query: (customerId: number) => SQL };

const leadSet = (c: number) => sql`(
  select created_from_lead_id from customers where id = ${c} and created_from_lead_id is not null
  union select lead_id from customer_lead_links where customer_id = ${c}
  union select lead_id from orders where customer_id = ${c} and lead_id is not null
  union select referred_lead_id from customer_referrals where referred_customer_id = ${c} and referred_lead_id is not null
)`;
const orderSet = (c: number) => sql`(select id from orders where customer_id = ${c})`;
const caseSet = (c: number) => sql`(select id from service_cases where customer_id = ${c})`;

const polymorphic = (c: number) => sql`(entity_type = 'customer' and entity_id = ${c})
  or (entity_type = 'lead' and entity_id in ${leadSet(c)})
  or (entity_type = 'order' and entity_id in ${orderSet(c)})
  or (entity_type = 'service_case' and entity_id in ${caseSet(c)})`;

export const PRIVACY_EXPORT_RELATIONS: Relation[] = [
  { key: "customer", query: (c) => sql`select to_jsonb(t) as row from customers t where t.id = ${c}` },
  { key: "crm_profile", query: (c) => sql`select to_jsonb(t) as row from customer_crm_profiles t where t.customer_id = ${c}` },
  { key: "consents", query: (c) => sql`select to_jsonb(t) as row from customer_consents t where t.customer_id = ${c} order by t.recorded_at, t.id` },
  { key: "activities", query: (c) => sql`select to_jsonb(t) as row from customer_activities t where t.customer_id = ${c} order by t.id` },
  { key: "opportunities", query: (c) => sql`select to_jsonb(t) as row from customer_opportunities t where t.customer_id = ${c} order by t.id` },
  { key: "orders", query: (c) => sql`select to_jsonb(t) as row from orders t where t.customer_id = ${c} order by t.id` },
  { key: "order_status_history", query: (c) => sql`select to_jsonb(t) as row from order_status_history t where t.order_id in ${orderSet(c)} order by t.id` },
  { key: "service_cases", query: (c) => sql`select to_jsonb(t) as row from service_cases t where t.customer_id = ${c} order by t.id` },
  { key: "service_case_events", query: (c) => sql`select to_jsonb(t) as row from service_case_events t where t.service_case_id in ${caseSet(c)} order by t.id` },
  { key: "referrals_given_or_received", query: (c) => sql`select to_jsonb(t) as row from customer_referrals t where t.source_customer_id = ${c} or t.referred_customer_id = ${c} order by t.id` },
  { key: "leads", query: (c) => sql`select to_jsonb(t) as row from leads t where t.id in ${leadSet(c)} order by t.id` },
  { key: "lead_notes", query: (c) => sql`select to_jsonb(t) as row from lead_notes t where t.lead_id in ${leadSet(c)} order by t.id` },
  { key: "lead_calls", query: (c) => sql`select to_jsonb(t) as row from lead_call_activities t where t.lead_id in ${leadSet(c)} order by t.id` },
  { key: "lead_products", query: (c) => sql`select to_jsonb(t) as row from lead_product_links t where t.lead_id in ${leadSet(c)}` },
  { key: "optimization_memberships", query: (c) => sql`select to_jsonb(t) as row from optimization_memberships t where t.customer_id = ${c} order by t.id` },
  { key: "optimization_goals", query: (c) => sql`select to_jsonb(t) as row from optimization_goals t where t.customer_id = ${c} order by t.id` },
  { key: "optimization_contracts", query: (c) => sql`select to_jsonb(t) as row from optimization_contracts t where t.customer_id = ${c} order by t.id` },
  { key: "optimization_offers", query: (c) => sql`select to_jsonb(t) as row from optimization_offers t where t.customer_id = ${c} order by t.id` },
  { key: "optimization_documents", query: (c) => sql`select to_jsonb(t) - 'data' as row from optimization_documents t where t.customer_id = ${c} order by t.id` },
  { key: "tasks", query: (c) => sql`select to_jsonb(t) as row from tasks t where ${polymorphic(c)} order by t.id` },
  { key: "documents", query: (c) => sql`select to_jsonb(t) as row from document_records t where ${polymorphic(c)} order by t.id` },
  { key: "data_requests", query: (c) => sql`select to_jsonb(t) as row from data_requests t where t.customer_id = ${c} order by t.id` },
];

export type PrivacyExport = {
  format: "tarifwerk-dsgvo-auskunft/1";
  generatedAt: string;
  customerId: number;
  note: string;
  data: Record<string, unknown[]>;
};

type Executor = { execute: (query: SQL) => Promise<{ rows: unknown[] }> };

export async function buildCustomerPrivacyExport(customerId: number, executor: Executor = db as unknown as Executor): Promise<PrivacyExport | null> {
  if (!Number.isSafeInteger(customerId) || customerId <= 0) return null;
  const data: Record<string, unknown[]> = {};
  for (const relation of PRIVACY_EXPORT_RELATIONS) {
    const result = await executor.execute(relation.query(customerId));
    data[relation.key] = result.rows.map((entry) => (entry as { row: unknown }).row);
  }
  if (data.customer.length === 0) return null;
  return {
    format: "tarifwerk-dsgvo-auskunft/1",
    generatedAt: new Date().toISOString(),
    customerId,
    note: "Auskunft nach Art. 15 DSGVO. Hochgeladene Dateien sind nur mit ihren Metadaten enthalten und werden auf Wunsch separat übergeben.",
    data,
  };
}
