"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/authz";
import type { FormState } from "@/lib/action-result";
import { productInputSchema } from "@/lib/validation/admin";
import { deleteOrArchiveProduct, saveProduct } from "@/server/admin/products";
import { importProductsCsv, type ImportReport } from "@/server/admin/csv";
import { storeProductImage, UploadError } from "@/server/storage";
import { withAdmin, zodFieldErrors } from "./_guard";

export async function saveProductAction(_prev: FormState, fd: FormData): Promise<FormState> {
  let savedId: string | null = null;
  const productId = (fd.get("productId") as string) || null;
  const res = await withAdmin(async (admin) => {
    let payload: unknown;
    try {
      payload = JSON.parse(String(fd.get("payload") ?? "{}"));
    } catch {
      return { ok: false, error: "נתוני הטופס אינם תקינים" };
    }
    const parsed = productInputSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, error: "יש לתקן את השדות המסומנים", fieldErrors: zodFieldErrors(parsed.error) };
    savedId = await saveProduct(parsed.data, productId, admin.id);
    revalidatePath("/", "layout");
    return { ok: true, message: "המוצר נשמר" };
  });
  if (res?.ok && !productId && savedId) redirect(`/admin/products/${savedId}?created=1`);
  return res;
}

export async function deleteProductAction(fd: FormData) {
  await assertAdmin();
  const id = String(fd.get("productId") ?? "");
  const result = await deleteOrArchiveProduct(id);
  revalidatePath("/", "layout");
  redirect(`/admin/products?${result === "archived" ? "archived=1" : "deleted=1"}`);
}

export async function uploadProductImagesAction(fd: FormData): Promise<{ ok: true; images: { url: string; storageKey: string }[] } | { ok: false; error: string }> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "אין הרשאה" };
  }
  const files = fd.getAll("files").filter((f): f is File => f instanceof File).slice(0, 8);
  if (!files.length) return { ok: false, error: "לא נבחרו קבצים" };
  try {
    const images = [];
    for (const f of files) images.push(await storeProductImage(f));
    return { ok: true, images };
  } catch (e) {
    return { ok: false, error: e instanceof UploadError ? e.message : "העלאת התמונה נכשלה" };
  }
}

export type ImportState = { ok?: boolean; error?: string; report?: ImportReport } | null;

export async function importCsvAction(_prev: ImportState, fd: FormData): Promise<ImportState> {
  let admin;
  try {
    admin = await assertAdmin();
  } catch {
    return { error: "אין הרשאה" };
  }
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "יש לבחור קובץ CSV" };
  if (file.size > 5 * 1024 * 1024) return { error: "גודל קובץ מקסימלי: 5MB" };
  const text = await file.text();
  const apply = fd.get("mode") === "apply";
  const report = await importProductsCsv(text, { apply, actorId: admin.id });
  if (report.applied) revalidatePath("/", "layout");
  return { ok: report.errors === 0, report };
}
