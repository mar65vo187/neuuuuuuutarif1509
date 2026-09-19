import {
  boolean,
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
export type Provider = typeof providers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type CommissionEvent = typeof commissionEvents.$inferSelect;
export type Task = typeof tasks.$inferSelect;
