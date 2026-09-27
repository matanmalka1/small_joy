import { z } from "zod";
import { phoneSchema } from "./contact";
import { addressSchema } from "./checkout";

export const profileSchema = z.object({
  name: z.string().trim().min(2, "יש להזין שם").max(80),
  phone: z.union([z.literal(""), phoneSchema]).optional(),
  marketingOptIn: z.boolean(),
});

export const savedAddressSchema = addressSchema.extend({
  label: z.string().trim().max(30).optional().transform((v) => v || undefined),
  fullName: z.string().trim().min(2, "יש להזין שם").max(80),
  phone: phoneSchema,
});
