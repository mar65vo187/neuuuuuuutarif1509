export const OPTIMIZATION_MEMBERSHIP_PRICE_CENTS = 199;
export const OPTIMIZATION_PLAN_CODE = "optimize_199";

/**
 * Öffentliche Vertragsbedingungen des Optimierungsservice (Stand: Angaben des Inhabers, 29.09.2026).
 * TarifWerk ist derzeit Kleinunternehmer nach § 19 UStG. Nach einer Umstellung (z. B. Wechsel der
 * Rechtsform oder Umsatzsteuerpflicht) müssen Preisangabe und Steuerhinweis hier angepasst werden.
 */
export const OPTIMIZATION_PUBLIC_TERMS = {
  price: "1,99 €",
  period: "pro Monat",
  taxNote: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.",
  minimumTerm: "Mindestlaufzeit 12 Monate",
  cancellation: "danach jederzeit mit einer Frist von einem Monat kündbar",
  conclusion: "Der Vertrag wird persönlich mit deinem TarifWerk-Berater geschlossen und erst mit unserer schriftlichen Bestätigung wirksam. Eine Online-Buchung gibt es nicht.",
  withdrawal: "Wird der Vertrag telefonisch, per E-Mail oder außerhalb unserer Geschäftsräume geschlossen, hast du als Verbraucher ein gesetzliches Widerrufsrecht. Die Widerrufsbelehrung erhältst du mit der Vertragsbestätigung.",
} as const;

export const OPTIMIZATION_CATEGORIES = [
  "internet_tv",
  "mobilfunk",
  "strom_gas",
  "versicherung",
  "solar_waermepumpe",
  "immobilien",
  "edelmetalle",
  "klima",
  "sicherheit",
  "finanzierung",
  "sonstiges",
] as const;

export type OptimizationCategory = (typeof OPTIMIZATION_CATEGORIES)[number];

export const OPTIMIZATION_CATEGORY_LABELS: Record<OptimizationCategory, string> = {
  internet_tv: "Internet & TV",
  mobilfunk: "Mobilfunk",
  strom_gas: "Strom & Gas",
  versicherung: "Versicherungen",
  solar_waermepumpe: "Solar & Wärmepumpe",
  immobilien: "Immobilien",
  edelmetalle: "Edelmetalle",
  klima: "Klima",
  sicherheit: "Sicherheit",
  finanzierung: "Finanzierung",
  sonstiges: "Sonstiges",
};
