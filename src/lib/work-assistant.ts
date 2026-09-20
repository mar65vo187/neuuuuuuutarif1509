import type { CommandCenterData, FocusItem } from "@/lib/portal-command-center";

export type WorkAssistantSuggestion = {
  key: string;
  priority: FocusItem["priority"];
  kind: FocusItem["kind"];
  title: string;
  reason: string;
  recommendation: string;
  href: string;
  entityType: FocusItem["entityType"];
  entityId: number;
  canCreateTask: boolean;
  taskTitle: string;
  taskDescription: string;
  dueMinutes: number;
};

const KIND_LABEL: Record<FocusItem["kind"], string> = {
  lead: "Lead",
  task: "Aufgabe",
  order: "Auftrag",
  customer: "Kunde",
};

function recommendation(item: FocusItem) {
  if (item.kind === "lead") return "Lead-Akte öffnen, Kontaktstatus prüfen und einen konkreten nächsten Schritt mit Termin dokumentieren.";
  if (item.kind === "order") return "Auftrag öffnen, Blockade oder Provider-Status prüfen und die nächste verantwortliche Aktion festhalten.";
  if (item.kind === "customer") return "Customer-360-Akte öffnen, aktuellen Bedarf bzw. Bestandscheck durchführen und nächsten Review terminieren.";
  return "Bestehende Aufgabe öffnen, bearbeiten oder nachvollziehbar neu terminieren.";
}

function taskTitle(item: FocusItem) {
  if (item.kind === "lead") return "Lead priorisiert prüfen: " + item.title;
  if (item.kind === "order") return "Auftrag priorisiert prüfen: " + item.title;
  if (item.kind === "customer") return "Kundenakte priorisiert prüfen: " + item.title;
  return item.title;
}

export function buildWorkAssistant(data: CommandCenterData): WorkAssistantSuggestion[] {
  return data.focus.slice(0, 20).map((item) => ({
    key: item.key,
    priority: item.priority,
    kind: item.kind,
    title: item.title,
    reason: KIND_LABEL[item.kind] + " · " + item.subtitle,
    recommendation: recommendation(item),
    href: item.href,
    entityType: item.entityType,
    entityId: item.entityId,
    canCreateTask: item.kind !== "task" && item.entityType !== "general" && item.entityId > 0,
    taskTitle: taskTitle(item),
    taskDescription: "Vom TarifWerk Arbeitsassistenten vorgeschlagen. Grund: " + item.subtitle,
    dueMinutes: item.priority === "critical" ? 0 : item.priority === "high" ? 120 : 1440,
  }));
}
