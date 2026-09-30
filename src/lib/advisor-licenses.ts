import { z } from "zod";

/**
 * Gewerbeerlaubnisse für die Erstinformation (Informationspflichten nach
 * VersVermV, FinVermV und ImmVermV). Nur tatsächlich eingetragene Angaben werden veröffentlicht –
 * es gibt bewusst keine Platzhalter.
 */
export const LICENSE_KINDS = ["34d", "34c", "34i", "34f"] as const;
export type LicenseKind = (typeof LICENSE_KINDS)[number];

export const LICENSE_KIND_LABELS: Record<LicenseKind, string> = {
  "34d": "Versicherungsvermittlung (§ 34d GewO)",
  "34c": "Immobilienvermittlung (§ 34c GewO)",
  "34i": "Immobiliardarlehensvermittlung (§ 34i GewO)",
  "34f": "Finanzanlagenvermittlung (§ 34f GewO)",
};

export const LICENSE_STATUS_OPTIONS: Record<LicenseKind, string[]> = {
  "34d": [
    "Versicherungsmakler mit Erlaubnis nach § 34d Abs. 1 GewO",
    "Versicherungsvertreter mit Erlaubnis nach § 34d Abs. 1 GewO",
    "Gebundener Versicherungsvertreter nach § 34d Abs. 7 GewO",
  ],
  "34c": ["Immobilienmakler mit Erlaubnis nach § 34c Abs. 1 Satz 1 Nr. 1 GewO"],
  "34i": ["Immobiliardarlehensvermittler mit Erlaubnis nach § 34i Abs. 1 GewO"],
  "34f": ["Finanzanlagenvermittler mit Erlaubnis nach § 34f Abs. 1 GewO"],
};

/** Register-pflichtige Erlaubnisse (für § 34c gibt es kein Vermittlerregister). */
export const REGISTERED_KINDS: readonly LicenseKind[] = ["34d", "34i", "34f"];

export const VERMITTLER_REGISTER = {
  name: "Deutscher Industrie- und Handelskammertag (DIHK) e. V.",
  address: "Breite Straße 29, 10178 Berlin",
  url: "https://www.vermittlerregister.info",
};

export const INSURANCE_ARBITRATION = [
  { name: "Versicherungsombudsmann e. V.", address: "Postfach 08 06 32, 10006 Berlin", url: "https://www.versicherungsombudsmann.de" },
  { name: "Ombudsmann Private Kranken- und Pflegeversicherung", address: "Postfach 06 02 22, 10052 Berlin", url: "https://www.pkv-ombudsmann.de" },
];

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

export const licenseInputSchema = z.object({
  kind: z.enum(LICENSE_KINDS),
  status: text(5, 200),
  holderName: text(2, 160),
  businessAddress: text(5, 300),
  registerNumber: z.string().trim().max(60).optional().default(""),
  authority: text(3, 300),
  remuneration: z.string().trim().max(500).optional().default(""),
  noHoldingsConfirmed: z.boolean().default(false),
}).superRefine((value, context) => {
  if (!LICENSE_STATUS_OPTIONS[value.kind].includes(value.status)) {
    context.addIssue({ code: "custom", path: ["status"], message: "Bitte einen passenden Status wählen." });
  }
  if (REGISTERED_KINDS.includes(value.kind) && value.registerNumber.length < 4) {
    context.addIssue({ code: "custom", path: ["registerNumber"], message: "Für diese Erlaubnis ist die Registernummer Pflicht." });
  }
});

export type LicenseInput = z.infer<typeof licenseInputSchema>;
