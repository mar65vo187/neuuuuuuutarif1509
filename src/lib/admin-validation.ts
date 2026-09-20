import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => text(max).default("");
const email = z.string().trim().toLowerCase().email("Bitte eine gültige E-Mail-Adresse eingeben.").max(200);
const publicProfileSchema = z.object({
  slug: text(80).min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Der Profil-Link darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten."),
  title: text(120).min(2),
  city: text(120).min(2),
  region: text(120).min(2),
  regions: z.array(text(120).min(2)).min(1).max(30),
  topics: z.array(text(120).min(2)).min(1).max(30),
  bio: text(2000).min(20, "Die Kurzvorstellung muss mindestens 20 Zeichen enthalten."),
  quote: optionalText(500),
  phone: optionalText(40).refine((value) => !value || /^\+?[\d\s()/-]{5,40}$/.test(value), "Bitte eine gültige Telefonnummer eingeben."),
  whatsapp: optionalText(20).refine((value) => !value || /^[1-9]\d{6,19}$/.test(value), "WhatsApp-Nummer mit Landesvorwahl und ohne + eingeben."),
  email: z.union([email, z.literal("")]).default(""),
  initials: text(4).min(1),
  isFounder: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(99999).default(100),
}).strict();

const accountFields = {
  name: text(120).min(2),
  email,
  role: z.enum(["admin", "berater"]),
  active: z.boolean(),
  age: z.number().int().min(16).max(100).nullable().default(null),
  address: optionalText(500),
  note: optionalText(4000),
  advisoryAreas: z.array(text(120).min(2)).max(30).default([]),
  advisor: publicProfileSchema.nullable().default(null),
};
export const createAccountSchema = z.object({
  ...accountFields,
  password: z.string().min(15, "Das Passwort muss mindestens 15 Zeichen enthalten.").max(200),
}).strict();
export const updateAccountSchema = z.object({
  ...accountFields,
  password: z.string().min(15, "Das Passwort muss mindestens 15 Zeichen enthalten.").max(200).optional(),
}).strict();

export type AdminProfile = z.infer<typeof publicProfileSchema> & { id: number; name: string; imageUrl: string | null };
export type AdminAccount = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "berater";
  active: boolean;
  advisorId: number | null;
  age: number | null;
  address: string;
  note: string;
  advisoryAreas: string[];
  imageUrl: string | null;
  advisor: AdminProfile | null;
};

export function normalizeSlug(name: string) {
  return name.trim().toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80).replace(/-$/, "");
}
