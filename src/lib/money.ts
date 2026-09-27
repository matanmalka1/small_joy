/** All money is integer agorot. These helpers are the only place conversions happen. */

const whole = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₪49 for whole shekels, ₪49.90 otherwise. */
export function formatPrice(agorot: number): string {
  return (agorot % 100 === 0 ? whole : cents).format(agorot / 100);
}

/** Parses a user-entered shekel amount ("12.90", "12,9", "₪12") into agorot. Returns null if invalid. */
export function parseShekels(input: string): number | null {
  const cleaned = input.replace(/[₪\s]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** agorot → "12.90" for form inputs. */
export function toShekelInput(agorot: number | null | undefined): string {
  if (agorot == null) return "";
  const whole = Math.floor(agorot / 100);
  const frac = agorot % 100;
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, "0")}`;
}

/** Percentage of an agorot amount, rounded half-up to a whole agora. */
export function percentOf(agorot: number, percent: number): number {
  return Math.round((agorot * percent) / 100);
}
