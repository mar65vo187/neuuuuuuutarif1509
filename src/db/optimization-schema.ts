import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  bigserial,
  text,
  timestamp,
  uniqueIndex,
  date,
} from "drizzle-orm/pg-core";
import { employees } from "./schema";
import { customers, products, providers } from "./enterprise-schema";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() { return "bytea"; },
});

export const optimizationSubscriptions = pgTable("optimization_subscriptions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  ownerEmployeeId: integer("owner_employee_id").references(() => employees.id, { onDelete: "set null" }),
  publicToken: text("public_token").notNull().unique(),
  planCode: text("plan_code").notNull().default("optimierung_plus"),
  priceCents: integer("price_cents").notNull().default(199),
  currency: text("currency").notNull().default("EUR"),
  billingProvider: text("billing_provider").notNull().default("manual"),
  billingStatus: text("billing_status").notNull().default("pending"),
  status: text("status").notNull().default("onboarding"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  consentTermsAt: timestamp("consent_terms_at", { withTimezone: true }).notNull(),
  consentPrivacyAt: timestamp("consent_privacy_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("optimization_subscriptions_status_idx").on(table.status, table.billingStatus, table.updatedAt),
  index("optimization_subscriptions_owner_idx").on(table.ownerEmployeeId, table.updatedAt),
  index("optimization_subscriptions_review_idx").on(table.nextReviewAt),
]);

export const optimizationRequests = pgTable("optimization_requests", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").notNull().references(() => optimizationSubscriptions.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  assignedEmployeeId: integer("assigned_employee_id").references(() => employees.id, { onDelete: "set null" }),
  requestType: text("request_type").notNull(),
  status: text("status").notNull().default("new"),
  priority: text("priority").notNull().default("normal"),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  financingWanted: boolean("financing_wanted").notNull().default(false),
  budgetCents: integer("budget_cents"),
  targetDate: date("target_date"),
  reviewDueAt: timestamp("review_due_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("optimization_requests_subscription_idx").on(table.subscriptionId, table.updatedAt),
  index("optimization_requests_work_idx").on(table.status, table.priority, table.reviewDueAt),
  index("optimization_requests_assignee_idx").on(table.assignedEmployeeId, table.status, table.updatedAt),
]);

export const optimizationOffers = pgTable("optimization_offers", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => optimizationRequests.id, { onDelete: "cascade" }),
  providerId: integer("provider_id").references(() => providers.id, { onDelete: "set null" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  rank: integer("rank").notNull(),
  title: text("title").notNull(),
  monthlyCents: integer("monthly_cents"),
  oneTimeCents: integer("one_time_cents"),
  estimatedSavingsCents: integer("estimated_savings_cents"),
  termMonths: integer("term_months"),
  highlights: text("highlights").array().notNull().default([]),
  limitations: text("limitations").notNull().default(""),
  status: text("status").notNull().default("draft"),
  externalReference: text("external_reference"),
  createdByEmployeeId: integer("created_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  decisionAt: timestamp("decision_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("optimization_offers_request_rank_unique").on(table.requestId, table.rank),
  index("optimization_offers_request_idx").on(table.requestId, table.rank),
]);

export const optimizationDocuments = pgTable("optimization_documents", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").notNull().references(() => optimizationSubscriptions.id, { onDelete: "cascade" }),
  requestId: integer("request_id").references(() => optimizationRequests.id, { onDelete: "set null" }),
  category: text("category").notNull().default("contract"),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  digest: text("digest").notNull(),
  data: bytea("data").notNull(),
  source: text("source").notNull().default("customer"),
  uploadedByEmployeeId: integer("uploaded_by_employee_id").references(() => employees.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("optimization_documents_subscription_idx").on(table.subscriptionId, table.createdAt),
  index("optimization_documents_request_idx").on(table.requestId, table.createdAt),
]);

export const optimizationEvents = pgTable("optimization_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  subscriptionId: integer("subscription_id").notNull().references(() => optimizationSubscriptions.id, { onDelete: "cascade" }),
  requestId: integer("request_id").references(() => optimizationRequests.id, { onDelete: "cascade" }),
  actorEmployeeId: integer("actor_employee_id").references(() => employees.id, { onDelete: "set null" }),
  actorType: text("actor_type").notNull().default("system"),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("optimization_events_subscription_idx").on(table.subscriptionId, table.createdAt),
  index("optimization_events_request_idx").on(table.requestId, table.createdAt),
]);

export type OptimizationSubscription = typeof optimizationSubscriptions.$inferSelect;
export type OptimizationRequest = typeof optimizationRequests.$inferSelect;
export type OptimizationOffer = typeof optimizationOffers.$inferSelect;
