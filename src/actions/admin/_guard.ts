import "server-only";
import { z } from "zod";
import { assertAdmin, AuthzError, type SessionUser } from "@/lib/authz";
import { logger } from "@/lib/logger";
import type { FormState } from "@/lib/action-result";
import { AdminInputError } from "@/server/admin/products";
import { OrderActionError } from "@/server/orders/orders";
import { UploadError } from "@/server/storage";

/**
 * Wraps every admin mutation: authorizes on the server (the admin layout guard
 * is not trusted on its own) and turns known errors into form feedback.
 */
export async function withAdmin(fn: (admin: SessionUser) => Promise<FormState>): Promise<FormState> {
  let admin: SessionUser;
  try {
    admin = await assertAdmin();
  } catch (e) {
    if (e instanceof AuthzError) return { ok: false, error: "אין הרשאה לבצע פעולה זו" };
    throw e;
  }
  try {
    return await fn(admin);
  } catch (e) {
    if (e instanceof AdminInputError) return { ok: false, error: e.message, fieldErrors: e.field ? { [e.field]: [e.message] } : undefined };
    if (e instanceof OrderActionError || e instanceof UploadError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) return { ok: false, error: "יש לתקן את השדות המסומנים", fieldErrors: zodFieldErrors(e) };
    // Let Next.js redirect/notFound control-flow errors pass through.
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
    logger.error("admin.action_failed", { error: e });
    return { ok: false, error: "אירעה שגיאה. הפעולה לא בוצעה" };
  }
}

export function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "form";
    (out[key] ??= []).push(issue.message);
    const top = String(issue.path[0] ?? "form");
    if (top !== key) (out[top] ??= []).push(issue.message);
  }
  return out;
}

export const bool = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "true";
export const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : undefined;
};
