// One decimal place, 1..10. Normalize a decimal comma for mobile keyboards.
export function isWorkRating(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 10
    && Number(value.toFixed(1)) === value;
}
export function parseWorkRating(value: string): number | null {
  const clean = value.trim().replace(",", ".");
  if (!/^(?:[1-9](?:\.\d)?|10(?:\.0)?)$/.test(clean)) return null;
  const number = Number(clean);
  return isWorkRating(number) ? number : null;
}
