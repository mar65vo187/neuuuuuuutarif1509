export type BiMetricDefinition = {
  key: string;
  label: string;
  category: "Vertrieb" | "Aufträge" | "Qualität" | "Marketing" | "Finanzen";
  description: string;
  formula: string;
  source: string[];
  scope: string;
  direction: "higher" | "lower" | "neutral";
};

export const BI_METRICS: BiMetricDefinition[] = [
  {
    key: "lead_total",
    label: "Leads",
    category: "Vertrieb",
    description: "Alle im gewählten Zeitraum angelegten Leads innerhalb des sichtbaren Berechtigungsbereichs.",
    formula: "COUNT(leads.created_at im Zeitraum)",
    source: ["leads.created_at"],
    scope: "gewählter Zeitraum · RBAC",
    direction: "neutral",
  },
  {
    key: "lead_conversion_rate",
    label: "Lead → Abschluss",
    category: "Vertrieb",
    description: "Anteil der im Zeitraum angelegten Leads, die aktuell den Status abgeschlossen besitzen.",
    formula: "abgeschlossene Leads / alle Leads × 100",
    source: ["leads.created_at", "leads.status"],
    scope: "Lead-Kohorte nach Erstellungsdatum · RBAC",
    direction: "higher",
  },
  {
    key: "activation_rate",
    label: "Aktivierungsquote",
    category: "Aufträge",
    description: "Anteil der im Zeitraum angelegten Aufträge, die aktuell aktiv sind.",
    formula: "aktive Aufträge / alle Aufträge × 100",
    source: ["orders.created_at", "orders.status"],
    scope: "Auftrags-Kohorte nach Erstellungsdatum · RBAC",
    direction: "higher",
  },
  {
    key: "cancellation_rate",
    label: "Stornoquote",
    category: "Aufträge",
    description: "Anteil der im Zeitraum angelegten Aufträge mit Status storniert oder Rückbelastung.",
    formula: "(cancelled + storno) / alle Aufträge × 100",
    source: ["orders.created_at", "orders.status"],
    scope: "Auftrags-Kohorte nach Erstellungsdatum · RBAC",
    direction: "lower",
  },
  {
    key: "average_sales_cycle",
    label: "Ø Sales Cycle",
    category: "Aufträge",
    description: "Durchschnittliche Zeit zwischen Anlage und Aktivierung für aktive Aufträge im Zeitraum.",
    formula: "AVG(orders.activated_at − orders.created_at) in Stunden",
    source: ["orders.created_at", "orders.activated_at", "orders.status"],
    scope: "aktive Aufträge · gewählter Zeitraum · RBAC",
    direction: "lower",
  },
  {
    key: "provider_commission",
    label: "Provider-Provision",
    category: "Finanzen",
    description: "Summe der erwarteten Provider-Provisionen der im Zeitraum angelegten Aufträge. Kein Umsatz- oder Gewinnwert.",
    formula: "SUM(orders.expected_commission)",
    source: ["orders.created_at", "orders.expected_commission"],
    scope: "nur berechtigte Vergütungsansicht",
    direction: "neutral",
  },
  {
    key: "source_conversion",
    label: "Akquise-Conversion",
    category: "Marketing",
    description: "Abschlussquote je First-Party-Quelle der Anfrage.",
    formula: "abgeschlossene Leads je Quelle / Leads je Quelle × 100",
    source: ["leads.meta.utmSource", "leads.meta.referrerHost", "leads.source", "leads.status"],
    scope: "gewählter Zeitraum · RBAC",
    direction: "higher",
  },
  {
    key: "campaign_conversion",
    label: "Kampagnen-Conversion",
    category: "Marketing",
    description: "Abschlussquote je UTM- oder interner Kampagne.",
    formula: "abgeschlossene Leads je Kampagne / Leads je Kampagne × 100",
    source: ["leads.meta.utmCampaign", "leads.source", "leads.status"],
    scope: "gewählter Zeitraum · RBAC",
    direction: "higher",
  },
  {
    key: "next_action_coverage",
    label: "Nächster-Schritt-Abdeckung",
    category: "Qualität",
    description: "Anteil offener Leads mit dokumentiertem nächsten Schritt oder bestätigtem Termin.",
    formula: "offene Leads mit next_action_at oder Termin / alle offenen Leads × 100",
    source: ["leads.status", "leads.next_action_at"],
    scope: "aktueller Bestand · RBAC",
    direction: "higher",
  },
  {
    key: "product_context_coverage",
    label: "Produktbild-Abdeckung",
    category: "Qualität",
    description: "Anteil offener Leads mit mindestens einer dokumentierten Produktbeziehung.",
    formula: "offene Leads mit lead_product_links / alle offenen Leads × 100",
    source: ["leads.status", "lead_product_links.lead_id"],
    scope: "aktueller Bestand · RBAC",
    direction: "higher",
  },
  {
    key: "provider_reference_coverage",
    label: "Provider-Referenz-Abdeckung",
    category: "Qualität",
    description: "Anteil providerrelevanter Aufträge mit externer Provider-Referenz.",
    formula: "relevante Aufträge mit external_order_id / relevante Aufträge × 100",
    source: ["orders.status", "orders.external_order_id"],
    scope: "eingereichte oder weiter fortgeschrittene Aufträge · RBAC",
    direction: "higher",
  },
  {
    key: "customer_owner_coverage",
    label: "Kunden-Owner-Abdeckung",
    category: "Qualität",
    description: "Anteil nicht archivierter Kunden mit eindeutigem verantwortlichem Mitarbeiter.",
    formula: "Kunden mit owner_employee_id / alle aktiven Kunden × 100",
    source: ["customers.archived_at", "customers.owner_employee_id"],
    scope: "aktueller Kundenbestand · RBAC",
    direction: "higher",
  },
  {
    key: "task_on_time_coverage",
    label: "Aufgaben im Zeitplan",
    category: "Qualität",
    description: "Anteil offener Aufgaben, die nicht überfällig sind.",
    formula: "offene nicht überfällige Aufgaben / alle offenen Aufgaben × 100",
    source: ["tasks.status", "tasks.due_at"],
    scope: "aktueller Aufgabenbestand · RBAC",
    direction: "higher",
  },
];

export const BI_METRIC_BY_KEY = Object.fromEntries(BI_METRICS.map((metric) => [metric.key, metric])) as Record<string, BiMetricDefinition>;

export function percentage(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 100;
}
