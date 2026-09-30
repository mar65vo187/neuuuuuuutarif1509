/** Accepts German input such as "1.200", "1200,50" or "1 200 €". Returns cents, null for empty, undefined for invalid. */
export function parseEuroInput(value: string): number | null | undefined {
  const compact = value.replace(/[\s€]/g, "");
  if (!compact) return null;
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(compact)) return undefined;
  const cents = Math.round(Number(compact.replace(/\./g, "").replace(",", ".")) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 1_000_000_000) return undefined;
  return cents;
}
