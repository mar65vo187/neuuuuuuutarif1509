import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const id = z.coerce.number().int().positive().max(2147483647);
const money = z.union([
  z.number().finite().min(0).max(999999999),
  z.string().trim().regex(/^\d{1,9}([.,]\d{1,2})?$/),
]).transform((value) => Number(String(value).replace(",", ".")));

const channelSchema = z.object({
  channel: text(80).min(2),
  status: z.enum(["allowed", "conditional", "blocked"]),
  note: text(500).optional(),
});

export const hubProviderCreateSchema = z.object({
  kind: z.literal("provider"),
  name: text(160).min(2),
  category: text(80).min(2),
  externalPartnerId: text(160).optional(),
  partnerType: text(80).default("provider"),
  websiteUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  portalUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  contactName: text(160).optional(),
  contactPhone: text(80).optional(),
  contactEmail: z.string().trim().email().max(200).optional().or(z.literal("")),
  supportContact: text(300).optional(),
  billingPath: text(500).optional(),
  regions: z.array(text(120).min(1)).max(50).default([]),
  notes: text(3000).optional(),
});

export const hubProductCreateSchema = z.object({
  kind: z.literal("product"),
  providerId: id,
  name: text(180).min(2),
  category: text(80).min(2),
  sku: text(120).optional(),
  audience: z.enum(["private", "business", "both"]).default("both"),
  lifecycleStatus: z.enum(["active", "new", "test", "paused", "do_not_market", "phasing_out", "ended"]).default("active"),
  description: text(5000).optional(),
  region: text(300).default("Deutschland"),
  submissionUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  supportContact: text(500).optional(),
  completionProcess: text(8000).optional(),
  marketingChannels: z.array(channelSchema).max(40).default([]),
  marketingConditions: text(5000).optional(),
  salesArguments: z.array(text(500).min(1)).max(50).default([]),
  objections: z.array(z.object({ objection: text(500).min(1), answer: text(1000).min(1) })).max(50).default([]),
  checklist: z.array(text(500).min(1)).max(100).default([]),
  requiredDocuments: z.array(text(500).min(1)).max(100).default([]),
  trainingRequired: z.boolean().default(false),
  highlight: text(120).optional(),
});

export const hubCreateSchema = z.discriminatedUnion("kind", [hubProviderCreateSchema, hubProductCreateSchema]);

export const commissionImportSchema = z.object({
  providerId: id,
  sourceName: text(240).min(2),
  sourceType: z.enum(["csv", "structured", "manual"]).default("structured"),
  validFrom: z.string().datetime().nullable().optional(),
  validTo: z.string().datetime().nullable().optional(),
  rows: z.array(z.object({
    productId: id.nullable().optional(),
    externalProductId: text(160).optional(),
    productName: text(180).min(2),
    category: text(80).min(2),
    grossAmount: money,
  })).min(1).max(5000),
});

export const benefitPoolEntrySchema = z.object({
  entryType: z.enum(["credit", "spend", "reserve", "release", "correction"]),
  category: z.enum([
    "incentives",
    "teamreisen",
    "firmenwagen",
    "branding",
    "wellpass",
    "schulungen",
    "events",
    "mitarbeiterpraemien",
    "technik",
    "buero",
    "recruiting",
    "marketing",
    "treueprogramme",
    "vorsorge",
    "reserve",
    "sonstiges",
  ]),
  amount: z.coerce.number().finite().positive().max(10000000),
  note: text(1000).min(3),
  reference: text(240).optional(),
});

export const productUpdateSchema = z.object({
  productId: id.nullable().optional(),
  providerId: id.nullable().optional(),
  updateType: z.enum(["info", "price", "commission", "campaign", "process", "training", "stop"]).default("info"),
  title: text(220).min(3),
  body: text(4000).optional(),
  important: z.boolean().default(false),
}).refine((value) => Boolean(value.productId || value.providerId), { message: "Produkt oder Partner fehlt." });
