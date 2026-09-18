import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max);

export const leadSchema = z.object({
  type: z.enum(["beratung", "termin", "tarifcheck", "bewerbung", "kontakt"]).default("beratung"),
  name: trimmed(120).min(2, "Bitte gib deinen Namen an."),
  email: z.string().trim().toLowerCase().email("Bitte gib eine gültige E-Mail-Adresse an.").max(200),
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
  meta: z.record(z.string(), z.unknown()).optional(),
}).superRefine((data, ctx) => {
  if (["telefon", "whatsapp"].includes(data.preferredChannel ?? "") && !data.phone?.trim()) {
    ctx.addIssue({ code: "custom", path: ["phone"], message: "Bitte gib für Telefon oder WhatsApp eine Telefonnummer an oder wähle E-Mail." });
  }
  if (data.type === "bewerbung" && !data.message?.trim()) {
    ctx.addIssue({ code: "custom", path: ["message"], message: "Bitte beschreibe kurz deine Motivation." });
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
}).refine((data) => Boolean(data.status || data.confirmedSlot || data.assignToMe || data.note), {
  message: "Bitte gib eine Änderung an.",
});

export const chatMessageSchema = z.object({
  body: trimmed(1000).min(1),
});
