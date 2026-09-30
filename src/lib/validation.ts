import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max);

const leadCommonShape = {
  type: z.enum(["beratung", "termin", "tarifcheck", "bewerbung", "kontakt"]).default("beratung"),
  phone: trimmed(40).optional().or(z.literal("")),
  topic: trimmed(1000).optional().or(z.literal("")),
  region: trimmed(80).optional().or(z.literal("")),
  situation: trimmed(80).optional().or(z.literal("")),
  message: trimmed(2000).optional().or(z.literal("")),
  preferredChannel: trimmed(40).optional().or(z.literal("")),
  preferredTime: trimmed(120).optional().or(z.literal("")),
  referralCode: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  referralConsent: z.boolean().optional(),
  advisorSlug: trimmed(80).optional().or(z.literal("")),
  source: trimmed(120).optional().or(z.literal("")),
  consent: z.literal(true, { message: "Bitte stimme der Datenverarbeitung zu." }),
  website: z.string().max(2000).optional(),
};

const publicLeadMetaSchema = z.object({
  audience: z.enum(["b2c", "b2b"]).optional(),
  job: trimmed(160).optional().or(z.literal("")),
  companyName: trimmed(180).optional().or(z.literal("")),
  companySize: trimmed(40).optional().or(z.literal("")),
  landingPath: trimmed(500).optional().or(z.literal("")),
  requestPath: trimmed(500).optional().or(z.literal("")),
  referrerHost: trimmed(160).optional().or(z.literal("")),
  utmSource: trimmed(120).optional().or(z.literal("")),
  utmMedium: trimmed(120).optional().or(z.literal("")),
  utmCampaign: trimmed(160).optional().or(z.literal("")),
  utmContent: trimmed(160).optional().or(z.literal("")),
  utmTerm: trimmed(160).optional().or(z.literal("")),
}).strict();

const portalMetaScalar = z.union([z.string().max(500), z.number(), z.boolean(), z.null()]);
const portalMetaSchema = z.record(z.string().max(80), portalMetaScalar)
  .superRefine((value, ctx) => {
    if (Object.keys(value).length > 30) {
      ctx.addIssue({ code: "custom", message: "Zu viele Metadaten-Felder." });
    }
  });

export const leadSchema = z.object({
  ...leadCommonShape,
  meta: publicLeadMetaSchema.optional(),
  name: trimmed(120).min(2, "Bitte gib deinen Namen an."),
  email: z.string().trim().toLowerCase().email("Bitte gib eine gültige E-Mail-Adresse an.").max(200),
}).superRefine((data, ctx) => {
  if (["telefon", "whatsapp"].includes(data.preferredChannel ?? "") && !data.phone?.trim()) {
    ctx.addIssue({ code: "custom", path: ["phone"], message: "Bitte gib für Telefon oder WhatsApp eine Telefonnummer an oder wähle E-Mail." });
  }
  if (data.type === "bewerbung" && !data.message?.trim()) {
    ctx.addIssue({ code: "custom", path: ["message"], message: "Bitte beschreibe kurz deine Motivation." });
  }
});

export const portalLeadCreateSchema = z.object({
  ...leadCommonShape,
  meta: portalMetaSchema.optional(),
  name: trimmed(120).optional().default(""),
  email: z.union([
    z.literal(""),
    z.string().trim().toLowerCase().email("Bitte gib eine gültige E-Mail-Adresse an.").max(200),
  ]).optional().default(""),
  status: z.enum(["neu", "kontaktiert", "termin_bestaetigt", "in_beratung", "abgeschlossen", "verloren"]).default("neu"),
  priority: z.enum(["low", "normal", "high", "hot"]).default("normal"),
  contactOutcome: z.enum(["open", "attempted", "reached", "no_answer", "callback", "voicemail", "wrong_number", "not_interested"]).default("open"),
  nextActionAt: z.string().datetime().nullable().optional(),
  tags: z.array(trimmed(40)).max(12).default([]),
  confirmedSlot: trimmed(160).optional().or(z.literal("")),
  productId: z.number().int().positive().optional(),
  productRelation: z.enum(["interest", "existing", "sold"]).optional(),
  productSelections: z.array(z.object({
    productId: z.number().int().positive(),
    relation: z.enum(["interest", "existing", "sold"]).default("interest"),
  })).max(30).default([]),
}).superRefine((data, ctx) => {
  if (["telefon", "whatsapp"].includes(data.preferredChannel ?? "") && !data.phone?.trim()) {
    ctx.addIssue({ code: "custom", path: ["phone"], message: "Wenn Telefon oder WhatsApp als Kontaktweg gewählt ist, bitte eine Nummer eintragen oder den Kontaktweg offen lassen." });
  }
  if (data.preferredChannel === "email" && !data.email.trim()) {
    ctx.addIssue({ code: "custom", path: ["email"], message: "Wenn E-Mail als Kontaktweg gewählt ist, bitte eine E-Mail-Adresse eintragen oder den Kontaktweg offen lassen." });
  }
  if (data.type === "bewerbung" && !data.message?.trim()) {
    ctx.addIssue({ code: "custom", path: ["message"], message: "Bitte beschreibe kurz die Motivation." });
  }
  const hasUsefulLeadData = [data.name, data.email, data.phone, data.topic, data.message]
    .some((value) => typeof value === "string" && value.trim().length > 0);
  if (!hasUsefulLeadData) {
    ctx.addIssue({
      code: "custom",
      path: ["name"],
      message: "Bitte mindestens Name/Vorname, E-Mail, Telefon, Thema oder eine Notiz eintragen.",
    });
  }
});

export type LeadInput = z.infer<typeof leadSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(6).max(200),
  mfaCode: z.string().trim().regex(/^\d{6}$/).optional(),
});

export const leadUpdateSchema = z.object({
  status: z.enum(["neu", "kontaktiert", "termin_bestaetigt", "in_beratung", "abgeschlossen", "verloren"]).optional(),
  confirmedSlot: trimmed(160).optional(),
  assignToMe: z.boolean().optional(),
  note: trimmed(2000).optional(),
  priority: z.enum(["low", "normal", "high", "hot"]).optional(),
  contactOutcome: z.enum(["open", "attempted", "reached", "no_answer", "callback", "voicemail", "wrong_number", "not_interested"]).optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
  tags: z.array(trimmed(40)).max(12).optional(),
  // Pipeline forecast: value in euro cents (max. 10 Mio. €), probability in percent.
  dealValueCents: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  winProbability: z.number().int().min(0).max(100).nullable().optional(),
  expectedCloseAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }).nullable().optional(),
  lostReason: z.enum(["price", "competitor", "no_need", "unreachable", "timing", "not_eligible", "other"]).optional(),
}).refine((data) => Boolean(
  data.status ||
  data.confirmedSlot ||
  data.assignToMe ||
  data.note ||
  data.priority ||
  data.contactOutcome ||
  data.nextActionAt !== undefined ||
  data.tags ||
  data.dealValueCents !== undefined ||
  data.winProbability !== undefined ||
  data.expectedCloseAt !== undefined ||
  data.lostReason
), {
  message: "Bitte gib eine Änderung an.",
});

export const leadCallActivitySchema = z.object({
  calledAt: z.string().datetime().optional(),
  reachedPerson: z.enum(["customer", "partner_family", "colleague", "gatekeeper", "voicemail", "nobody", "wrong_number", "other"]),
  reaction: z.enum(["very_interested", "interested", "neutral", "hesitant", "busy", "callback_requested", "appointment_agreed", "no_answer", "annoyed", "not_interested", "do_not_contact"]),
  note: trimmed(1500).optional().default(""),
  requestedCallbackAt: z.string().datetime().nullable().optional(),
  autoSchedule: z.boolean().default(true),
});

export const chatMessageSchema = z.object({
  body: trimmed(1000).min(1),
  channel: z.enum(["all", "admins", "direct"]).default("all"),
  recipientId: z.number().int().positive().optional(),
  recipientEmail: z.string().trim().email().max(254).optional(),
}).superRefine((value, ctx) => {
  if (value.channel === "direct" && !value.recipientId && !value.recipientEmail) {
    ctx.addIssue({ code: "custom", message: "Für eine Direktnachricht ist ein Empfänger erforderlich.", path: ["recipientId"] });
  }
});
