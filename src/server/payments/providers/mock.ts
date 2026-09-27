import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  WebhookVerificationError,
  type CreateCheckoutInput,
  type PaymentProvider,
  type RefundInput,
  type VerifiedWebhookEvent,
} from "./types";

/**
 * DEVELOPMENT SANDBOX ONLY — NOT A REAL PAYMENT PROCESSOR. NO MONEY IS CHARGED.
 *
 * Simulates a hosted payment page (/sandbox-pay/[paymentId]) and sends
 * HMAC-SHA256 signed webhooks through the exact same verification and
 * processing path a real provider would use.
 */
export const MOCK_SIGNATURE_HEADER = "x-mock-signature";
const TOLERANCE_SECONDS = 300;

export type MockWebhookPayload = {
  id: string;
  type: VerifiedWebhookEvent["type"];
  payment_reference: string;
  transaction_id: string | null;
  amount: number;
  currency: string;
  failure_reason?: string;
};

function sign(secret: string, timestamp: number, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

/** Builds a signed webhook exactly as the sandbox "provider" would send it. */
export function buildMockWebhook(secret: string, payload: MockWebhookPayload, timestamp = Math.floor(Date.now() / 1000)) {
  const body = JSON.stringify(payload);
  return { body, signature: `t=${timestamp},v1=${sign(secret, timestamp, body)}` };
}

export class MockPaymentProvider implements PaymentProvider {
  readonly id = "mock";
  readonly displayName = "סביבת בדיקה (Sandbox)";
  readonly isSandbox = true;

  constructor(
    private readonly webhookSecret: string,
    private readonly siteUrl: string,
  ) {}

  async createCheckout(input: CreateCheckoutInput) {
    return {
      providerSessionId: `mock_sess_${randomUUID()}`,
      redirectUrl: new URL(`/sandbox-pay/${encodeURIComponent(input.paymentId)}`, this.siteUrl).toString(),
    };
  }

  async verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedWebhookEvent> {
    const header = headers.get(MOCK_SIGNATURE_HEADER) ?? "";
    const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
    const timestamp = Number(parts.t);
    const provided = parts.v1 ?? "";
    if (!timestamp || !provided) throw new WebhookVerificationError("missing signature");
    if (Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) throw new WebhookVerificationError("stale timestamp");

    const expected = sign(this.webhookSecret, timestamp, rawBody);
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new WebhookVerificationError("bad signature");

    let p: MockWebhookPayload;
    try {
      p = JSON.parse(rawBody);
    } catch {
      throw new WebhookVerificationError("invalid json");
    }
    if (!p.id || !p.type || !p.payment_reference || !Number.isInteger(p.amount)) throw new WebhookVerificationError("invalid payload");
    return {
      eventId: p.id,
      type: p.type,
      paymentId: p.payment_reference,
      providerTransactionId: p.transaction_id,
      amount: p.amount,
      currency: p.currency,
      failureReason: p.failure_reason,
    };
  }

  async refund(input: RefundInput) {
    // The sandbox always approves refunds.
    return { ok: true as const, refundId: `mock_refund_${input.idempotencyKey}` };
  }
}
