"use server";

import { z } from "zod";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimitByIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { FormState } from "@/lib/action-result";
import { forgotSchema, loginSchema, registerSchema, resetSchema, safeNext } from "@/lib/validation/auth";
import { CART_COOKIE, mergeGuestCart } from "@/server/cart/cart";

const TOO_MANY = { ok: false, error: "יותר מדי ניסיונות. נסו שוב בעוד מספר דקות" } as const;

async function afterSignIn(userId: string) {
  const jar = await cookies();
  await mergeGuestCart(jar.get(CART_COOKIE)?.value, userId);
  jar.delete(CART_COOKIE);
}

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: "יש לתקן את השדות המסומנים", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (!(await rateLimitByIp("login", 10, 300))) return TOO_MANY;
  try {
    const res = await auth().api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password },
      headers: await headers(),
    });
    await afterSignIn(res.user.id);
  } catch (e) {
    if (e instanceof APIError) return { ok: false, error: "דוא״ל או סיסמה שגויים" };
    logger.error("auth.login_failed", { error: e });
    return { ok: false, error: "אירעה שגיאה, נסו שוב" };
  }
  redirect(safeNext(parsed.data.next));
}

export async function registerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: "יש לתקן את השדות המסומנים", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (!(await rateLimitByIp("register", 5, 600))) return TOO_MANY;
  try {
    const res = await auth().api.signUpEmail({
      body: { name: parsed.data.name, email: parsed.data.email, password: parsed.data.password },
      headers: await headers(),
    });
    await db.customerProfile.upsert({ where: { userId: res.user.id }, update: {}, create: { userId: res.user.id } });
    // Guest orders are NOT linked by email here: without verified email ownership
    // that would expose another person's orders.
    await afterSignIn(res.user.id);
  } catch (e) {
    if (e instanceof APIError) {
      // Do not reveal whether the email exists beyond what's necessary for UX.
      return { ok: false, error: "לא ניתן להשלים את ההרשמה. ייתכן שכבר קיים חשבון עם כתובת זו – נסו להתחבר או לאפס סיסמה" };
    }
    logger.error("auth.register_failed", { error: e });
    return { ok: false, error: "אירעה שגיאה, נסו שוב" };
  }
  redirect(safeNext(parsed.data.next));
}

export async function logoutAction() {
  await auth().api.signOut({ headers: await headers() });
  redirect("/");
}

export async function forgotPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = forgotSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (!(await rateLimitByIp("forgot", 3, 900))) return TOO_MANY;
  try {
    await auth().api.requestPasswordReset({ body: { email: parsed.data.email, redirectTo: "/account/reset-password" }, headers: await headers() });
  } catch (e) {
    logger.warn("auth.forgot_failed", { error: e });
  }
  // Same response whether or not the account exists (no user enumeration).
  return { ok: true, message: "אם קיים חשבון עם כתובת זו, נשלח אליו קישור לאיפוס סיסמה." };
}

export async function resetPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: "יש לתקן את השדות המסומנים", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (!(await rateLimitByIp("reset", 10, 900))) return TOO_MANY;
  try {
    await auth().api.resetPassword({ body: { token: parsed.data.token, newPassword: parsed.data.password }, headers: await headers() });
  } catch {
    return { ok: false, error: "הקישור אינו תקף או שפג תוקפו. יש לבקש קישור חדש" };
  }
  redirect("/account/login?reset=1");
}
