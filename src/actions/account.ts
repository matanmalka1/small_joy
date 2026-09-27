"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { assertUser } from "@/lib/authz";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/action-result";
import { profileSchema, savedAddressSchema } from "@/lib/validation/account";

export async function updateProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await assertUser();
  const parsed = profileSchema.safeParse({ name: fd.get("name"), phone: fd.get("phone") ?? "", marketingOptIn: fd.get("marketingOptIn") === "on" });
  if (!parsed.success) return { ok: false, error: "יש לתקן את השדות המסומנים", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  await auth().api.updateUser({ body: { name: parsed.data.name }, headers: await headers() });
  await db.customerProfile.upsert({
    where: { userId: user.id },
    update: { phone: parsed.data.phone || null, marketingOptIn: parsed.data.marketingOptIn },
    create: { userId: user.id, phone: parsed.data.phone || null, marketingOptIn: parsed.data.marketingOptIn },
  });
  revalidatePath("/account");
  return { ok: true, message: "הפרטים נשמרו" };
}

export async function addAddressAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await assertUser();
  const raw = Object.fromEntries(fd);
  const parsed = savedAddressSchema.safeParse({ ...raw, notes: raw.addressNotes });
  if (!parsed.success) return { ok: false, error: "יש לתקן את השדות המסומנים", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const count = await db.address.count({ where: { userId: user.id } });
  if (count >= 10) return { ok: false, error: "ניתן לשמור עד 10 כתובות" };
  const a = parsed.data;
  await db.address.create({
    data: {
      userId: user.id,
      label: a.label ?? null,
      fullName: a.fullName,
      phone: a.phone,
      city: a.city,
      street: a.street,
      houseNumber: a.houseNumber,
      apartment: a.apartment ?? null,
      floor: a.floor ?? null,
      zip: a.zip ?? null,
      notes: a.notes ?? null,
      isDefault: count === 0,
    },
  });
  revalidatePath("/account/addresses");
  return { ok: true, message: "הכתובת נשמרה" };
}

export async function deleteAddressAction(addressId: string) {
  const user = await assertUser();
  // Scoped by userId: a customer can never touch another customer's address.
  await db.address.deleteMany({ where: { id: String(addressId), userId: user.id } });
  revalidatePath("/account/addresses");
}

export async function setDefaultAddressAction(addressId: string) {
  const user = await assertUser();
  const owned = await db.address.findFirst({ where: { id: String(addressId), userId: user.id } });
  if (!owned) return;
  await db.$transaction([
    db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    db.address.update({ where: { id: owned.id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/account/addresses");
}
