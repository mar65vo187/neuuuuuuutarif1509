export const SAFE_AUTOMATION_EVENTS = [
  "lead.created",
  "lead.status.termin_bestaetigt",
  "lead.status.in_beratung",
  "lead.status.abgeschlossen",
  "order.created",
  "order.status.submitted",
  "order.status.documents_missing",
  "order.status.accepted",
  "order.status.active",
  "order.status.storno",
  "customer.activity.created",
] as const;

export type SafeAutomationEvent = (typeof SAFE_AUTOMATION_EVENTS)[number];

export type SafeAutomationAction =
  | {
      type: "task";
      title: string;
      dueMinutes: number;
      priority: "normal" | "high" | "critical";
      taskType?: string;
      description?: string;
    }
  | {
      type: "notification";
      subject: string;
      body: string;
      priority?: "normal" | "high" | "critical";
    };

export type AutomationTemplate = {
  key: string;
  name: string;
  description: string;
  eventType: SafeAutomationEvent;
  actions: SafeAutomationAction[];
};

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    key: "new-lead-sla",
    name: "Neue Anfrage zeitnah prüfen",
    description: "Erstellt nach einem neuen Lead eine interne Aufgabe für die Erstprüfung und den nächsten konkreten Schritt.",
    eventType: "lead.created",
    actions: [{
      type: "task",
      title: "Neue Anfrage prüfen und nächsten Schritt setzen",
      dueMinutes: 15,
      priority: "high",
      taskType: "lead_first_response",
      description: "Kontaktweg, Bedarf, Zuständigkeit und nächsten Schritt prüfen und dokumentieren.",
    }],
  },
  {
    key: "appointment-quality",
    name: "Termin sauber vorbereiten",
    description: "Erinnert nach einer Terminbestätigung an die Prüfung von Bedarf, Produktbild und offenen Fragen.",
    eventType: "lead.status.termin_bestaetigt",
    actions: [{
      type: "task",
      title: "Termin vorbereiten und Lead-Akte prüfen",
      dueMinutes: 60,
      priority: "normal",
      taskType: "appointment_preparation",
      description: "Bedarf, bisherige Kontakte, Produktbild und offene Fragen vor dem Gespräch prüfen.",
    }],
  },
  {
    key: "consultation-next-step",
    name: "Beratung mit nächstem Schritt absichern",
    description: "Erinnert nach dem Start einer Beratung daran, innerhalb eines Tages einen konkreten nächsten Schritt oder eine Wiedervorlage zu dokumentieren.",
    eventType: "lead.status.in_beratung",
    actions: [{
      type: "task",
      title: "Beratung prüfen und nächsten Schritt dokumentieren",
      dueMinutes: 1440,
      priority: "normal",
      taskType: "consultation_next_step",
      description: "Gesprächsergebnis, Bedarf und nächste konkrete Aktion mit Termin in der Lead-Akte festhalten.",
    }],
  },
  {
    key: "closed-lead-handover",
    name: "Abgeschlossenen Lead sauber übergeben",
    description: "Prüft nach einem Abschluss die saubere Übergabe in Kundenakte und Auftrag, ohne selbst Daten zu verändern.",
    eventType: "lead.status.abgeschlossen",
    actions: [{
      type: "task",
      title: "Abschluss, Kundenakte und Auftrag abgleichen",
      dueMinutes: 60,
      priority: "normal",
      taskType: "closed_lead_handover",
      description: "Prüfen, ob Kunde, Auftrag, Produktzuordnung und nächster Service-Schritt vollständig dokumentiert sind.",
    }],
  },
  {
    key: "submitted-order-watch",
    name: "Eingereichten Auftrag nachverfolgen",
    description: "Erinnert einige Tage nach Einreichung daran, den Provider-Status zu prüfen, falls der Vorgang noch nicht weitergelaufen ist.",
    eventType: "order.status.submitted",
    actions: [{
      type: "task",
      title: "Provider-Status des eingereichten Auftrags prüfen",
      dueMinutes: 4320,
      priority: "normal",
      taskType: "submitted_order_follow_up",
      description: "Provider-Rückmeldung, externe Auftrags-ID und eventuell offene Schritte prüfen und dokumentieren.",
    }],
  },
  {
    key: "post-activation-care",
    name: "Aktivierung im Kundenbestand nachprüfen",
    description: "Erinnert nach einer Aktivierung an einen internen Qualitätscheck der Kundenakte und des tatsächlichen Status.",
    eventType: "order.status.active",
    actions: [{
      type: "task",
      title: "Aktivierung und Kundenakte nachprüfen",
      dueMinutes: 10080,
      priority: "normal",
      taskType: "post_activation_review",
      description: "Prüfen, ob Aktivierung, Kundenerwartung, Produktbestand und nächster Bestandscheck sauber dokumentiert sind.",
    }],
  },
  {
    key: "missing-documents",
    name: "Fehlende Unterlagen nachfassen",
    description: "Erstellt sofort eine priorisierte Aufgabe, sobald ein Auftrag wegen fehlender Unterlagen blockiert ist.",
    eventType: "order.status.documents_missing",
    actions: [{
      type: "task",
      title: "Fehlende Unterlagen mit dem Kunden klären",
      dueMinutes: 0,
      priority: "high",
      taskType: "documents_follow_up",
      description: "Fehlende Unterlagen oder Angaben identifizieren, Kontakt dokumentieren und Wiedervorlage setzen.",
    }],
  },
  {
    key: "accepted-order",
    name: "Angenommenen Auftrag weiterverfolgen",
    description: "Erinnert daran, die Aktivierung eines angenommenen Auftrags weiter im Blick zu behalten.",
    eventType: "order.status.accepted",
    actions: [{
      type: "task",
      title: "Aktivierung des angenommenen Auftrags prüfen",
      dueMinutes: 1440,
      priority: "normal",
      taskType: "activation_follow_up",
      description: "Provider-Status, Kundenerwartung und eventuell offene Aktivierungsschritte prüfen.",
    }],
  },
  {
    key: "storno-review",
    name: "Storno sofort prüfen",
    description: "Erzeugt bei einem Storno eine kritische interne Aufgabe und eine Benachrichtigung. Es wird nichts automatisch am Kunden oder Auftrag verändert.",
    eventType: "order.status.storno",
    actions: [
      {
        type: "task",
        title: "Storno prüfen und Ursache dokumentieren",
        dueMinutes: 0,
        priority: "critical",
        taskType: "storno_review",
        description: "Ursache, Provider-Rückmeldung, Kundensituation und mögliche Folgeschritte nachvollziehbar dokumentieren.",
      },
      {
        type: "notification",
        subject: "Storno prüfen",
        body: "Ein Auftrag wurde auf Storno gesetzt. Ursache und nächste Schritte bitte zeitnah prüfen.",
        priority: "critical",
      },
    ],
  },
];

export const SAFE_AUTOMATION_EVENT_LABELS: Record<SafeAutomationEvent, string> = {
  "lead.created": "Lead erstellt",
  "lead.status.termin_bestaetigt": "Termin bestätigt",
  "lead.status.in_beratung": "Lead in Beratung",
  "lead.status.abgeschlossen": "Lead abgeschlossen",
  "order.created": "Auftrag erstellt",
  "order.status.submitted": "Auftrag eingereicht",
  "order.status.documents_missing": "Unterlagen fehlen",
  "order.status.accepted": "Auftrag angenommen",
  "order.status.active": "Auftrag aktiv",
  "order.status.storno": "Storno",
  "customer.activity.created": "Kundenaktivität dokumentiert",
};
