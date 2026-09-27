import "server-only";
import { db, type Tx } from "@/lib/db";
import type { InventoryReason } from "@/generated/prisma/client";

export class InsufficientStockError extends Error {
  constructor(public readonly variantId: string) {
    super(`Insufficient stock for variant ${variantId}`);
  }
}

/**
 * Atomically decrements stock only if enough is available. The conditional
 * UPDATE is what prevents overselling under concurrent orders: two
 * transactions cannot both take the last unit.
 */
export async function decrementStock(tx: Tx, variantId: string, quantity: number, meta: { orderId?: string; reason?: InventoryReason; note?: string; actorId?: string }) {
  const res = await tx.productVariant.updateMany({
    where: { id: variantId, stockQuantity: { gte: quantity } },
    data: { stockQuantity: { decrement: quantity } },
  });
  if (res.count !== 1) throw new InsufficientStockError(variantId);
  await tx.inventoryMovement.create({
    data: { variantId, delta: -quantity, reason: meta.reason ?? "SALE", orderId: meta.orderId, note: meta.note, actorId: meta.actorId },
  });
}

export async function incrementStock(tx: Tx, variantId: string, quantity: number, meta: { orderId?: string; reason: InventoryReason; note?: string; actorId?: string }) {
  await tx.productVariant.update({ where: { id: variantId }, data: { stockQuantity: { increment: quantity } } });
  await tx.inventoryMovement.create({ data: { variantId, delta: quantity, reason: meta.reason, orderId: meta.orderId, note: meta.note, actorId: meta.actorId } });
}

/** Admin manual adjustment. Sets an absolute quantity and records the delta. */
export async function setStockLevel(variantId: string, newQuantity: number, note: string | undefined, actorId: string) {
  if (!Number.isInteger(newQuantity) || newQuantity < 0) throw new Error("Invalid quantity");
  return db.$transaction(async (tx) => {
    const [row] = await tx.$queryRaw<{ stockQuantity: number }[]>`
      SELECT "stockQuantity" FROM "ProductVariant" WHERE id = ${variantId} FOR UPDATE`;
    if (!row) throw new Error("Variant not found");
    const delta = newQuantity - row.stockQuantity;
    if (delta === 0) return 0;
    await tx.productVariant.update({ where: { id: variantId }, data: { stockQuantity: newQuantity } });
    await tx.inventoryMovement.create({ data: { variantId, delta, reason: "ADJUSTMENT", note, actorId } });
    return delta;
  });
}

/** Returns an order's committed stock exactly once (guarded by stockReleasedAt). */
export async function releaseOrderStock(tx: Tx, orderId: string, reason: "CANCEL_RESTOCK" | "REFUND_RESTOCK", actorId?: string) {
  const claimed = await tx.order.updateMany({
    where: { id: orderId, stockCommittedAt: { not: null }, stockReleasedAt: null },
    data: { stockReleasedAt: new Date() },
  });
  if (claimed.count !== 1) return false;
  const items = await tx.orderItem.findMany({ where: { orderId, variantId: { not: null } } });
  for (const item of items) {
    await incrementStock(tx, item.variantId!, item.quantity, { orderId, reason, actorId });
  }
  return true;
}

/** Keeps Product.priceFrom (used for sorting / price filter) in sync with variants. */
export async function refreshProductPriceFrom(client: Tx | typeof db, productId: string) {
  const variants = await client.productVariant.findMany({ where: { productId, isActive: true }, select: { price: true, salePrice: true } });
  const priceFrom = variants.length ? Math.min(...variants.map((v) => (v.salePrice != null && v.salePrice < v.price ? v.salePrice : v.price))) : 0;
  await client.product.update({ where: { id: productId }, data: { priceFrom } });
}
