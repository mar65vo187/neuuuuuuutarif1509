export type LeadIntelligenceInput = {
  status: string;
  priority: string;
  contactOutcome: string;
  nextActionAt: Date | string | null;
  nextActionOverdue?: boolean;
  confirmedSlot: string | null;
  phone: string | null;
  existingProductNames?: string[];
  interestProductNames?: string[];
  soldProductNames?: string[];
};

export type LeadIntelligence = {
  label: string;
  detail: string;
  tone: "critical" | "high" | "normal" | "done";
  completeness: number;
  missing: string[];
};

export function getLeadIntelligence(lead: LeadIntelligenceInput): LeadIntelligence {
  const existing = lead.existingProductNames ?? [];
  const interests = lead.interestProductNames ?? [];
  const sold = lead.soldProductNames ?? [];
  const active = !["abgeschlossen", "verloren"].includes(lead.status);
  const overdue = Boolean(lead.nextActionOverdue) || Boolean(
    active && lead.nextActionAt && new Date(lead.nextActionAt).getTime() < Date.now(),
  );

  const missing: string[] = [];
  if (!lead.phone) missing.push("Telefonnummer");
  if (active && !lead.nextActionAt && lead.status !== "termin_bestaetigt") missing.push("Wiedervorlage");
  if (existing.length + interests.length + sold.length === 0) missing.push("Produktprofil");
  if (lead.status === "termin_bestaetigt" && !lead.confirmedSlot) missing.push("Terminzeit");

  const checks = [
    Boolean(lead.phone),
    lead.contactOutcome !== "open" || lead.status === "neu",
    Boolean(lead.nextActionAt) || ["termin_bestaetigt", "abgeschlossen", "verloren"].includes(lead.status),
    existing.length + interests.length + sold.length > 0,
    lead.priority !== "normal" || lead.status !== "neu",
  ];
  const completeness = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  if (lead.status === "abgeschlossen") {
    return {
      label: sold.length ? "Bestand sichern & Folgepotenzial prüfen" : "Abschluss dokumentieren & Produkt zuordnen",
      detail: sold.length
        ? "Abschluss ist dokumentiert. Prüfe später passende weitere Themen und halte den Kundenbestand aktuell."
        : "Der Lead ist abgeschlossen, aber noch kein verkauftes Produkt ist hinterlegt.",
      tone: "done",
      completeness,
      missing,
    };
  }

  if (lead.status === "verloren") {
    return {
      label: "Kein aktiver Vertriebs-Schritt",
      detail: "Der Lead ist als nicht zustande gekommen markiert. Nur bei neuem Anlass wieder öffnen.",
      tone: "done",
      completeness,
      missing,
    };
  }

  if (overdue) {
    return {
      label: "Jetzt nachfassen",
      detail: "Die Wiedervorlage ist überfällig. Dieser Lead sollte vor neuen, nicht fälligen Kontakten bearbeitet werden.",
      tone: "critical",
      completeness,
      missing,
    };
  }

  if (lead.status === "neu") {
    return {
      label: "Erstkontakt durchführen",
      detail: lead.phone ? "Lead anrufen, Gesprächsausgang dokumentieren und direkt eine Wiedervorlage setzen." : "Telefonnummer ergänzen oder per E-Mail Kontakt aufnehmen.",
      tone: lead.priority === "hot" || lead.priority === "high" ? "high" : "normal",
      completeness,
      missing,
    };
  }

  if (lead.status === "kontaktiert") {
    if (lead.contactOutcome === "no_answer" || lead.contactOutcome === "callback" || lead.contactOutcome === "voicemail") {
      return {
        label: "Rückruf sauber terminieren",
        detail: lead.nextActionAt ? "Wiedervorlage ist gesetzt. Beim nächsten Kontakt Ergebnis und Bedarf aktualisieren." : "Lege sofort eine konkrete Wiedervorlage an, damit der Lead nicht liegen bleibt.",
        tone: lead.nextActionAt ? "normal" : "high",
        completeness,
        missing,
      };
    }
    return {
      label: "Termin oder nächsten Schritt fixieren",
      detail: "Bedarf qualifizieren, Produktprofil ergänzen und einen konkreten Termin oder nächsten Kontakt vereinbaren.",
      tone: "normal",
      completeness,
      missing,
    };
  }

  if (lead.status === "termin_bestaetigt") {
    return {
      label: "Termin vorbereiten",
      detail: interests.length
        ? `Interesse vorhanden: ${interests.slice(0, 2).join(", ")}. Bestehende Produkte und offene Fragen vor dem Termin prüfen.`
        : "Vor dem Termin Produktbestand und Interessen erfassen, damit die Beratung fokussiert startet.",
      tone: "normal",
      completeness,
      missing,
    };
  }

  return {
    label: interests.length ? "Entscheidung zum Produkt führen" : "Bedarf in konkrete Produktoption übersetzen",
    detail: interests.length
      ? `Offenes Interesse: ${interests.slice(0, 3).join(", ")}. Nächsten verbindlichen Schritt festlegen.`
      : "Produktinteresse oder bestehende Produkte erfassen und anschließend den nächsten verbindlichen Schritt festlegen.",
    tone: lead.priority === "hot" ? "high" : "normal",
    completeness,
    missing,
  };
}
