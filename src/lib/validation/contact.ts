import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s\-()]/g, ""))
  .pipe(z.string().regex(/^(\+972|0)([23489]|5\d|7\d)\d{7}$/, "מספר טלפון לא תקין"));

export const contactSchema = z.object({
  name: z.string().trim().min(2, "יש להזין שם").max(80),
  email: z.email("כתובת דוא״ל לא תקינה").max(120).transform((v) => v.toLowerCase()),
  phone: z.union([z.literal(""), phoneSchema]).optional(),
  message: z.string().trim().min(5, "יש לכתוב הודעה").max(2000),
  // Honeypot: must stay empty.
  website: z.string().max(0).optional(),
});
