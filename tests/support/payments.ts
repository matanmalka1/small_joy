import { randomUUID } from "node:crypto";
import { buildMockWebhook, MOCK_SIGNATURE_HEADER, type MockWebhookPayload } from "@/server/payments/providers/mock";
import { handlePaymentWebhook } from "@/server/payments/webhook";

/** Sends a correctly signed sandbox webhook through the real verification path. */
export async function sendWebhook(payload: Partial<MockWebhookPayload> & Pick<MockWebhookPayload, "payment_reference" | "amount">, secret = process.env.MOCK_PAYMENT_WEBHOOK_SECRET!) {
  const full: MockWebhookPayload = {
    id: payload.id ?? `evt_${randomUUID()}`,
    type: payload.type ?? "payment.succeeded",
    payment_reference: payload.payment_reference,
    transaction_id: payload.transaction_id === undefined ? `txn_${randomUUID()}` : payload.transaction_id,
    amount: payload.amount,
    currency: payload.currency ?? "ILS",
    failure_reason: payload.failure_reason,
  };
  const { body, signature } = buildMockWebhook(secret, full);
  return { event: full, outcome: await handlePaymentWebhook("mock", body, new Headers({ [MOCK_SIGNATURE_HEADER]: signature })) };
}
