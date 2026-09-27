import "server-only";
import { env } from "@/lib/env";
import { MockPaymentProvider } from "./mock";
import type { PaymentProvider } from "./types";

export class PaymentsNotConfiguredError extends Error {}

/**
 * Returns the configured provider. The mock sandbox is refused in production
 * unless PAYMENTS_ALLOW_SANDBOX=true (for staging environments only).
 */
export function getPaymentProvider(id?: string): PaymentProvider {
  const e = env();
  const which = id ?? e.PAYMENT_PROVIDER;
  switch (which) {
    case "mock": {
      if (e.NODE_ENV === "production" && e.PAYMENTS_ALLOW_SANDBOX !== "true") {
        throw new PaymentsNotConfiguredError("Mock payment provider is disabled in production");
      }
      const secret = e.MOCK_PAYMENT_WEBHOOK_SECRET;
      if (!secret) throw new PaymentsNotConfiguredError("MOCK_PAYMENT_WEBHOOK_SECRET is not set");
      return new MockPaymentProvider(secret, e.NEXT_PUBLIC_SITE_URL);
    }
    default:
      throw new PaymentsNotConfiguredError(`Unknown payment provider: ${which}`);
  }
}

/** Whether online payment can currently be offered at all. */
export function paymentsAvailable(): boolean {
  try {
    getPaymentProvider();
    return true;
  } catch {
    return false;
  }
}

export function paymentsAreSandbox(): boolean {
  try {
    return getPaymentProvider().isSandbox;
  } catch {
    return true;
  }
}
