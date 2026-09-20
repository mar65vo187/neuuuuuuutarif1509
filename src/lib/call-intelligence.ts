export const CALL_REACHED_PERSON_LABELS = {
  customer: "Kunde / Lead selbst",
  partner_family: "Partner / Familie",
  colleague: "Kollege / Mitarbeiter",
  gatekeeper: "Empfang / Assistenz",
  voicemail: "Mailbox",
  nobody: "Niemand erreicht",
  wrong_number: "Falsche Nummer",
  other: "Andere Person",
} as const;

export const CALL_REACTION_LABELS = {
  very_interested: "Sehr interessiert",
  interested: "Interessiert",
  neutral: "Neutral / offen",
  hesitant: "Unsicher / zögerlich",
  busy: "Gerade keine Zeit",
  callback_requested: "Rückruf gewünscht",
  appointment_agreed: "Termin vereinbart",
  no_answer: "Keine Antwort",
  annoyed: "Genervt / ablehnend",
  not_interested: "Kein Interesse",
  do_not_contact: "Nicht mehr kontaktieren",
} as const;

export type CallReachedPerson = keyof typeof CALL_REACHED_PERSON_LABELS;
export type CallReaction = keyof typeof CALL_REACTION_LABELS;
export type CallRecommendedAction = "call_again" | "appointment" | "no_auto_call";

export type FollowUpRecommendation = {
  at: Date | null;
  reason: string;
  action: CallRecommendedAction;
  contactOutcome: "reached" | "no_answer" | "callback" | "voicemail" | "wrong_number" | "not_interested";
};

const BERLIN = "Europe/Berlin";

function berlinParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BERLIN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute") };
}

function berlinLocalToUtc(year: number, month: number, day: number, hour: number, minute: number) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const observed = berlinParts(new Date(guess));
  const observedAsUtc = Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute);
  return new Date(guess - (observedAsUtc - guess));
}

function suggestedSlot(base: Date, addDays: number, preferredHour?: number) {
  const p = berlinParts(base);
  const anchor = new Date(Date.UTC(p.year, p.month - 1, p.day, 12));
  anchor.setUTCDate(anchor.getUTCDate() + addDays);
  let weekday = anchor.getUTCDay();
  if (weekday === 0) {
    anchor.setUTCDate(anchor.getUTCDate() + 1);
    weekday = 1;
  }
  const hour = preferredHour ?? (p.hour < 14 ? 17 : 10);
  const safeHour = weekday === 6 ? Math.min(Math.max(hour, 10), 14) : Math.min(Math.max(hour, 9), 18);
  return berlinLocalToUtc(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, anchor.getUTCDate(), safeHour, safeHour === 17 ? 30 : 0);
}

export function recommendLeadFollowUp(input: {
  calledAt: Date;
  reachedPerson: CallReachedPerson;
  reaction: CallReaction;
  attemptNumber: number;
  requestedCallbackAt?: Date | null;
}): FollowUpRecommendation {
  const { calledAt, reachedPerson, reaction, attemptNumber, requestedCallbackAt } = input;

  if (reachedPerson === "wrong_number") {
    return { at: null, reason: "Falsche Nummer dokumentiert. Erst Kontaktdaten prüfen, bevor ein neuer Anruf geplant wird.", action: "no_auto_call", contactOutcome: "wrong_number" };
  }
  if (reaction === "do_not_contact") {
    return { at: null, reason: "Kontakt wünscht keine weiteren Anrufe. Es wird bewusst keine Wiedervorlage angelegt.", action: "no_auto_call", contactOutcome: "not_interested" };
  }
  if (reaction === "not_interested" || reaction === "annoyed") {
    return { at: null, reason: "Keine automatische Wiedervorlage. Nur bei einem neuen, nachvollziehbaren Anlass erneut kontaktieren.", action: "no_auto_call", contactOutcome: "not_interested" };
  }
  if (reaction === "appointment_agreed") {
    return { at: null, reason: "Termin wurde vereinbart. Jetzt die konkrete Terminzeit im Lead speichern statt einen weiteren Rückruf zu planen.", action: "appointment", contactOutcome: "reached" };
  }
  if (requestedCallbackAt && requestedCallbackAt.getTime() > calledAt.getTime()) {
    return { at: requestedCallbackAt, reason: "Der gewünschte Rückrufzeitpunkt des Kontakts hat Vorrang und wurde als nächste Aktion übernommen.", action: "call_again", contactOutcome: "callback" };
  }
  if (reaction === "callback_requested") {
    return { at: suggestedSlot(calledAt, 1), reason: "Rückruf wurde gewünscht. Ohne konkrete Uhrzeit wird für den nächsten sinnvollen Kontaktzeitraum geplant.", action: "call_again", contactOutcome: "callback" };
  }
  if (reaction === "busy") {
    return { at: suggestedSlot(calledAt, 1), reason: "Kontakt war beschäftigt. Der nächste Versuch wird bewusst in ein anderes Zeitfenster gelegt.", action: "call_again", contactOutcome: "callback" };
  }
  if (reachedPerson === "voicemail") {
    return { at: suggestedSlot(calledAt, 2), reason: "Mailbox erreicht. Ein kurzer Abstand verhindert unnötige Mehrfachanrufe und hält den Lead trotzdem aktiv.", action: "call_again", contactOutcome: "voicemail" };
  }
  if (reachedPerson === "nobody" || reaction === "no_answer") {
    if (attemptNumber >= 5) {
      return { at: null, reason: "Mehrere erfolglose Versuche dokumentiert. Keine automatische weitere Anrufserie; Kontaktdaten oder einen anderen zulässigen Kontaktweg prüfen.", action: "no_auto_call", contactOutcome: "no_answer" };
    }
    const days = attemptNumber <= 1 ? 1 : attemptNumber === 2 ? 2 : attemptNumber === 3 ? 4 : 7;
    return { at: suggestedSlot(calledAt, days), reason: `Versuch ${attemptNumber} ohne Kontakt. Der nächste Versuch wird mit Abstand und in einem anderen Zeitfenster geplant.`, action: "call_again", contactOutcome: "no_answer" };
  }
  if (reachedPerson === "partner_family" || reachedPerson === "colleague" || reachedPerson === "gatekeeper" || reachedPerson === "other") {
    return { at: suggestedSlot(calledAt, 1), reason: "Nicht die Zielperson erreicht. Ein neuer Versuch wird für den nächsten Tag in einem anderen Zeitfenster eingeplant.", action: "call_again", contactOutcome: "callback" };
  }
  if (reaction === "very_interested") {
    return { at: suggestedSlot(calledAt, 1, 10), reason: "Sehr hohes Interesse erkannt. Kurzer, verbindlicher Folgekontakt innerhalb eines Tages hält den Prozess in Bewegung.", action: "call_again", contactOutcome: "reached" };
  }
  if (reaction === "interested") {
    return { at: suggestedSlot(calledAt, 2), reason: "Interesse vorhanden. Ein zeitnaher Folgekontakt mit etwas Abstand ist sinnvoll.", action: "call_again", contactOutcome: "reached" };
  }
  if (reaction === "hesitant") {
    return { at: suggestedSlot(calledAt, 5), reason: "Kontakt ist noch unsicher. Mehr Abstand vor dem nächsten Gespräch reduziert Druck und schafft Raum für eine Entscheidung.", action: "call_again", contactOutcome: "reached" };
  }

  return { at: suggestedSlot(calledAt, 3), reason: "Neutraler Kontakt. Ein erneuter Versuch nach einigen Tagen hält den Lead aktiv, ohne unnötig eng nachzufassen.", action: "call_again", contactOutcome: "reached" };
}
