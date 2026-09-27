/**
 * Contract every payment provider adapter must implement.
 * The storefront never handles card data: customers pay on the provider's
 * hosted page, and the result is trusted ONLY via a verified server-to-server
 * webhook (never via the browser redirect).
 */

export type CreateCheckoutInput = {
  /** Our Payment row id; passed to the provider as the reference. */
  paymentId: string;
  /** Stable per payment attempt; providers that support it use it to dedupe requests. */
  idempotencyKey: string;
  orderNumber: number;
  /** Agorot. */
  amount: number;
  currency: "ILS";
  description: string;
  customer: { name: string; email: string; phone: string };
  /** Where the provider sends the customer back to (display only). */
  returnUrl: string;
  cancelUrl: string;
  /** Server-to-server notification endpoint. */
  webhookUrl: string;
};

export type CreateCheckoutResult = { providerSessionId: string; redirectUrl: string };

export type WebhookEventType = "payment.succeeded" | "payment.failed" | "refund.succeeded";

export type VerifiedWebhookEvent = {
  /** Unique per event; used to guarantee idempotent processing. */
  eventId: string;
  type: WebhookEventType;
  /** Our Payment id (the reference we sent in createCheckout). */
  paymentId: string;
  providerTransactionId: string | null;
  /** Agorot, as reported by the provider. */
  amount: number;
  currency: string;
  failureReason?: string;
};

export type RefundInput = { providerTransactionId: string; amount: number; idempotencyKey: string };
export type RefundResult = { ok: true; refundId: string } | { ok: false; error: string };

export class WebhookVerificationError extends Error {}

export interface PaymentProvider {
  readonly id: string;
  readonly displayName: string;
  /** True for development sandboxes that never move real money. */
  readonly isSandbox: boolean;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  /** Verifies authenticity (signature, timestamp) and normalizes the payload. Throws WebhookVerificationError. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedWebhookEvent>;
  refund(input: RefundInput): Promise<RefundResult>;
}
