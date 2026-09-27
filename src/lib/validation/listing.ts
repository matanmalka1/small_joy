import { z } from "zod";
import { parseShekels } from "@/lib/money";

const shekels = z
  .string()
  .optional()
  .transform((v) => (v ? parseShekels(v) ?? undefined : undefined));

export const listingParamsSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  sort: z.enum(["new", "price-asc", "price-desc", "name"]).optional().catch(undefined),
  min: shekels.catch(undefined),
  max: shekels.catch(undefined),
  stock: z.enum(["1"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).optional().catch(undefined),
});

export type ListingParams = z.infer<typeof listingParamsSchema>;

/** Next passes string | string[] | undefined; keep first value only. */
export function firstValues(sp: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) out[k] = Array.isArray(v) ? v[0] : v;
  return out;
}
