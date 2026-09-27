/** Variant attribute helpers — safe to import from client components. */

export type VariantOptions = Record<string, string>;

export type ProductKindKey = "GENERAL" | "BEDDING" | "DISPOSABLE" | "HOUSEWARE";

/** Suggested attributes per product type (admin form hints + storefront ordering). */
export const KIND_ATTRIBUTES: Record<ProductKindKey, string[]> = {
  BEDDING: ["מידה", "צבע", "סוג בד"],
  DISPOSABLE: ["כמות באריזה", "צבע", "חומר"],
  HOUSEWARE: ["מידות", "נפח", "חומר"],
  GENERAL: ["צבע", "גודל"],
};

export const KIND_LABELS: Record<ProductKindKey, string> = {
  GENERAL: "כללי",
  BEDDING: "מצעים וטקסטיל",
  DISPOSABLE: "חד־פעמי",
  HOUSEWARE: "כלי בית ומטבח",
};

export function variantLabel(options: VariantOptions | null | undefined): string {
  if (!options) return "";
  const order = Object.values(KIND_ATTRIBUTES).flat();
  const rank = (k: string) => (order.includes(k) ? order.indexOf(k) : order.length);
  return Object.entries(options)
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

/** Attribute names across variants, in first-seen order, with their distinct values. */
export function optionMatrix(
  variants: { options: VariantOptions }[],
  preferredOrder: string[] = [],
): { name: string; values: string[] }[] {
  const map = new Map<string, string[]>();
  for (const v of variants) {
    for (const [k, val] of Object.entries(v.options)) {
      if (!val) continue;
      const list = map.get(k) ?? [];
      if (!list.includes(val)) list.push(val);
      map.set(k, list);
    }
  }
  // jsonb does not preserve key order, so sort by the product type's attribute order.
  const rank = (k: string) => (preferredOrder.includes(k) ? preferredOrder.indexOf(k) : preferredOrder.length);
  return [...map.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([name, values]) => ({ name, values }));
}

/** Parses "מידה=זוגי; צבע=לבן" (CSV format) into an options object. */
export function parseOptionsString(input: string): VariantOptions {
  const out: VariantOptions = {};
  for (const part of input.split(";")) {
    const [k, ...rest] = part.split("=");
    const key = k?.trim();
    const value = rest.join("=").trim();
    if (key && value) out[key] = value;
  }
  return out;
}

export function optionsToString(options: VariantOptions): string {
  return Object.entries(options)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}
