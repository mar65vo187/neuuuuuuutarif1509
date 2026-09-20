import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { employees, leads } from "./schema";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() { return "bytea"; },
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  customerNumber: text("customer_number").notNull().unique(),
  type: text("type").notNull().default("private"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  companyName: text("company_name"),
  email: text("email"),
  phone: text("phone"),
  mobile: text("mobile"),
  street: text("street"),
  houseNumber: text("house_number"),
  postalCode: text("postal_code"),
  city: text("city"),
  country: text("country").notNull().default("DE"),
  dateOfBirth: text("date_of_birth"),
  preferredChannel: text("preferred_channel"),
  ownerEmployeeId: integer("owner_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdFromLeadId: integer("created_from_lead_id").references(() => leads.id, { onDelete: "set null" }),
  tags: text("tags").array().notNull().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("customers_owner_idx").on(table.ownerEmployeeId),
  index("customers_created_idx").on(table.createdAt),
]);

export const customerReferrals = pgTable("customer_referrals", {
  id: serial("id").primaryKey(),
  sourceCustomerId: integer("source_customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  referredLeadId: integer("referred_lead_id").references(() => leads.id, { onDelete: "set null" }),
  referredCustomerId: integer("referred_customer_id").references(() => customers.id, { onDelete: "set null" }),
  relationship: text("relationship").notNull().default(""),
  note: text("note").notNull().default(""),
  createdByEmployeeId: integer("created_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("customer_referrals_lead_unique").on(table.referredLeadId),
  uniqueIndex("customer_referrals_customer_unique").on(table.referredCustomerId),
  index("customer_referrals_source_idx").on(table.sourceCustomerId, table.createdAt),
  index("customer_referrals_created_by_idx").on(table.createdByEmployeeId, table.createdAt),
]);

export const customerLeadLinks = pgTable("customer_lead_links", {
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("customer_lead_unique").on(table.customerId, table.leadId),
  uniqueIndex("lead_customer_unique").on(table.leadId),
]);

export const customerConsents = pgTable("customer_consents", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(),
  granted: boolean("granted").notNull(),
  source: text("source"),
  proof: jsonb("proof").$type<Record<string, unknown>>(),
  recordedByEmployeeId: integer("recorded_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("customer_consents_customer_idx").on(table.customerId, table.recordedAt)]);

export const customerCrmProfiles = pgTable("customer_crm_profiles", {
  customerId: integer("customer_id").primaryKey().references(() => customers.id, { onDelete: "cascade" }),
  lifecycleStage: text("lifecycle_stage").notNull().default("active"),
  relationshipStatus: text("relationship_status").notNull().default("new"),
  riskLevel: text("risk_level").notNull().default("normal"),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
  lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
  lastContactChannel: text("last_contact_channel"),
  note: text("note").notNull().default(""),
  updatedByEmployeeId: integer("updated_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("customer_crm_review_idx").on(table.nextReviewAt),
]);

export const customerActivities = pgTable("customer_activities", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  direction: text("direction").notNull().default("outbound"),
  outcome: text("outcome").notNull().default(""),
  note: text("note").notNull().default(""),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  nextActionAt: timestamp("next_action_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("customer_activities_customer_idx").on(table.customerId, table.occurredAt),
  index("customer_activities_next_action_idx").on(table.nextActionAt),
]);

export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  externalPartnerId: text("external_partner_id"),
  active: boolean("active").notNull().default(true),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("providers_name_category_unique").on(table.name, table.category)]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providers.id, { onDelete: "restrict" }),
  category: text("category").notNull(),
  name: text("name").notNull(),
  sku: text("sku"),
  active: boolean("active").notNull().default(true),
  expectedCommission: numeric("expected_commission", { precision: 12, scale: 2 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("products_provider_idx").on(table.providerId),
  uniqueIndex("products_provider_name_unique").on(table.providerId, table.name),
]);


export const customerOpportunities = pgTable("customer_opportunities", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  topic: text("topic").notNull(),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("normal"),
  source: text("source").notNull().default("manual"),
  note: text("note").notNull().default(""),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
  createdByEmployeeId: integer("created_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("customer_opportunities_customer_idx").on(table.customerId, table.status, table.updatedAt),
  index("customer_opportunities_review_idx").on(table.nextReviewAt),
]);

export const leadProductLinks = pgTable("lead_product_links", {
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  relation: text("relation").notNull().default("interest"),
  note: text("note").notNull().default(""),
  createdByEmployeeId: integer("created_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("lead_product_relation_unique").on(table.leadId, table.productId, table.relation),
  index("lead_product_lead_idx").on(table.leadId, table.relation),
  index("lead_product_product_idx").on(table.productId, table.relation),
]);

export const providerProfiles = pgTable("provider_profiles", {
  providerId: integer("provider_id").primaryKey().references(() => providers.id, { onDelete: "cascade" }),
  partnerType: text("partner_type").notNull().default("provider"),
  websiteUrl: text("website_url"),
  portalUrl: text("portal_url"),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  supportContact: text("support_contact"),
  billingPath: text("billing_path"),
  regions: text("regions").array().notNull().default([]),
  notes: text("notes").notNull().default(""),
  updatedByEmployeeId: integer("updated_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productCatalogProfiles = pgTable("product_catalog_profiles", {
  productId: integer("product_id").primaryKey().references(() => products.id, { onDelete: "cascade" }),
  audience: text("audience").notNull().default("both"),
  lifecycleStatus: text("lifecycle_status").notNull().default("active"),
  description: text("description").notNull().default(""),
  region: text("region").notNull().default("Deutschland"),
  submissionUrl: text("submission_url"),
  supportContact: text("support_contact"),
  completionProcess: text("completion_process").notNull().default(""),
  marketingChannels: jsonb("marketing_channels").$type<Array<{ channel: string; status: "allowed" | "conditional" | "blocked"; note?: string }>>().notNull().default([]),
  marketingConditions: text("marketing_conditions").notNull().default(""),
  salesArguments: jsonb("sales_arguments").$type<string[]>().notNull().default([]),
  objections: jsonb("objections").$type<Array<{ objection: string; answer: string }>>().notNull().default([]),
  shortPitch: text("short_pitch").notNull().default(""),
  phonePitch: text("phone_pitch").notNull().default(""),
  d2dPitch: text("d2d_pitch").notNull().default(""),
  b2bPitch: text("b2b_pitch").notNull().default(""),
  whatsappTemplate: text("whatsapp_template").notNull().default(""),
  emailTemplate: text("email_template").notNull().default(""),
  socialIdeas: jsonb("social_ideas").$type<string[]>().notNull().default([]),
  checklist: jsonb("checklist").$type<string[]>().notNull().default([]),
  requiredDocuments: jsonb("required_documents").$type<string[]>().notNull().default([]),
  trainingRequired: boolean("training_required").notNull().default(false),
  highlight: text("highlight"),
  updatedByEmployeeId: integer("updated_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("product_catalog_status_idx").on(table.lifecycleStatus, table.updatedAt)]);

export const commissionListVersions = pgTable("commission_list_versions", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providers.id, { onDelete: "restrict" }),
  version: integer("version").notNull(),
  sourceName: text("source_name").notNull(),
  sourceType: text("source_type").notNull().default("manual"),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validTo: timestamp("valid_to", { withTimezone: true }),
  ownerPoolPercent: numeric("owner_pool_percent", { precision: 5, scale: 2 }).notNull().default("15.00"),
  importedByEmployeeId: integer("imported_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("commission_list_provider_version_unique").on(table.providerId, table.version),
  index("commission_list_provider_idx").on(table.providerId, table.createdAt),
]);

export const commissionRateVersions = pgTable("commission_rate_versions", {
  id: serial("id").primaryKey(),
  commissionListVersionId: integer("commission_list_version_id").notNull().references(() => commissionListVersions.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  externalProductId: text("external_product_id"),
  productName: text("product_name").notNull(),
  category: text("category").notNull(),
  grossAmount: numeric("gross_amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("EUR"),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validTo: timestamp("valid_to", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("commission_rate_product_idx").on(table.productId, table.createdAt),
  index("commission_rate_list_idx").on(table.commissionListVersionId),
]);

export const benefitPoolLedger = pgTable("benefit_pool_ledger", {
  id: serial("id").primaryKey(),
  entryType: text("entry_type").notNull(),
  category: text("category").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  note: text("note").notNull().default(""),
  reference: text("reference"),
  sourceKey: text("source_key"),
  createdByEmployeeId: integer("created_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("benefit_pool_ledger_created_idx").on(table.createdAt),
  index("benefit_pool_ledger_category_idx").on(table.category, table.createdAt),
  uniqueIndex("benefit_pool_ledger_source_key_unique").on(table.sourceKey),
]);

export const productUpdates = pgTable("product_updates", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }),
  providerId: integer("provider_id").references(() => providers.id, { onDelete: "cascade" }),
  updateType: text("update_type").notNull().default("info"),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  important: boolean("important").notNull().default(false),
  createdByEmployeeId: integer("created_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("product_updates_created_idx").on(table.createdAt),
  index("product_updates_product_idx").on(table.productId, table.createdAt),
]);

export const productUpdateReads = pgTable("product_update_reads", {
  updateId: integer("update_id").notNull().references(() => productUpdates.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("product_update_reads_unique").on(table.updateId, table.employeeId),
  index("product_update_reads_employee_idx").on(table.employeeId, table.readAt),
]);

export const incentiveCampaigns = pgTable("incentive_campaigns", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  goalType: text("goal_type").notNull().default("orders"),
  goalValue: numeric("goal_value", { precision: 12, scale: 2 }).notNull(),
  rewardType: text("reward_type").notNull().default("bonus"),
  rewardDescription: text("reward_description").notNull(),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  audience: text("audience").notNull().default("all"),
  active: boolean("active").notNull().default(true),
  createdByEmployeeId: integer("created_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("incentive_campaign_active_idx").on(table.active, table.startsAt, table.endsAt)]);

export const trainingModules = pgTable("training_modules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  content: text("content").notNull().default(""),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  required: boolean("required").notNull().default(false),
  validMonths: integer("valid_months"),
  active: boolean("active").notNull().default(true),
  createdByEmployeeId: integer("created_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("training_module_product_idx").on(table.productId, table.active)]);

export const employeeTrainingCompletions = pgTable("employee_training_completions", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").notNull().references(() => trainingModules.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("completed"),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  recordedByEmployeeId: integer("recorded_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  note: text("note").notNull().default(""),
  certificateCode: text("certificate_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("employee_training_module_unique").on(table.moduleId, table.employeeId),
  index("employee_training_employee_idx").on(table.employeeId, table.status, table.expiresAt),
]);

export const employeeBenefits = pgTable("employee_benefits", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  benefitKey: text("benefit_key").notNull(),
  label: text("label").notNull(),
  status: text("status").notNull().default("eligible"),
  details: text("details").notNull().default(""),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validTo: timestamp("valid_to", { withTimezone: true }),
  updatedByEmployeeId: integer("updated_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("employee_benefit_unique").on(table.employeeId, table.benefitKey),
  index("employee_benefit_employee_idx").on(table.employeeId, table.status),
]);

export const internalDocuments = pgTable("internal_documents", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  data: bytea("data").notNull(),
  digest: text("digest").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  version: integer("version").notNull().default(1),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  providerId: integer("provider_id").references(() => providers.id, { onDelete: "set null" }),
  visibility: text("visibility").notNull().default("team"),
  active: boolean("active").notNull().default(true),
  uploadedByEmployeeId: integer("uploaded_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("internal_documents_category_idx").on(table.category, table.active, table.createdAt),
  index("internal_documents_product_idx").on(table.productId, table.active, table.createdAt),
]);

export const reconciliationImports = pgTable("reconciliation_imports", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providers.id, { onDelete: "restrict" }),
  sourceName: text("source_name").notNull(),
  rowCount: integer("row_count").notNull(),
  matchedCount: integer("matched_count").notNull().default(0),
  issueCount: integer("issue_count").notNull().default(0),
  importedByEmployeeId: integer("imported_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("reconciliation_import_provider_idx").on(table.providerId, table.createdAt)]);

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
  providerId: integer("provider_id").notNull().references(() => providers.id, { onDelete: "restrict" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  advisorEmployeeId: integer("advisor_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdByEmployeeId: integer("created_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  status: text("status").notNull().default("draft"),
  providerStatus: text("provider_status"),
  externalOrderId: text("external_order_id"),
  expectedCommission: numeric("expected_commission", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("EUR"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("orders_customer_idx").on(table.customerId),
  index("orders_provider_idx").on(table.providerId),
  index("orders_advisor_idx").on(table.advisorEmployeeId),
  index("orders_status_idx").on(table.status, table.updatedAt),
  index("orders_created_idx").on(table.createdAt),
  uniqueIndex("orders_provider_external_unique").on(table.providerId, table.externalOrderId),
]);

export const orderStatusHistory = pgTable("order_status_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  providerStatus: text("provider_status"),
  note: text("note"),
  actorEmployeeId: integer("actor_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("order_history_order_idx").on(table.orderId, table.createdAt)]);

export const commissionEvents = pgTable("commission_events", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "set null" }),
  type: text("type").notNull().default("sale"),
  status: text("status").notNull().default("expected"),
  expectedAmount: numeric("expected_amount", { precision: 12, scale: 2 }),
  confirmedAmount: numeric("confirmed_amount", { precision: 12, scale: 2 }),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }),
  providerReference: text("provider_reference"),
  period: text("period"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("commission_order_idx").on(table.orderId),
  index("commission_employee_idx").on(table.employeeId),
  index("commission_status_idx").on(table.status, table.dueDate),
]);


export const employeeCompensationProfiles = pgTable("employee_compensation_profiles", {
  employeeId: integer("employee_id").primaryKey().references(() => employees.id, { onDelete: "cascade" }),
  payoutPercent: numeric("payout_percent", { precision: 5, scale: 2 }).notNull().default("82.00"),
  reservePercent: numeric("reserve_percent", { precision: 5, scale: 2 }).notNull().default("8.00"),
  savingsPercent: numeric("savings_percent", { precision: 5, scale: 2 }).notNull().default("0.00"),
  loyaltyStartedAt: timestamp("loyalty_started_at", { withTimezone: true }).notNull().defaultNow(),
  loyaltyVestingYears: integer("loyalty_vesting_years").notNull().default(10),
  teamLevel: text("team_level").notNull().default("berater"),
  note: text("note").notNull().default(""),
  updatedByEmployeeId: integer("updated_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("employee_compensation_updated_idx").on(table.updatedAt)]);

export const compensationHistory = pgTable("compensation_history", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  changedByEmployeeId: integer("changed_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  oldValues: jsonb("old_values").$type<Record<string, unknown>>(),
  newValues: jsonb("new_values").$type<Record<string, unknown>>().notNull(),
  reason: text("reason").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("compensation_history_employee_idx").on(table.employeeId, table.createdAt)]);


export const loyaltyBonusLedger = pgTable("loyalty_bonus_ledger", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  type: text("type").$type<"credit" | "payout" | "correction_debit">().notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  note: text("note").notNull().default(""),
  createdByEmployeeId: integer("created_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("loyalty_bonus_ledger_employee_idx").on(table.employeeId, table.createdAt)]);

export const leadCallActivities = pgTable("lead_call_activities", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "set null" }),
  calledAt: timestamp("called_at", { withTimezone: true }).notNull(),
  reachedPerson: text("reached_person").notNull(),
  reaction: text("reaction").notNull(),
  outcome: text("outcome").notNull(),
  attemptNumber: integer("attempt_number").notNull().default(1),
  note: text("note").notNull().default(""),
  requestedCallbackAt: timestamp("requested_callback_at", { withTimezone: true }),
  suggestedFollowUpAt: timestamp("suggested_follow_up_at", { withTimezone: true }),
  suggestionReason: text("suggestion_reason").notNull().default(""),
  recommendedAction: text("recommended_action").notNull().default("call_again"),
  autoScheduled: boolean("auto_scheduled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("lead_call_activities_lead_idx").on(table.leadId, table.calledAt),
  index("lead_call_activities_employee_idx").on(table.employeeId, table.calledAt),
  index("lead_call_activities_follow_up_idx").on(table.suggestedFollowUpAt),
]);

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  assignedToEmployeeId: integer("assigned_to_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdByEmployeeId: integer("created_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  type: text("type").notNull().default("follow_up"),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("open"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("tasks_assignee_idx").on(table.assignedToEmployeeId, table.status, table.dueAt),
  index("tasks_entity_idx").on(table.entityType, table.entityId),
]);

export const auditEvents = pgTable("audit_events", {
  id: serial("id").primaryKey(),
  actorEmployeeId: integer("actor_employee_id").references(() => employees.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  oldValues: jsonb("old_values").$type<Record<string, unknown>>(),
  newValues: jsonb("new_values").$type<Record<string, unknown>>(),
  requestId: text("request_id"),
  ipHash: text("ip_hash"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("audit_entity_idx").on(table.entityType, table.entityId, table.createdAt),
  index("audit_actor_idx").on(table.actorEmployeeId, table.createdAt),
]);

export const automationRules = pgTable("automation_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  eventType: text("event_type").notNull(),
  active: boolean("active").notNull().default(true),
  conditions: jsonb("conditions").$type<Record<string, unknown>>().notNull().default({}),
  actions: jsonb("actions").$type<Record<string, unknown>[]>().notNull().default([]),
  createdByEmployeeId: integer("created_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const automationRuns = pgTable("automation_runs", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id").references(() => automationRules.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  status: text("status").notNull(),
  detail: jsonb("detail").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
}, (table) => [index("automation_runs_created_idx").on(table.createdAt)]);

export const outboxEvents = pgTable("outbox_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("outbox_pending_idx").on(table.status, table.availableAt)]);

export const notificationQueue = pgTable("notification_queue", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  channel: text("channel").notNull().default("in_app"),
  subject: text("subject"),
  body: text("body").notNull(),
  status: text("status").notNull().default("pending"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("notification_pending_idx").on(table.status, table.scheduledAt)]);

export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  secretHash: text("secret_hash"),
  eventTypes: text("event_types").array().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdByEmployeeId: integer("created_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: serial("id").primaryKey(),
  endpointId: integer("endpoint_id").notNull().references(() => webhookEndpoints.id, { onDelete: "cascade" }),
  outboxEventId: integer("outbox_event_id").references(() => outboxEvents.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending"),
  responseCode: integer("response_code"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("webhook_delivery_pending_idx").on(table.status, table.nextAttemptAt)]);

export const reconciliationIssues = pgTable("reconciliation_issues", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
  providerId: integer("provider_id").references(() => providers.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  status: text("status").notNull().default("open"),
  expectedAmount: numeric("expected_amount", { precision: 12, scale: 2 }),
  reportedAmount: numeric("reported_amount", { precision: 12, scale: 2 }),
  differenceAmount: numeric("difference_amount", { precision: 12, scale: 2 }),
  reference: text("reference"),
  note: text("note"),
  assignedToEmployeeId: integer("assigned_to_employee_id").references(() => employees.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("reconciliation_status_idx").on(table.status, table.createdAt)]);

export const savedViews = pgTable("saved_views", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  area: text("area").notNull(),
  name: text("name").notNull(),
  filters: jsonb("filters").$type<Record<string, unknown>>().notNull().default({}),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("saved_views_employee_name_unique").on(table.employeeId, table.area, table.name)]);

export const dataRequests = pgTable("data_requests", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "restrict" }),
  type: text("type").notNull(),
  status: text("status").notNull().default("open"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  dueAt: timestamp("due_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  handledByEmployeeId: integer("handled_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  note: text("note"),
}, (table) => [index("data_requests_status_idx").on(table.status, table.dueAt)]);

export const documentRecords = pgTable("document_records", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  storageKey: text("storage_key").notNull(),
  digest: text("digest").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  uploadedByEmployeeId: integer("uploaded_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("documents_entity_idx").on(table.entityType, table.entityId, table.createdAt)]);

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  leadEmployeeId: integer("lead_employee_id").references(() => employees.id, { onDelete: "set null" }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("team_member_unique").on(table.teamId, table.employeeId)]);

export const roleDefinitions = pgTable("role_definitions", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  system: boolean("system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  description: text("description"),
});

export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => roleDefinitions.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
}, (table) => [uniqueIndex("role_permission_unique").on(table.roleId, table.permissionId)]);

export const employeeRoleAssignments = pgTable("employee_role_assignments", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  roleId: integer("role_id").notNull().references(() => roleDefinitions.id, { onDelete: "cascade" }),
}, (table) => [uniqueIndex("employee_role_assignment_unique").on(table.employeeId, table.roleId)]);

export const mfaCredentials = pgTable("mfa_credentials", {
  employeeId: integer("employee_id").primaryKey().references(() => employees.id, { onDelete: "cascade" }),
  secretEncrypted: text("secret_encrypted").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  recoveryCodesHash: jsonb("recovery_codes_hash").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  enabledAt: timestamp("enabled_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});

export const portalSessions = pgTable("portal_sessions", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  credentialSignature: text("credential_signature").notNull(),
  mfaVerified: boolean("mfa_verified").notNull().default(false),
  userAgent: text("user_agent"),
  ipHash: text("ip_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => [
  index("portal_sessions_employee_idx").on(table.employeeId, table.revokedAt, table.expiresAt),
  index("portal_sessions_expiry_idx").on(table.expiresAt),
]);

export const portalLoginRateLimits = pgTable("portal_login_rate_limits", {
  keyHash: text("key_hash").primaryKey(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
  requestCount: integer("request_count").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("portal_login_rate_limits_updated_idx").on(table.updatedAt),
]);

export const loginEvents = pgTable("login_events", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id, { onDelete: "set null" }),
  emailHash: text("email_hash").notNull(),
  success: boolean("success").notNull(),
  reason: text("reason"),
  ipHash: text("ip_hash"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("login_events_employee_idx").on(table.employeeId, table.createdAt)]);

export type Customer = typeof customers.$inferSelect;
export type CustomerReferral = typeof customerReferrals.$inferSelect;
export type CustomerCrmProfile = typeof customerCrmProfiles.$inferSelect;
export type CustomerActivity = typeof customerActivities.$inferSelect;
export type CustomerOpportunity = typeof customerOpportunities.$inferSelect;
export type Provider = typeof providers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type CommissionEvent = typeof commissionEvents.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type LeadCallActivity = typeof leadCallActivities.$inferSelect;
