import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const id = z.coerce.number().int().positive().max(2147483647);

export const teamMutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: text(160).min(2),
    leadEmployeeId: id.nullable().optional(),
  }),
  z.object({
    action: z.literal("assign"),
    teamId: id,
    employeeId: id,
  }),
]);

export const incentiveCreateSchema = z.object({
  title: text(180).min(3),
  description: text(3000).optional(),
  goalType: z.enum(["orders", "commission", "team_orders"]),
  goalValue: z.coerce.number().finite().positive().max(100000000),
  rewardType: text(80).min(2),
  rewardDescription: text(1000).min(3),
  budget: z.coerce.number().finite().min(0).max(100000000).nullable().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  audience: text(120).default("all"),
}).refine((value) => new Date(value.endsAt) > new Date(value.startsAt), { path: ["endsAt"], message: "Enddatum muss nach dem Startdatum liegen." });

export const trainingMutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    title: text(180).min(3),
    category: text(100).min(2),
    description: text(3000).optional(),
    content: text(12000).optional(),
    productId: id.nullable().optional(),
    required: z.boolean().default(false),
    validMonths: z.coerce.number().int().min(1).max(120).nullable().optional(),
  }),
  z.object({
    action: z.literal("complete"),
    moduleId: id,
    employeeId: id,
    note: text(1000).optional(),
  }),
  z.object({
    action: z.literal("revoke"),
    moduleId: id,
    employeeId: id,
    note: text(1000).optional(),
  }),
]);

export const benefitMutationSchema = z.object({
  employeeId: id,
  benefitKey: text(80).min(2),
  label: text(180).min(2),
  status: z.enum(["eligible", "active", "paused", "ended"]),
  details: text(2000).optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validTo: z.string().datetime().nullable().optional(),
});

export const reconciliationImportSchema = z.object({
  providerId: id,
  sourceName: text(240).min(2),
  rows: z.array(z.object({
    externalOrderId: text(160).min(1),
    reportedAmount: z.coerce.number().finite().min(-100000000).max(100000000),
    reference: text(240).optional(),
  })).min(1).max(5000),
});
