import { NextResponse } from "next/server";
import { handlePaymentWebhook } from "@/server/payments/webhook";
import { logger } from "@/lib/logger";

/**
 * Server-to-server payment notifications. This is the ONLY place an order can
 * become "paid". The raw body is read as text so the signature can be verified.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/webhooks/payments/[provider]">) {
  const { provider } = await ctx.params;
  const rawBody = await req.text();
  if (rawBody.length > 64_000) return NextResponse.json({ error: "payload too large" }, { status: 413 });
  try {
    const outcome = await handlePaymentWebhook(provider, rawBody, req.headers);
    return NextResponse.json({ result: outcome.result }, { status: outcome.status });
  } catch (e) {
    // 5xx makes the provider retry later; processing is idempotent.
    logger.error("webhook.processing_error", { provider, error: e });
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
