export const OPTIMIZATION_MEMBERSHIP_PRICE_CENTS = 199;
export const OPTIMIZATION_PLAN_CODE = "optimize_199";

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
