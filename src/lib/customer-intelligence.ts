export type CustomerIntelligenceInput = {
  customer: {
    createdAt: Date | string;
    email: string | null;
    phone: string | null;
    preferredChannel: string | null;
  };
  profile?: {
    lifecycleStage: string;
    relationshipStatus: string;
    riskLevel: string;
    nextReviewAt: Date | string | null;
    lastContactAt: Date | string | null;
    lastContactChannel: string | null;
  } | null;
  orders: Array<{
    status: string;
    category: string | null;
    productName?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  }>;
  tasks: Array<{
    status: string;
    priority: string;
    dueAt: Date | string | null;
  }>;
  activities: Array<{
    type: string;
    occurredAt: Date | string;
    nextActionAt: Date | string | null;
  }>;
  opportunities: Array<{
    status: string;
    priority: string;
    topic: string;
    category?: string | null;
    nextReviewAt: Date | string | null;
  }>;
  referralCount: number;
  availableCategories: string[];
  now?: Date;
};

export type CustomerRiskFlag = {
  key: string;
  label: string;
  detail: string;
  severity: "critical" | "high" | "normal";
};

export type CustomerIntelligence = {
  tone: "critical" | "high" | "normal" | "good";
  completeness: number;
  missing: string[];
  nextBestAction: {
    key: string;
    label: string;
    detail: string;
  };
  retention: {
    status: "due" | "soon" | "healthy" | "new";
    label: string;
    detail: string;
  };
  riskFlags: CustomerRiskFlag[];
  coverage: {
    activeCategories: string[];
    openOpportunityTopics: string[];
    crossSellSignals: string[];
  };
  summary: {
    activeOrders: number;
    openOpportunities: number;
    overdueTasks: number;
    activities: number;
    referrals: number;
    lastContactAt: string | null;
  };
};

const DAY = 24 * 60 * 60 * 1000;

function time(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const valueMs = date.getTime();
  return Number.isFinite(valueMs) ? valueMs : null;
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

export function getCustomerIntelligence(input: CustomerIntelligenceInput): CustomerIntelligence {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const createdAt = time(input.customer.createdAt) ?? nowMs;

  const activeOrderStatuses = new Set(["accepted", "activation_pending", "active"]);
  const workingTaskStatuses = new Set(["open", "in_progress"]);
  const openOpportunityStatuses = new Set(["open", "qualified", "later"]);

  const activeOrders = input.orders.filter((order) => activeOrderStatuses.has(order.status));
  const openOpportunities = input.opportunities.filter((item) => openOpportunityStatuses.has(item.status));
  const overdueTasks = input.tasks.filter((task) => {
    const due = time(task.dueAt);
    return workingTaskStatuses.has(task.status) && due !== null && due < nowMs;
  });
  const overdueOpportunities = openOpportunities.filter((item) => {
    const review = time(item.nextReviewAt);
    return review !== null && review < nowMs;
  });
  const documentsMissing = input.orders.filter((order) => order.status === "documents_missing");

  const activityContactTimes = input.activities
    .filter((activity) => activity.type !== "note")
    .map((activity) => time(activity.occurredAt))
    .filter((value): value is number => value !== null);
  const profileLastContact = time(input.profile?.lastContactAt);
  const lastContactMs = Math.max(0, profileLastContact ?? 0, ...activityContactTimes);
  const lastContactAt = lastContactMs > 0 ? new Date(lastContactMs).toISOString() : null;
  const customerAgeDays = Math.max(0, Math.floor((nowMs - createdAt) / DAY));
  const daysSinceContact = lastContactMs > 0 ? Math.floor((nowMs - lastContactMs) / DAY) : null;

  const activeCategories = unique(activeOrders.map((order) => order.category));
  const opportunityCategories = unique(openOpportunities.map((item) => item.category));
  const coveredCategoryKeys = new Set([...activeCategories, ...opportunityCategories].map((item) => item.toLocaleLowerCase("de-DE")));
  const crossSellSignals = unique(input.availableCategories)
    .filter((category) => !coveredCategoryKeys.has(category.toLocaleLowerCase("de-DE")))
    .slice(0, 4);

  const riskFlags: CustomerRiskFlag[] = [];
  if (overdueTasks.length > 0) {
    riskFlags.push({
      key: "overdue_tasks",
      label: String(overdueTasks.length) + " Aufgabe" + (overdueTasks.length === 1 ? "" : "n") + " überfällig",
      detail: "Überfällige Kundenaufgaben zuerst bearbeiten, damit Zusagen und Wiedervorlagen nicht verloren gehen.",
      severity: overdueTasks.some((task) => task.priority === "critical") ? "critical" : "high",
    });
  }
  if (documentsMissing.length > 0) {
    riskFlags.push({
      key: "documents_missing",
      label: "Unterlagen fehlen",
      detail: "Mindestens ein Auftrag wartet auf fehlende Unterlagen und kann dadurch nicht sauber weiterlaufen.",
      severity: "high",
    });
  }
  if (overdueOpportunities.length > 0) {
    riskFlags.push({
      key: "opportunity_overdue",
      label: "Opportunity überfällig",
      detail: "Ein offenes Kundenpotenzial hat seinen geplanten Prüftermin überschritten.",
      severity: "high",
    });
  }
  if (!input.customer.phone && !input.customer.email) {
    riskFlags.push({
      key: "no_contact",
      label: "Kein Kontaktweg",
      detail: "Ohne Telefonnummer oder E-Mail ist eine verlässliche Kundenbetreuung nicht möglich.",
      severity: "critical",
    });
  }
  if (customerAgeDays >= 30 && lastContactMs === 0) {
    riskFlags.push({
      key: "never_contacted",
      label: "Kein Kundenkontakt dokumentiert",
      detail: "Die Kundenakte besteht seit mindestens 30 Tagen, aber es ist noch kein Kundenkontakt dokumentiert.",
      severity: "high",
    });
  } else if (daysSinceContact !== null && daysSinceContact >= 180 && activeOrders.length > 0) {
    riskFlags.push({
      key: "stale_relationship",
      label: "Bestandskontakt überfällig",
      detail: "Der letzte dokumentierte Kontakt liegt seit " + String(daysSinceContact) + " Tagen zurück.",
      severity: daysSinceContact >= 365 ? "high" : "normal",
    });
  }

  const nextReviewMs = time(input.profile?.nextReviewAt);
  let retention: CustomerIntelligence["retention"];
  if (customerAgeDays < 30 && activeOrders.length === 0) {
    retention = {
      status: "new",
      label: "Neue Kundenbeziehung",
      detail: "Bedarf, Kontaktweg und ersten festen Folgeschritt sauber dokumentieren.",
    };
  } else if (nextReviewMs !== null && nextReviewMs < nowMs) {
    retention = {
      status: "due",
      label: "Bestandscheck fällig",
      detail: "Der hinterlegte Kunden-Review ist überfällig und sollte jetzt durchgeführt werden.",
    };
  } else if (nextReviewMs !== null && nextReviewMs <= nowMs + 30 * DAY) {
    retention = {
      status: "soon",
      label: "Bestandscheck steht an",
      detail: "Der nächste Kunden-Review ist innerhalb der kommenden 30 Tage geplant.",
    };
  } else if (activeOrders.length > 0 && (daysSinceContact === null || daysSinceContact >= 120)) {
    retention = {
      status: "due",
      label: "Bestandskontakt einplanen",
      detail: "Aktiver Bestand ist vorhanden, aber ein aktueller Kundenkontakt bzw. Review fehlt.",
    };
  } else {
    retention = {
      status: "healthy",
      label: "Kundenbeziehung im Rhythmus",
      detail: "Aktuell gibt es keinen überfälligen Retention-Hinweis aus den dokumentierten CRM-Daten.",
    };
  }

  const missing: string[] = [];
  if (!input.customer.phone && !input.customer.email) missing.push("Kontaktweg");
  if (!input.customer.preferredChannel) missing.push("Wunschkanal");
  if (lastContactMs === 0) missing.push("Kontaktaktivität");
  if (!input.profile?.nextReviewAt && activeOrders.length > 0) missing.push("Bestandscheck");
  if (activeOrders.length === 0 && openOpportunities.length === 0) missing.push("Produkt-/Potenzialbild");

  const checks = [
    Boolean(input.customer.phone || input.customer.email),
    Boolean(input.customer.preferredChannel),
    lastContactMs > 0,
    Boolean(input.profile?.nextReviewAt) || activeOrders.length === 0,
    activeOrders.length > 0 || openOpportunities.length > 0,
  ];
  const completeness = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  let nextBestAction: CustomerIntelligence["nextBestAction"];
  if (overdueTasks.length > 0) {
    nextBestAction = {
      key: "resolve_overdue_task",
      label: "Überfällige Aufgabe erledigen",
      detail: "Eine konkrete Kundenaufgabe ist bereits fällig. Sie hat Vorrang vor neuen Potenzialthemen.",
    };
  } else if (documentsMissing.length > 0) {
    nextBestAction = {
      key: "collect_documents",
      label: "Fehlende Unterlagen nachfassen",
      detail: "Ein Auftrag ist blockiert. Fehlende Dokumente oder Angaben jetzt mit dem Kunden klären.",
    };
  } else if (overdueOpportunities.length > 0) {
    nextBestAction = {
      key: "review_opportunity",
      label: "Offenes Potenzial nachfassen",
      detail: "Prüftermin überschritten: " + (overdueOpportunities[0]?.topic ?? "Opportunity") + ".",
    };
  } else if (!input.customer.phone && !input.customer.email) {
    nextBestAction = {
      key: "complete_contact",
      label: "Kontaktweg ergänzen",
      detail: "Telefonnummer oder E-Mail ergänzen, bevor weitere Vertriebs- oder Serviceaktionen geplant werden.",
    };
  } else if (lastContactMs === 0) {
    nextBestAction = {
      key: "document_contact",
      label: "Kundenkontakt durchführen",
      detail: "Ersten direkten Kontakt dokumentieren und dabei nächsten Schritt sowie Bedarf festhalten.",
    };
  } else if (openOpportunities.length > 0) {
    const top = [...openOpportunities].sort((a, b) => {
      const weight = { critical: 0, high: 1, normal: 2, low: 3 } as Record<string, number>;
      return (weight[a.priority] ?? 2) - (weight[b.priority] ?? 2);
    })[0];
    nextBestAction = {
      key: "advance_opportunity",
      label: "Opportunity qualifizieren",
      detail: "Offenes Potenzial: " + (top?.topic ?? "Kundenbedarf") + ". Nächsten verbindlichen Schritt oder Prüftermin festlegen.",
    };
  } else if (retention.status === "due") {
    nextBestAction = {
      key: "retention_review",
      label: "Bestandscheck durchführen",
      detail: retention.detail,
    };
  } else if (crossSellSignals.length > 0) {
    nextBestAction = {
      key: "needs_review",
      label: "Bedarf ganzheitlich prüfen",
      detail: "Noch nicht abgedeckte Bereiche im CRM: " + crossSellSignals.slice(0, 3).join(", ") + ". Nur bei tatsächlichem Bedarf als Opportunity erfassen.",
    };
  } else if (input.referralCount === 0 && activeOrders.length > 0) {
    nextBestAction = {
      key: "referral_check",
      label: "Empfehlungspotenzial prüfen",
      detail: "Bei passender Kundenzufriedenheit kann nach einer Empfehlung gefragt werden; ohne Druck und nur im passenden Gespräch.",
    };
  } else {
    nextBestAction = {
      key: "relationship_maintain",
      label: "Kundenbeziehung pflegen",
      detail: "Akte ist aktuell sauber. Nächsten regulären Bestandskontakt im Blick behalten.",
    };
  }

  const severityOrder = { critical: 0, high: 1, normal: 2 } as const;
  riskFlags.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const tone: CustomerIntelligence["tone"] = riskFlags.some((flag) => flag.severity === "critical")
    ? "critical"
    : riskFlags.some((flag) => flag.severity === "high")
      ? "high"
      : riskFlags.length > 0
        ? "normal"
        : completeness >= 80
          ? "good"
          : "normal";

  return {
    tone,
    completeness,
    missing,
    nextBestAction,
    retention,
    riskFlags,
    coverage: {
      activeCategories,
      openOpportunityTopics: openOpportunities.map((item) => item.topic),
      crossSellSignals,
    },
    summary: {
      activeOrders: activeOrders.length,
      openOpportunities: openOpportunities.length,
      overdueTasks: overdueTasks.length,
      activities: input.activities.length,
      referrals: input.referralCount,
      lastContactAt,
    },
  };
}
