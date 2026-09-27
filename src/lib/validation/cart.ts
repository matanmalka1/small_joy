import { z } from "zod";

export const cartLineSchema = z.object({
  variantId: z.string().min(1).max(40),
  quantity: z.coerce.number().int().min(0).max(99),
});

export const couponSchema = z.object({
  code: z.string().trim().min(2, "יש להזין קוד קופון").max(40),
});
