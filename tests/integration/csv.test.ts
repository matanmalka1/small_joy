import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { exportProductsCsv, importProductsCsv } from "@/server/admin/csv";
import { resetDb } from "../support/db";

beforeEach(resetDb);

const header = "sku,product_slug,product_name,categories,options,price,sale_price,stock,status";

describe("CSV catalog import", () => {
  it("dry-run reports without writing; apply creates products and variants", async () => {
    await db.category.create({ data: { slug: "bedding", name: "מצעים" } });
    const csv = [header, "BED-1,sheet-set,סט מצעים,bedding,מידה=יחיד,149.90,,5,ACTIVE", "BED-2,sheet-set,סט מצעים,bedding,מידה=זוגי,199.90,169.90,3,ACTIVE"].join("\n");
    const dry = await importProductsCsv(csv, { apply: false, actorId: "admin" });
    expect(dry).toMatchObject({ created: 2, errors: 0, applied: false });
    expect(await db.product.count()).toBe(0);

    const applied = await importProductsCsv(csv, { apply: true, actorId: "admin" });
    expect(applied.applied).toBe(true);
    const p = await db.product.findUniqueOrThrow({ where: { slug: "sheet-set" }, include: { variants: true, categories: true } });
    expect(p.variants).toHaveLength(2);
    expect(p.priceFrom).toBe(14990);
    expect(p.categories).toHaveLength(1);
    expect(await db.inventoryMovement.count({ where: { reason: "IMPORT" } })).toBe(2);
  });

  it("updates existing SKUs and records stock deltas", async () => {
    await importProductsCsv([header, "X-1,x,מוצר,,,10,,5,ACTIVE"].join("\n"), { apply: true, actorId: "a" });
    await importProductsCsv([header, "X-1,x,מוצר,,,12,,8,"].join("\n"), { apply: true, actorId: "a" });
    const v = await db.productVariant.findUniqueOrThrow({ where: { sku: "X-1" } });
    expect(v).toMatchObject({ price: 1200, stockQuantity: 8 });
    expect(await db.inventoryMovement.findFirst({ where: { variantId: v.id, delta: 3 } })).not.toBeNull();
  });

  it("is all-or-nothing when any row is invalid", async () => {
    const csv = [header, "OK-1,ok,טוב,,,10,,1,", "BAD-1,bad,רע,missing-cat,,10,,1,", "BAD-2,bad2,רע,,,abc,,1,"].join("\n");
    const r = await importProductsCsv(csv, { apply: true, actorId: "a" });
    expect(r.applied).toBe(false);
    expect(r.errors).toBe(2);
    expect(await db.product.count()).toBe(0);
  });

  it("exports a CSV that neutralizes spreadsheet formulas", async () => {
    await importProductsCsv([header, 'F-1,f,"=HYPERLINK(""x"")",,,10,,1,'].join("\n"), { apply: true, actorId: "a" });
    const out = await exportProductsCsv();
    expect(out).toContain("'=HYPERLINK");
  });
});
