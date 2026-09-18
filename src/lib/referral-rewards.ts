export type ReferralRewardRule = {
  key: string;
  group: "Digital & Energie" | "Wohnkomfort & Sicherheit" | "Absicherung & Zukunft" | "Premium-Bereiche";
  label: string;
  maxVoucherAmount: number;
  maxCashAmount: number;
  note?: string;
  aliases: string[];
};

export const REFERRAL_REWARD_RULES: ReferralRewardRule[] = [
  { key: "internet", group: "Digital & Energie", label: "Internet", maxVoucherAmount: 50, maxCashAmount: 25, aliases: ["internet", "glasfaser"] },
  { key: "mobilfunk", group: "Digital & Energie", label: "Mobilfunk", maxVoucherAmount: 50, maxCashAmount: 25, aliases: ["mobilfunk", "sim", "handy"] },
  { key: "tv", group: "Digital & Energie", label: "TV", maxVoucherAmount: 50, maxCashAmount: 25, aliases: ["tv", "fernsehen"] },
  { key: "strom", group: "Digital & Energie", label: "Strom", maxVoucherAmount: 50, maxCashAmount: 25, aliases: ["strom"] },
  { key: "gas", group: "Digital & Energie", label: "Gas", maxVoucherAmount: 50, maxCashAmount: 25, aliases: ["gas"] },
  { key: "klima", group: "Wohnkomfort & Sicherheit", label: "Klimaanlagen", maxVoucherAmount: 100, maxCashAmount: 50, aliases: ["klimaanlage", "klimaanlagen", "klima"] },
  { key: "sicherheit", group: "Wohnkomfort & Sicherheit", label: "Sicherheitslösungen", maxVoucherAmount: 350, maxCashAmount: 175, aliases: ["sicherheitslösung", "sicherheitslösungen", "sicherheit", "alarm", "smart home"] },
  { key: "versicherungen", group: "Absicherung & Zukunft", label: "Versicherungen", maxVoucherAmount: 250, maxCashAmount: 125, aliases: ["versicherung", "versicherungen"] },
  { key: "solar", group: "Absicherung & Zukunft", label: "Solar / Photovoltaik", maxVoucherAmount: 500, maxCashAmount: 250, aliases: ["solar", "photovoltaik", "pv"] },
  { key: "waermepumpe", group: "Absicherung & Zukunft", label: "Wärmepumpe", maxVoucherAmount: 500, maxCashAmount: 250, aliases: ["wärmepumpe", "wärmepumpen", "waermepumpe", "waermepumpen"] },
  { key: "immobilien", group: "Premium-Bereiche", label: "Immobilienvermittlung", maxVoucherAmount: 1000, maxCashAmount: 500, note: "abhängig vom vermittelten Geschäft", aliases: ["immobilien", "immobilie", "immobilienvermittlung"] },
  { key: "edelmetalle", group: "Premium-Bereiche", label: "Edelmetallberatung", maxVoucherAmount: 1000, maxCashAmount: 500, note: "abhängig von Umfang und Höhe der Investition", aliases: ["edelmetall", "edelmetalle", "gold", "silber", "edelmetallberatung"] },
];

export const REFERRAL_REWARD_GROUPS = [...new Set(REFERRAL_REWARD_RULES.map((rule) => rule.group))].map((group) => {
  const rules = REFERRAL_REWARD_RULES.filter((rule) => rule.group === group);
  return {
    group,
    rules,
    maxVoucherAmount: Math.max(...rules.map((rule) => rule.maxVoucherAmount)),
  };
});

export const REFERRAL_MAX_VOUCHER = Math.max(...REFERRAL_REWARD_RULES.map((rule) => rule.maxVoucherAmount));
export const REFERRAL_MAX_CASH = REFERRAL_MAX_VOUCHER / 2;

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9äöüß ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveReferralRewardRule(...values: Array<string | null | undefined>) {
  const haystack = normalize(values.filter(Boolean).join(" "));
  if (!haystack) return null;

  // More specific product names win over combined categories.
  const priority = ["waermepumpe", "solar", "mobilfunk", "tv", "strom", "gas", "internet", "klima", "sicherheit", "versicherungen", "immobilien", "edelmetalle"];
  for (const key of priority) {
    const rule = REFERRAL_REWARD_RULES.find((entry) => entry.key === key);
    if (rule && rule.aliases.some((alias) => haystack.includes(normalize(alias)))) return rule;
  }
  return null;
}

export function formatEuro(value: number) {
  return value.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export const REFERRAL_PIPELINE = [
  { key: "tracked", label: "Erfasst", description: "Die Empfehlung wurde deinem Link zugeordnet." },
  { key: "qualified", label: "Qualifiziert", description: "Ein echter Beratungs- oder Vertragsbedarf wurde bestätigt." },
  { key: "completed", label: "Abgeschlossen", description: "Ein zugehöriger Auftrag wurde erfolgreich abgeschlossen." },
  { key: "approved", label: "Freigegeben", description: "Voraussetzungen und relevante Fristen wurden geprüft." },
  { key: "paid", label: "Ausgezahlt", description: "Die bestätigte Prämie wurde ausgegeben oder ausgezahlt." },
] as const;
