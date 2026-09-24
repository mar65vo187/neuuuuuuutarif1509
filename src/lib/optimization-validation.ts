import { z } from "zod";
import { OPTIMIZATION_CATEGORIES } from "@/lib/optimization-shared";

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();
const customerId = z.number().int().positive();
const cents = z.number().int().min(0).max(2_000_000_000).optional().nullable();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable();

export const optimizationActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("membership"),
    customerId,
    status: z.enum(["pending", "active", "paused", "cancelled"]).default("pending"),
    nextReviewAt: z.string().datetime({ offset: true }).optional().nullable(),
    billingProvider: optionalText(80),
    billingCustomerRef: optionalText(180),
    billingSubscriptionRef: optionalText(180),
  }),
  z.object({
    action: z.literal("goal"),
    customerId,
    category: z.enum(OPTIMIZATION_CATEGORIES),
    title: z.string().trim().min(2).max(180),
    description: z.string().trim().max(3000).optional(),
    priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
    targetDate: dateString,
    budgetCents: cents,
    financingNeeded: z.boolean().default(false),
  }),
  z.object({
    action: z.literal("contract"),
    customerId,
    category: z.enum(OPTIMIZATION_CATEGORIES),
    providerName: z.string().trim().min(1).max(180),
    contractName: z.string().trim().min(1).max(220),
    monthlyCostCents: cents,
    startDate: dateString,
    endDate: dateString,
    noticeDate: dateString,
    status: z.enum(["active", "review_due", "switch_planned", "cancelled", "expired"]).default("active"),
    note: z.string().trim().max(3000).optional(),
  }),
  z.object({
    action: z.literal("offer"),
    customerId,
    goalId: z.number().int().positive().optional().nullable(),
    contractId: z.number().int().positive().optional().nullable(),
    providerName: z.string().trim().min(1).max(180),
    title: z.string().trim().min(1).max(220),
    monthlyCostCents: cents,
    oneTimeCostCents: cents,
    termMonths: z.number().int().min(0).max(600).optional().nullable(),
    position: z.number().int().min(1).max(3).default(1),
    status: z.enum(["draft", "proposed"]).default("proposed"),
    validUntil: dateString,
    note: z.string().trim().max(3000).optional(),
  }),
  z.object({
    action: z.literal("goal_status"),
    goalId: z.number().int().positive(),
    status: z.enum(["open", "researching", "offers_ready", "completed", "cancelled"]),
  }),
  z.object({
    action: z.literal("contract_status"),
    contractId: z.number().int().positive(),
    status: z.enum(["active", "review_due", "switch_planned", "cancelled", "expired"]),
  }),
  z.object({
    action: z.literal("offer_status"),
    offerId: z.number().int().positive(),
    status: z.enum(["draft", "proposed", "accepted", "rejected", "expired"]),
  }),
]);

export type OptimizationActionInput = z.infer<typeof optimizationActionSchema>;
