import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const positiveId = z.coerce.number().int().positive().max(2147483647);

export const ORDER_STATUSES = [
  "draft",
  "documents_missing",
  "ready_to_submit",
  "submitted",
  "provider_review",
  "accepted",
  "activation_pending",
  "active",
  "rejected",
  "cancelled",
  "storno",
] as const;

export const customerCreateSchema = z.object({
  type: z.enum(["private", "business"]).default("private"),
  firstName: text(120).optional(),
  lastName: text(120).optional(),
  companyName: text(180).optional(),
  email: z.string().trim().toLowerCase().email().max(200).optional().or(z.literal("")),
  phone: text(40).optional(),
  city: text(120).optional(),
  postalCode: text(20).optional(),
  preferredChannel: text(40).optional(),
  referredByCustomerId: positiveId.optional(),
  referralRelationship: text(80).optional(),
  referralNote: text(1000).optional(),
}).superRefine((value, ctx) => {
  if (value.type === "business" && !value.companyName) ctx.addIssue({ code: "custom", path: ["companyName"], message: "Firmenname fehlt." });
  if (value.type === "private" && !value.firstName && !value.lastName) ctx.addIssue({ code: "custom", path: ["firstName"], message: "Name fehlt." });
});

export const customerUpdateSchema = z.object({
  firstName: text(120).nullable().optional(),
  lastName: text(120).nullable().optional(),
  companyName: text(180).nullable().optional(),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(200)]).nullable().optional(),
  phone: text(40).nullable().optional(),
  city: text(120).nullable().optional(),
  postalCode: text(20).nullable().optional(),
  preferredChannel: text(40).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, { message: "Keine Änderung angegeben." });

export const customerReferralCreateSchema = z.object({
  name: text(160).optional().default(""),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(200)]).optional().default(""),
  phone: text(40).optional().default(""),
  relationship: text(80).optional().default(""),
  topics: z.array(text(120)).max(12).default([]),
  note: text(1500).optional().default(""),
}).superRefine((value, ctx) => {
  const hasContact = [value.name, value.email, value.phone, value.note, ...value.topics]
    .some((item) => item.trim().length > 0);
  if (!hasContact) ctx.addIssue({
    code: "custom",
    path: ["name"],
    message: "Bitte mindestens Name, Kontaktmöglichkeit, Thema oder eine Notiz eintragen.",
  });
});

export const customerActivityCreateSchema = z.object({
  type: z.enum(["note", "call", "email", "whatsapp", "meeting", "review"]),
  direction: z.enum(["outbound", "inbound", "internal"]).default("outbound"),
  outcome: text(120).optional().default(""),
  note: text(3000).optional().default(""),
  occurredAt: z.string().datetime().optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.type === "note" && !value.note) {
    ctx.addIssue({ code: "custom", path: ["note"], message: "Bitte eine Notiz eintragen." });
  }
});

export const customerOpportunityCreateSchema = z.object({
  productId: positiveId.nullable().optional(),
  topic: text(180).min(2),
  status: z.enum(["open", "qualified", "won", "lost", "later"]).default("open"),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  source: text(80).optional().default("manual"),
  note: text(2000).optional().default(""),
  nextReviewAt: z.string().datetime().nullable().optional(),
});

export const customerOpportunityUpdateSchema = z.object({
  productId: positiveId.nullable().optional(),
  topic: text(180).min(2).optional(),
  status: z.enum(["open", "qualified", "won", "lost", "later"]).optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
  note: text(2000).optional(),
  nextReviewAt: z.string().datetime().nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, { message: "Keine Änderung angegeben." });

export const customerCrmUpdateSchema = z.object({
  lifecycleStage: z.enum(["prospect", "active", "retention", "dormant", "closed"]).optional(),
  relationshipStatus: z.enum(["new", "developing", "established", "at_risk", "inactive"]).optional(),
  riskLevel: z.enum(["low", "normal", "high", "critical"]).optional(),
  nextReviewAt: z.string().datetime().nullable().optional(),
  note: text(3000).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: "Keine Änderung angegeben." });

export const orderCreateSchema = z.object({
  customerId: positiveId.optional(),
  leadId: positiveId.optional(),
  providerId: positiveId,
  productId: positiveId.nullable().optional(),
  externalOrderId: text(160).optional(),
  expectedCommission: z.union([z.string().regex(/^-?\d{1,9}([.,]\d{1,2})?$/), z.number().finite().min(-999999999).max(999999999)]).nullable().optional(),
  note: text(2000).optional(),
}).refine((value) => Boolean(value.customerId || value.leadId), { message: "Kunde oder Lead fehlt." });

export const orderUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  providerStatus: text(160).nullable().optional(),
  externalOrderId: text(160).nullable().optional(),
  cancellationReason: text(1000).nullable().optional(),
  note: text(2000).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: "Keine Änderung angegeben." });

export const taskUpdateSchema = z.object({
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: "Keine Änderung angegeben." });

export const catalogCreateSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("provider"),
    name: text(160).min(2),
    category: text(80).min(2),
    externalPartnerId: text(160).optional(),
  }),
  z.object({
    kind: z.literal("product"),
    providerId: positiveId,
    name: text(180).min(2),
    category: text(80).min(2),
    sku: text(120).optional(),
    expectedCommission: z.union([z.string().regex(/^\d{1,9}([.,]\d{1,2})?$/), z.number().finite().min(0).max(999999999)]).optional(),
  }),
]);

export const automationCreateSchema = z.object({
  name: text(180).min(3),
  eventType: text(120).min(3),
  conditions: z.record(z.string(), z.unknown()).default({}),
  actions: z.array(z.record(z.string(), z.unknown())).min(1).max(20),
});
