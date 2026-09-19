export const COMPENSATION_TIERS = [
  { percent: 82, name: "Start", note: "Sauberes Onboarding, Produktwissen und verlässliche Prozesse." },
  { percent: 84, name: "Aufbau", note: "Konstante Aktivität, saubere Dokumentation und gute Beratungsqualität." },
  { percent: 86, name: "Professional", note: "Stabile Leistung, geringe Fehlerquote und selbstständige Arbeitsweise." },
  { percent: 88, name: "Senior", note: "Nachhaltige Abschlüsse, starke Qualität und verlässliche Kundenbetreuung." },
  { percent: 90, name: "Builder", note: "Zusätzlicher Teambeitrag, Mentoring oder strukturierter Teamaufbau." },
  { percent: 92, name: "Partner", note: "Höchste Stufe für dauerhaft starke Qualität, Verantwortung und Beitrag zum System." },
] as const;

export const TEAM_LEVELS = [
  { key: "berater", label: "Berater" },
  { key: "senior", label: "Senior Berater" },
  { key: "builder", label: "Builder" },
  { key: "teamlead", label: "Teamlead" },
] as const;

export const DEFAULT_PAYOUT_PERCENT = 82;
export const DEFAULT_RESERVE_PERCENT = 8;
export const DEFAULT_LOYALTY_YEARS = 10;
