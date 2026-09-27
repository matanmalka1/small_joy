"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { contactSchema } from "@/lib/validation/contact";
import { rateLimitByIp } from "@/lib/rate-limit";
import type { FormState } from "@/lib/action-result";

export async function sendContactMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "יש לתקן את השדות המסומנים", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (!(await rateLimitByIp("contact", 5, 600))) return { ok: false, error: "נשלחו יותר מדי הודעות. נסו שוב מאוחר יותר" };
  const { name, email, phone, message } = parsed.data;
  await db.contactMessage.create({ data: { name, email, message, phone: phone || null } });
  return { ok: true, message: "תודה! ההודעה התקבלה ונחזור אליך בהקדם." };
}
