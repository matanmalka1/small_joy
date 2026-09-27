import "server-only";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/authz";
import { CART_COOKIE, findCart, findOrCreateCart, type CartIdentity } from "./cart";

export async function currentCartIdentity(): Promise<CartIdentity & { email?: string | null }> {
  const [user, jar] = await Promise.all([getCurrentUser(), cookies()]);
  return { userId: user?.id ?? null, email: user?.email ?? null, token: jar.get(CART_COOKIE)?.value ?? null };
}

/** Read-only lookup for server components. */
export async function getCurrentCart() {
  return findCart(await currentCartIdentity());
}

/** For server actions: creates the cart (and cookie) when needed. */
export async function ensureCurrentCart() {
  const identity = await currentCartIdentity();
  const cart = await findOrCreateCart(identity);
  if (cart.created && !identity.userId) {
    (await cookies()).set(CART_COOKIE, cart.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 60,
    });
  }
  return cart;
}
