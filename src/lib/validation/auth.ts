import { z } from "zod";

export const passwordSchema = z.string().min(8, "הסיסמה צריכה להכיל לפחות 8 תווים").max(128);

export const loginSchema = z.object({
  email: z.email("כתובת דוא״ל לא תקינה").transform((v) => v.toLowerCase()),
  password: z.string().min(1, "יש להזין סיסמה").max(128),
  next: z.string().optional(),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "יש להזין שם").max(80),
    email: z.email("כתובת דוא״ל לא תקינה").max(120).transform((v) => v.toLowerCase()),
    password: passwordSchema,
    confirm: z.string(),
    next: z.string().optional(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "הסיסמאות אינן תואמות" });

export const forgotSchema = z.object({ email: z.email("כתובת דוא״ל לא תקינה").transform((v) => v.toLowerCase()) });

export const resetSchema = z
  .object({ token: z.string().min(10).max(200), password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "הסיסמאות אינן תואמות" });

/** Only allow same-site relative redirects after login (prevents open redirect). */
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
