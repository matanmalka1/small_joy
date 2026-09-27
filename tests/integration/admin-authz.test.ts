import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthzError, type SessionUser } from "@/lib/authz";

// Simulate who is logged in for server actions.
let currentUser: SessionUser | null = null;
vi.mock("@/lib/authz", async (orig) => {
  const actual = await orig<typeof import("@/lib/authz")>();
  return {
    ...actual,
    getCurrentUser: async () => currentUser,
    assertAdmin: async () => {
      if (!currentUser) throw new actual.AuthzError("UNAUTHENTICATED");
      if (currentUser.role !== "ADMIN") throw new actual.AuthzError("FORBIDDEN");
      return currentUser;
    },
  };
});
vi.mock("next/cache", () => ({ revalidatePath: () => undefined, revalidateTag: () => undefined }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;${url}` });
  },
  notFound: () => {
    throw Object.assign(new Error("NEXT_NOT_FOUND"), { digest: "NEXT_NOT_FOUND" });
  },
}));

const { db } = await import("@/lib/db");
const { resetDb } = await import("../support/db");
const { saveCategoryAction, saveCouponAction } = await import("@/actions/admin/catalog");
const { adjustStockAction, saveSettingsAction } = await import("@/actions/admin/operations");
const { deleteProductAction } = await import("@/actions/admin/products");

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

beforeEach(async () => {
  await resetDb();
  currentUser = null;
});

describe("admin authorization on server actions", () => {
  it("rejects anonymous and customer users on every admin mutation", async () => {
    for (const user of [null, { id: "c1", email: "c@x.com", name: "c", role: "CUSTOMER" as const }]) {
      currentUser = user;
      expect(await saveCategoryAction(null, fd({ name: "קטגוריה" }))).toMatchObject({ ok: false, error: "אין הרשאה לבצע פעולה זו" });
      expect(await saveCouponAction(null, fd({ code: "HACK", type: "PERCENT", value: "100", scope: "ALL", isActive: "on" }))).toMatchObject({ ok: false });
      expect(await saveSettingsAction(null, fd({ storeName: "x", addressLine: "y", lowStockDefault: "1" }))).toMatchObject({ ok: false });
      expect(await adjustStockAction(null, fd({ variantId: "v", quantity: "999" }))).toMatchObject({ ok: false });
      await expect(deleteProductAction(fd({ productId: "p" }))).rejects.toBeInstanceOf(AuthzError);
    }
    expect(await db.category.count()).toBe(0);
    expect(await db.coupon.count()).toBe(0);
  });

  it("allows an admin", async () => {
    currentUser = { id: "a1", email: "a@x.com", name: "a", role: "ADMIN" };
    expect(await saveCategoryAction(null, fd({ name: "מצעים חדשים", isActive: "on" }))).toMatchObject({ ok: true });
    expect(await db.category.count()).toBe(1);
  });

  it("validates admin input on the server", async () => {
    currentUser = { id: "a1", email: "a@x.com", name: "a", role: "ADMIN" };
    const res = await saveCouponAction(null, fd({ code: "BAD CODE!", type: "PERCENT", value: "150", scope: "ALL" }));
    expect(res).toMatchObject({ ok: false });
    expect(res?.fieldErrors?.code).toBeDefined();
  });
});
