"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { rateLimitByIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { FormState } from "@/lib/action-result";
import { checkoutFromFormData, checkoutSchema } from "@/lib/validation/checkout";
import { getCurrentCart } from "@/server/cart/session";
import { checkoutCart, CheckoutError, startPayment } from "@/server/checkout/checkout";
import { getOrderForViewer } from "@/server/orders/orders";

function flatErrors(error: z.ZodError) {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path[issue.path.length - 1]?.toString() ?? "form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export async function placeOrderAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = checkoutSchema.safeParse(checkoutFromFormData(fd));
  if (!parsed.success) return { ok: false, error: "יש לתקן את השדות המסומנים", fieldErrors: flatErrors(parsed.error) };
  if (!(await rateLimitByIp("checkout", 10, 300))) return { ok: false, error: "יותר מדי ניסיונות. נסו שוב בעוד מספר דקות" };

  let redirectUrl: string;
  try {
    const [cart, user] = await Promise.all([getCurrentCart(), getCurrentUser()]);
    if (!cart) return { ok: false, error: "הסל ריק" };
    const res = await checkoutCart(cart.id, parsed.data, user);
    redirectUrl = res.redirectUrl;
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.message, fieldErrors: e.field ? { [e.field]: [e.message] } : undefined };
    logger.error("checkout.failed", { error: e });
    return { ok: false, error: "אירעה שגיאה ביצירת ההזמנה. נסו שוב" };
  }
  redirect(redirectUrl);
}

/** Retry payment for an unpaid order (after a declined card, for example). */
export async function retryPaymentAction(fd: FormData) {
  const orderId = String(fd.get("orderId") ?? "");
  const token = String(fd.get("token") ?? "");
  const user = await getCurrentUser();
  const order = await getOrderForViewer(orderId, { userId: user?.id, token });
  if (!order) redirect("/");
  if (!(await rateLimitByIp("retry-pay", 10, 300))) redirect(`/checkout/return?order=${order.id}&token=${order.accessToken}&error=rate`);
  let url: string;
  try {
    url = (await startPayment(order.id)).redirectUrl;
  } catch (e) {
    logger.warn("checkout.retry_failed", { orderId, error: e });
    redirect(`/checkout/return?order=${order.id}&token=${order.accessToken}&error=retry`);
  }
  redirect(url);
}
