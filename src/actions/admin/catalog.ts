"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/authz";
import type { FormState } from "@/lib/action-result";
import { categoryInputSchema, couponInputSchema, promotionInputSchema } from "@/lib/validation/admin";
import { AdminInputError, uniqueSlug } from "@/server/admin/products";
import { withAdmin, bool, str } from "./_guard";

// ───────────── Categories ─────────────

export async function saveCategoryAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id") || null;
  return withAdmin(async () => {
    const data = categoryInputSchema.parse({
      name: str(fd, "name"),
      slug: str(fd, "slug"),
      description: str(fd, "description"),
      imageUrl: str(fd, "imageUrl"),
      parentId: str(fd, "parentId"),
      sortOrder: str(fd, "sortOrder") || 0,
      isActive: bool(fd, "isActive"),
    });
    if (id && data.parentId === id) throw new AdminInputError("קטגוריה אינה יכולה להיות הורה של עצמה", "parentId");
    if (id && data.parentId) {
      // Prevent cycles: the new parent must not be a descendant of this category.
      let cursor: string | null = data.parentId;
      for (let i = 0; cursor && i < 20; i++) {
        if (cursor === id) throw new AdminInputError("לא ניתן לבחור תת־קטגוריה כהורה", "parentId");
        cursor = (await db.category.findUnique({ where: { id: cursor }, select: { parentId: true } }))?.parentId ?? null;
      }
    }
    if (data.slug) {
      const clash = await db.category.findUnique({ where: { slug: data.slug } });
      if (clash && clash.id !== id) throw new AdminInputError("כתובת ה־URL כבר בשימוש", "slug");
    }
    const slug = data.slug ?? (await uniqueSlug(db, data.name, "category", id ?? undefined));
    const payload = { ...data, slug };
    if (id) await db.category.update({ where: { id }, data: payload });
    else await db.category.create({ data: payload });
    revalidatePath("/", "layout");
    return { ok: true, message: "הקטגוריה נשמרה" };
  });
}

export async function deleteCategoryAction(fd: FormData) {
  await assertAdmin();
  const id = String(fd.get("id") ?? "");
  // Products stay; only the link is removed. Children move to the top level.
  await db.category.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/admin/categories?deleted=1");
}

export async function moveCategoryAction(fd: FormData) {
  await assertAdmin();
  const id = String(fd.get("id") ?? "");
  const dir = fd.get("dir") === "up" ? -1 : 1;
  const cat = await db.category.findUnique({ where: { id } });
  if (!cat) return;
  const siblings = await db.category.findMany({ where: { parentId: cat.parentId }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const idx = siblings.findIndex((s) => s.id === id);
  const swap = siblings[idx + dir];
  if (!swap) return;
  const reordered = [...siblings];
  [reordered[idx], reordered[idx + dir]] = [reordered[idx + dir], reordered[idx]];
  await db.$transaction(reordered.map((c, i) => db.category.update({ where: { id: c.id }, data: { sortOrder: i } })));
  revalidatePath("/", "layout");
}

// ───────────── Coupons ─────────────

export async function saveCouponAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id") || null;
  const res = await withAdmin(async () => {
    const data = couponInputSchema.parse({
      code: str(fd, "code"),
      description: str(fd, "description"),
      discount: { type: str(fd, "type"), value: str(fd, "value") ?? "" },
      scope: str(fd, "scope"),
      productIds: fd.getAll("productIds").map(String),
      categoryIds: fd.getAll("categoryIds").map(String),
      startsAt: str(fd, "startsAt"),
      endsAt: str(fd, "endsAt"),
      minOrderTotal: str(fd, "minOrderTotal"),
      maxRedemptions: str(fd, "maxRedemptions"),
      perCustomerLimit: str(fd, "perCustomerLimit"),
      combineWithSales: bool(fd, "combineWithSales"),
      isActive: bool(fd, "isActive"),
    });
    const clash = await db.coupon.findUnique({ where: { code: data.code } });
    if (clash && clash.id !== id) throw new AdminInputError("קוד הקופון כבר קיים", "code");
    const { discount, productIds, categoryIds, ...rest } = data;
    const fields = { ...rest, type: discount.type, value: discount.value };
    await db.$transaction(async (tx) => {
      const coupon = id ? await tx.coupon.update({ where: { id }, data: fields }) : await tx.coupon.create({ data: fields });
      await tx.couponProduct.deleteMany({ where: { couponId: coupon.id } });
      await tx.couponCategory.deleteMany({ where: { couponId: coupon.id } });
      if (data.scope === "PRODUCTS") await tx.couponProduct.createMany({ data: productIds.map((productId) => ({ couponId: coupon.id, productId })) });
      if (data.scope === "CATEGORIES") await tx.couponCategory.createMany({ data: categoryIds.map((categoryId) => ({ couponId: coupon.id, categoryId })) });
    });
    return { ok: true, message: "הקופון נשמר" };
  });
  if (res?.ok && !id) redirect("/admin/coupons?saved=1");
  return res;
}

export async function deleteCouponAction(fd: FormData) {
  await assertAdmin();
  const id = String(fd.get("id") ?? "");
  const used = await db.couponRedemption.count({ where: { couponId: id } });
  // Used coupons are deactivated instead of deleted, to keep redemption history.
  if (used) await db.coupon.update({ where: { id }, data: { isActive: false } });
  else await db.coupon.delete({ where: { id } });
  redirect("/admin/coupons");
}

// ───────────── Promotions ─────────────

export async function savePromotionAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id") || null;
  const res = await withAdmin(async () => {
    const data = promotionInputSchema.parse({
      name: str(fd, "name"),
      discount: { type: str(fd, "type"), value: str(fd, "value") ?? "" },
      target: str(fd, "target"),
      productId: str(fd, "productId") || undefined,
      categoryId: str(fd, "categoryId") || undefined,
      startsAt: str(fd, "startsAt"),
      endsAt: str(fd, "endsAt"),
      isActive: bool(fd, "isActive"),
    });
    const fields = {
      name: data.name,
      type: data.discount.type,
      value: data.discount.value,
      productId: data.target === "PRODUCT" ? data.productId! : null,
      categoryId: data.target === "CATEGORY" ? data.categoryId! : null,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      isActive: data.isActive,
    };
    if (id) await db.promotion.update({ where: { id }, data: fields });
    else await db.promotion.create({ data: fields });
    revalidatePath("/", "layout");
    return { ok: true, message: "המבצע נשמר" };
  });
  if (res?.ok && !id) redirect("/admin/promotions?saved=1");
  return res;
}

export async function deletePromotionAction(fd: FormData) {
  await assertAdmin();
  await db.promotion.delete({ where: { id: z.string().parse(fd.get("id")) } });
  revalidatePath("/", "layout");
  redirect("/admin/promotions");
}
