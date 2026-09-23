const berlin = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/** A stable wall-clock value for datetime-local, independent of server/browser TZ. */
export function formatBerlinDateTimeInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = berlin.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

/** Add calendar days in Berlin and keep the existing 09:00 sales follow-up time. */
export function addBerlinCalendarDaysAtNine(days: number, from: Date = new Date()): string {
  if (!Number.isSafeInteger(days) || Math.abs(days) > 3650 || !Number.isFinite(from.getTime())) {
    throw new Error("Ungültiger Zeitraum für die Wiedervorlage.");
  }
  const berlinDate = formatBerlinDateTimeInput(from).slice(0, 10);
  const [year, month, day] = berlinDate.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1, day + days, 9, 0, 0, 0));
  if (!Number.isFinite(target.getTime())) throw new Error("Ungültiges Datum für die Wiedervorlage.");
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(target.getUTCDate())}T09:00`;
}

/** Never silently move a reminder through a DST gap or choose an ambiguous hour. */
export function parseBerlinDateTimeInput(value: string): string | null {
  if (!value.trim()) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error("Bitte ein vollständiges Datum mit Uhrzeit eingeben.");
  }
  const wallClock = Date.parse(`${value}:00.000Z`);
  if (!Number.isFinite(wallClock) || new Date(wallClock).toISOString().slice(0, 16) !== value) {
    throw new Error("Bitte ein gültiges Datum mit Uhrzeit eingeben.");
  }
  // Probe both sides of a possible transition, deriving offsets from Intl rather
  // than assuming the machine's time zone or hard-coding summer/winter dates.
  const candidates = new Set<number>();
  for (const hours of [-36, 0, 36]) {
    const probe = wallClock + hours * 60 * 60_000;
    const offset = Date.parse(`${formatBerlinDateTimeInput(new Date(probe))}:00.000Z`) - probe;
    const instant = wallClock - offset;
    if (formatBerlinDateTimeInput(new Date(instant)) === value) candidates.add(instant);
  }
  if (candidates.size === 0) {
    throw new Error("Diese Uhrzeit existiert wegen der Zeitumstellung in Berlin nicht. Bitte eine andere Uhrzeit wählen.");
  }
  if (candidates.size > 1) {
    throw new Error("Diese Uhrzeit kommt wegen der Zeitumstellung in Berlin zweimal vor. Bitte eine eindeutige Uhrzeit wählen.");
  }
  return new Date([...candidates][0]).toISOString();
}
