"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/action-result";
import { contentPageSchema, shippingMethodInputSchema, stockAdjustSchema, storeSettingsSchema } from "@/lib/validation/admin";
import { AdminInputError } from "@/server/admin/products";
import { setStockLevel } from "@/server/inventory/inventory";
import { changeOrderStatus, refundOrder } from "@/server/orders/orders";
import { STORE_SETTINGS_ID } from "@/server/settings/store-settings";
import type { OrderStatusKey } from "@/server/orders/status";
import { withAdmin, bool, str } from "./_guard";

// ───────────── Orders ─────────────

export async function changeOrderStatusAction(_prev: FormState, fd: FormData): Promise<FormState> {
  return withAdmin(async (admin) => {
    const orderId = str(fd, "orderId") ?? "";
    const to = str(fd, "status") as OrderStatusKey;
    await changeOrderStatus(orderId, to, admin.id);
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true, message: "הסטטוס עודכן" };
  });
}

export async function refundOrderAction(_prev: FormState, fd: FormData): Promise<FormState> {
  return withAdmin(async (admin) => {
    const orderId = str(fd, "orderId") ?? "";
    await refundOrder(orderId, { restock: bool(fd, "restock"), actorId: admin.id });
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true, message: "ההחזר בוצע" };
  });
}

export async function saveOrderNotesAction(_prev: FormState, fd: FormData): Promise<FormState> {
  return withAdmin(async () => {
    const orderId = str(fd, "orderId") ?? "";
    await db.order.update({
      where: { id: orderId },
      data: { adminNotes: (str(fd, "adminNotes") ?? "").slice(0, 2000) || null, needsAttention: bool(fd, "needsAttention") },
    });
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true, message: "נשמר" };
  });
}

// ───────────── Inventory ─────────────

export async function adjustStockAction(_prev: FormState, fd: FormData): Promise<FormState> {
  return withAdmin(async (admin) => {
    const data = stockAdjustSchema.parse({ variantId: str(fd, "variantId"), quantity: str(fd, "quantity"), note: str(fd, "note") });
    const delta = await setStockLevel(data.variantId, data.quantity, data.note, admin.id);
    revalidatePath("/admin/inventory");
    return { ok: true, message: delta === 0 ? "לא בוצע שינוי" : `המלאי עודכן (${delta > 0 ? "+" : ""}${delta})` };
  });
}

// ───────────── Shipping ─────────────

export async function saveShippingMethodAction(_prev: FormState, fd: FormData): Promise<FormState> {
  return withAdmin(async () => {
    const id = str(fd, "id") || null;
    const data = shippingMethodInputSchema.parse({
      name: str(fd, "name"),
      description: str(fd, "description"),
      type: str(fd, "type"),
      price: str(fd, "price"),
      freeShippingThreshold: str(fd, "freeShippingThreshold"),
      zones: str(fd, "zones"),
      etaText: str(fd, "etaText"),
      isActive: bool(fd, "isActive"),
      sortOrder: str(fd, "sortOrder") || 0,
    });
    // A method cannot be offered to customers without a price.
    if (data.isActive && data.price == null) throw new AdminInputError("יש להגדיר מחיר (אפשר 0) לפני הפעלת שיטת המשלוח", "price");
    if (id) await db.shippingMethod.update({ where: { id }, data });
    else await db.shippingMethod.create({ data });
    revalidatePath("/", "layout");
    return { ok: true, message: "שיטת המשלוח נשמרה" };
  });
}

export async function deleteShippingMethodAction(fd: FormData) {
  await assertAdmin();
  await db.shippingMethod.delete({ where: { id: String(fd.get("id") ?? "") } });
  revalidatePath("/", "layout");
}

// ───────────── Settings & content ─────────────

export async function saveSettingsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  return withAdmin(async () => {
    const data = storeSettingsSchema.parse(Object.fromEntries(fd));
    await db.storeSettings.upsert({ where: { id: STORE_SETTINGS_ID }, update: data, create: { id: STORE_SETTINGS_ID, ...data } });
    revalidatePath("/", "layout");
    return { ok: true, message: "ההגדרות נשמרו" };
  });
}

export async function saveContentPageAction(_prev: FormState, fd: FormData): Promise<FormState> {
  return withAdmin(async () => {
    const slug = str(fd, "slug") ?? "";
    const data = contentPageSchema.parse({ title: str(fd, "title"), body: str(fd, "body"), isDraft: !bool(fd, "approved") });
    await db.contentPage.update({ where: { slug }, data });
    revalidatePath(`/pages/${slug}`);
    revalidatePath("/sitemap.xml");
    return { ok: true, message: data.isDraft ? "נשמר כטיוטה" : "נשמר ופורסם כמאושר" };
  });
}

export async function toggleMessageHandledAction(fd: FormData) {
  await assertAdmin();
  const id = String(fd.get("id") ?? "");
  const msg = await db.contactMessage.findUnique({ where: { id } });
  if (msg) await db.contactMessage.update({ where: { id }, data: { isHandled: !msg.isHandled } });
  revalidatePath("/admin/messages");
}
