import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const positiveId = z.coerce.number().int().positive().max(2147483647);
const cents = z.coerce.number().int().min(0).max(1000000000);

export const OPTIMIZATION_REQUEST_TYPES = [
  "goal",
  "contract_review",
  "internet_mobile_tv",
  "energy",
  "insurance",
  "solar_heatpump",
  "property",
  "precious_metals",
  "climate",
  "security",
  "other",
] as const;

export const OPTIMIZATION_REQUEST_STATUSES = [
  "new",
  "qualified",
  "collecting_docs",
  "market_scan",
  "offers_ready",
  "waiting_customer",
  "accepted",
  "implementation",
  "done",
  "paused",
  "canceled",
] as const;

export const optimizationCheckoutSchema = z.object({
  name: text(160).min(2, "Bitte Namen eintragen."),
  email: z.string().trim().toLowerCase().email("Bitte gültige E-Mail eintragen.").max(200),
  phone: text(40).optional().default(""),
  termsAccepted: z.literal(true, { error: "Bitte Vertragsbedingungen bestätigen." }),
  privacyAccepted: z.literal(true, { error: "Bitte Datenschutzhinweise bestätigen." }),
  website: text(200).optional().default(""),
}).strict();

export const optimizationCustomerRequestSchema = z.object({
  requestType: z.enum(OPTIMIZATION_REQUEST_TYPES),
  title: text(180).min(3, "Bitte einen kurzen Titel eintragen."),
  description: text(5000).optional().default(""),
  financingWanted: z.boolean().optional().default(false),
  budgetCents: cents.nullable().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
}).strict();

export const optimizationRequestUpdateSchema = z.object({
  status: z.enum(OPTIMIZATION_REQUEST_STATUSES).optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
  assignedEmployeeId: positiveId.nullable().optional(),
  reviewDueAt: z.string().datetime().nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: "Keine Änderung angegeben." });

export const optimizationOfferUpsertSchema = z.object({
  rank: z.coerce.number().int().min(1).max(3),
  providerId: positiveId.nullable().optional(),
  productId: positiveId.nullable().optional(),
  title: text(180).min(2),
  monthlyCents: cents.nullable().optional(),
  oneTimeCents: cents.nullable().optional(),
  estimatedSavingsCents: cents.nullable().optional(),
  termMonths: z.coerce.number().int().min(0).max(240).nullable().optional(),
  highlights: z.array(text(240).min(1)).max(8).optional().default([]),
  limitations: text(1500).optional().default(""),
  externalReference: text(500).optional().default(""),
  sendNow: z.boolean().optional().default(false),
}).strict();

export const optimizationOfferDecisionSchema = z.object({
  decision: z.enum(["accepted", "rejected"]),
}).strict();

export const optimizationSubscriptionUpdateSchema = z.object({
  status: z.enum(["onboarding", "active", "paused", "canceled"]).optional(),
  billingStatus: z.enum(["pending", "pending_manual", "active", "past_due", "canceled", "checkout_error"]).optional(),
  ownerEmployeeId: positiveId.nullable().optional(),
  nextReviewAt: z.string().datetime().nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: "Keine Änderung angegeben." });
