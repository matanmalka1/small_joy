"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/server/payments/providers";
import { buildMockWebhook, MOCK_SIGNATURE_HEADER } from "@/server/payments/providers/mock";
import { handlePaymentWebhook } from "@/server/payments/webhook";
import { logger } from "@/lib/logger";

/**
 * SANDBOX ONLY. Simulates the provider's decision and delivers a signed
 * webhook through the same verification + processing code as production.
 */
export async function sandboxDecisionAction(fd: FormData) {
  const provider = getPaymentProvider("mock"); // throws in production unless explicitly allowed
  const paymentId = String(fd.get("paymentId") ?? "");
  const decision = fd.get("decision") === "approve" ? "approve" : "decline";
  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!payment || payment.provider !== provider.id) redirect("/");

  const returnUrl = `/checkout/return?order=${payment.order.id}&token=${payment.order.accessToken}`;
  if (payment.status !== "CREATED") redirect(returnUrl);

  const { body, signature } = buildMockWebhook(env().MOCK_PAYMENT_WEBHOOK_SECRET!, {
    id: `evt_${randomUUID()}`,
    type: decision === "approve" ? "payment.succeeded" : "payment.failed",
    payment_reference: payment.id,
    transaction_id: decision === "approve" ? `mock_txn_${randomUUID()}` : null,
    amount: payment.amount,
    currency: "ILS",
    failure_reason: decision === "approve" ? undefined : "card_declined",
  });
  const outcome = await handlePaymentWebhook(provider.id, body, new Headers({ [MOCK_SIGNATURE_HEADER]: signature }));
  logger.info("sandbox.decision", { paymentId, decision, outcome: outcome.result });
  redirect(returnUrl);
}

export async function sandboxCancelAction(fd: FormData) {
  getPaymentProvider("mock");
  const payment = await db.payment.findUnique({ where: { id: String(fd.get("paymentId") ?? "") }, include: { order: true } });
  if (!payment) redirect("/");
  redirect(`/checkout/return?order=${payment.order.id}&token=${payment.order.accessToken}`);
}
