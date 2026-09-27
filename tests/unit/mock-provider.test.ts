import { describe, expect, it } from "vitest";
import { buildMockWebhook, MockPaymentProvider, MOCK_SIGNATURE_HEADER } from "@/server/payments/providers/mock";
import { WebhookVerificationError } from "@/server/payments/providers/types";

const secret = "unit-test-secret-123456";
const provider = new MockPaymentProvider(secret, "http://localhost:3000");
const payload = { id: "evt_1", type: "payment.succeeded" as const, payment_reference: "pay_1", transaction_id: "txn_1", amount: 1290, currency: "ILS" };

describe("mock provider webhook verification", () => {
  it("accepts a correctly signed webhook", async () => {
    const { body, signature } = buildMockWebhook(secret, payload);
    const ev = await provider.verifyWebhook(body, new Headers({ [MOCK_SIGNATURE_HEADER]: signature }));
    expect(ev).toMatchObject({ eventId: "evt_1", paymentId: "pay_1", amount: 1290, type: "payment.succeeded" });
  });

  it("rejects a tampered body", async () => {
    const { signature } = buildMockWebhook(secret, payload);
    const tampered = JSON.stringify({ ...payload, amount: 1 });
    await expect(provider.verifyWebhook(tampered, new Headers({ [MOCK_SIGNATURE_HEADER]: signature }))).rejects.toBeInstanceOf(WebhookVerificationError);
  });

  it("rejects a wrong secret, a missing header and a stale timestamp", async () => {
    const wrong = buildMockWebhook("another-secret-000000", payload);
    await expect(provider.verifyWebhook(wrong.body, new Headers({ [MOCK_SIGNATURE_HEADER]: wrong.signature }))).rejects.toThrow();
    await expect(provider.verifyWebhook(wrong.body, new Headers())).rejects.toThrow();
    const stale = buildMockWebhook(secret, payload, Math.floor(Date.now() / 1000) - 3600);
    await expect(provider.verifyWebhook(stale.body, new Headers({ [MOCK_SIGNATURE_HEADER]: stale.signature }))).rejects.toThrow("stale");
  });

  it("identifies itself as a sandbox", () => {
    expect(provider.isSandbox).toBe(true);
  });
});
