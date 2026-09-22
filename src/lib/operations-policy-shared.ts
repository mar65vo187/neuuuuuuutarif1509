export type OperationsPolicyValues = {
  leadNextActionMissingHours: number;
  leadNextActionHighHours: number;
  customerReviewHighDays: number;
  opportunityReviewHighDays: number;
  orderStaleDays: number;
  providerReferenceMissingHours: number;
  providerStatusMissingHours: number;
  activationStaleDays: number;
  documentsStaleHours: number;
};

export type OperationsPolicySnapshot = OperationsPolicyValues & {
  updatedByEmployeeId: number | null;
  updatedAt: Date | null;
};

export const DEFAULT_OPERATIONS_POLICY: OperationsPolicyValues = {
  leadNextActionMissingHours: 24,
  leadNextActionHighHours: 72,
  customerReviewHighDays: 14,
  opportunityReviewHighDays: 14,
  orderStaleDays: 7,
  providerReferenceMissingHours: 24,
  providerStatusMissingHours: 48,
  activationStaleDays: 7,
  documentsStaleHours: 48,
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function operationsPolicyCutoffs(policy: OperationsPolicyValues, now = new Date()) {
  return {
    leadMissingAt: new Date(now.getTime() - policy.leadNextActionMissingHours * HOUR),
    leadHighAt: new Date(now.getTime() - policy.leadNextActionHighHours * HOUR),
    customerReviewHighAt: new Date(now.getTime() - policy.customerReviewHighDays * DAY),
    opportunityReviewHighAt: new Date(now.getTime() - policy.opportunityReviewHighDays * DAY),
    orderStaleAt: new Date(now.getTime() - policy.orderStaleDays * DAY),
    providerReferenceMissingAt: new Date(now.getTime() - policy.providerReferenceMissingHours * HOUR),
    providerStatusMissingAt: new Date(now.getTime() - policy.providerStatusMissingHours * HOUR),
    activationStaleAt: new Date(now.getTime() - policy.activationStaleDays * DAY),
    documentsStaleAt: new Date(now.getTime() - policy.documentsStaleHours * HOUR),
  };
}

export const OPERATIONS_POLICY_FIELDS: Array<{
  key: keyof OperationsPolicyValues;
  label: string;
  unit: "Stunden" | "Tage";
  description: string;
}> = [
  { key: "leadNextActionMissingHours", label: "Lead ohne nächsten Schritt", unit: "Stunden", description: "Ab wann ein offener Lead ohne Wiedervorlage vom Qualitäts-Wächter aufgenommen wird." },
  { key: "leadNextActionHighHours", label: "Lead eskaliert auf Hoch", unit: "Stunden", description: "Ab wann derselbe Lead als hohe Priorität behandelt wird." },
  { key: "customerReviewHighDays", label: "Überfälliger Kundenreview auf Hoch", unit: "Tage", description: "Überfälligkeit bis ein Customer-360-Review als hohe Priorität gilt." },
  { key: "opportunityReviewHighDays", label: "Überfällige Opportunity auf Hoch", unit: "Tage", description: "Überfälligkeit bis eine Opportunity-Prüfung als hohe Priorität gilt." },
  { key: "orderStaleDays", label: "Auftrag ohne Bewegung", unit: "Tage", description: "Ab wann ein offener Auftrag ohne Aktualisierung als festhängend gilt." },
  { key: "providerReferenceMissingHours", label: "Provider-Referenz fehlt", unit: "Stunden", description: "Zeit nach Einreichung bis eine fehlende externe Provider-Referenz auffällig wird." },
  { key: "providerStatusMissingHours", label: "Provider-Status fehlt", unit: "Stunden", description: "Zeit nach Einreichung bis ein fehlender Provider-Status auffällig wird." },
  { key: "activationStaleDays", label: "Aktivierung ohne Bewegung", unit: "Tage", description: "Ab wann eine offene Aktivierung als festhängend gilt." },
  { key: "documentsStaleHours", label: "Unterlagen fehlen", unit: "Stunden", description: "Ab wann ein Auftrag mit fehlenden Unterlagen als SLA-Warnung gilt." },
];
