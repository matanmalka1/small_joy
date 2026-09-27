import { describe, expect, it } from "vitest";
import { allowedAdminTransitions, canTransition } from "@/server/orders/status";
import { formatPrice, parseShekels, percentOf, toShekelInput } from "@/lib/money";
import { safeNext } from "@/lib/validation/auth";
import { _redactForTests } from "@/lib/logger";
import { slugify } from "@/lib/slug";
import { optionMatrix, parseOptionsString, variantLabel } from "@/server/catalog/options";
import { checkoutSchema } from "@/lib/validation/checkout";

describe("order status machine", () => {
  it("never allows an admin to mark an order paid", () => {
    expect(canTransition("PENDING_PAYMENT", "PAID", "PICKUP")).toBe(false);
  });
  it("allows cancel before completion but not after", () => {
    expect(canTransition("PAID", "CANCELLED", "DELIVERY")).toBe(true);
    expect(canTransition("COMPLETED", "CANCELLED", "DELIVERY")).toBe(false);
    expect(canTransition("CANCELLED", "PAID", "DELIVERY")).toBe(false);
  });
  it("respects fulfillment type", () => {
    expect(allowedAdminTransitions("PAID", "PICKUP")).not.toContain("SHIPPED");
    expect(allowedAdminTransitions("PAID", "DELIVERY")).not.toContain("READY_FOR_PICKUP");
  });
});

describe("money", () => {
  it("parses shekel input into integer agorot without floats", () => {
    expect(parseShekels("12.9")).toBe(1290);
    expect(parseShekels("12,90")).toBe(1290);
    expect(parseShekels("₪ 0.1")).toBe(10);
    expect(parseShekels("19.99")).toBe(1999);
    expect(parseShekels("1.005")).toBeNull();
    expect(parseShekels("-3")).toBeNull();
    expect(parseShekels("abc")).toBeNull();
  });
  it("formats", () => {
    expect(toShekelInput(1290)).toBe("12.90");
    expect(toShekelInput(1200)).toBe("12");
    expect(formatPrice(1290)).toContain("12.90");
    expect(formatPrice(1200)).not.toContain(".");
    expect(percentOf(1999, 33)).toBe(660);
  });
});

describe("security helpers", () => {
  it("only allows same-site relative redirects", () => {
    expect(safeNext("/account/orders")).toBe("/account/orders");
    expect(safeNext("https://evil.com")).toBe("/account");
    expect(safeNext("//evil.com")).toBe("/account");
    expect(safeNext("/\\evil.com")).toBe("/account");
  });
  it("redacts secrets and payment data from logs", () => {
    const out = _redactForTests({ password: "x", nested: { cardNumber: "4111", token: "t", ok: 1 }, authorization: "Bearer" }) as Record<string, unknown>;
    expect(out.password).toBe("[redacted]");
    expect(out.authorization).toBe("[redacted]");
    expect(out.nested).toEqual({ cardNumber: "[redacted]", token: "[redacted]", ok: 1 });
  });
});

describe("catalog helpers", () => {
  it("slugifies Hebrew into ASCII", () => {
    expect(slugify("סט מצעים 100% כותנה")).toMatch(/^[a-z0-9-]+$/);
    expect(slugify("Hello World!")).toBe("hello-world");
  });
  it("parses and orders variant options", () => {
    expect(parseOptionsString("מידה=זוגי; צבע=לבן")).toEqual({ מידה: "זוגי", צבע: "לבן" });
    const m = optionMatrix([{ options: { צבע: "לבן", מידה: "יחיד" } }, { options: { צבע: "אפור", מידה: "יחיד" } }], ["מידה", "צבע"]);
    expect(m.map((x) => x.name)).toEqual(["מידה", "צבע"]);
    expect(m[1].values).toEqual(["לבן", "אפור"]);
    expect(variantLabel({ צבע: "לבן", מידה: "זוגי" })).toBe("מידה: זוגי · צבע: לבן");
  });
});

describe("checkout validation", () => {
  const base = { fullName: "דנה", email: "A@B.co.il", phone: "050-123-4567", shippingMethodId: "m1", acceptTerms: true };
  it("requires an address for delivery", () => {
    expect(checkoutSchema.safeParse({ ...base, fulfillment: "DELIVERY" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, fulfillment: "PICKUP" }).success).toBe(true);
  });
  it("normalizes email and phone and validates Israeli numbers", () => {
    const r = checkoutSchema.parse({ ...base, fulfillment: "PICKUP" });
    expect(r.email).toBe("a@b.co.il");
    expect(r.phone).toBe("0501234567");
    expect(checkoutSchema.safeParse({ ...base, phone: "12345", fulfillment: "PICKUP" }).success).toBe(false);
  });
  it("requires accepting the terms", () => {
    expect(checkoutSchema.safeParse({ ...base, acceptTerms: false, fulfillment: "PICKUP" }).success).toBe(false);
  });
});
