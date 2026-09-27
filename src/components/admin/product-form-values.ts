import { KIND_ATTRIBUTES, optionMatrix, type ProductKindKey, type VariantOptions } from "@/server/catalog/options";
import { toShekelInput } from "@/lib/money";

export type ProductFormVariant = {
  id?: string;
  sku: string;
  options: { key: string; value: string }[];
  price: string;
  salePrice: string;
  stockQuantity: string;
  lowStockThreshold: string;
};

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  kind: ProductKindKey;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isFeatured: boolean;
  categoryIds: string[];
  seoTitle: string;
  seoDescription: string;
  images: { id?: string; url: string; storageKey?: string | null; alt: string }[];
  variants: ProductFormVariant[];
};

export const emptyVariant = (kind: ProductKindKey): ProductFormVariant => ({
  sku: "",
  options: KIND_ATTRIBUTES[kind].map((key) => ({ key, value: "" })),
  price: "",
  salePrice: "",
  stockQuantity: "0",
  lowStockThreshold: "5",
});

export function newProductValues(): ProductFormValues {
  return { name: "", slug: "", description: "", kind: "GENERAL", status: "DRAFT", isFeatured: false, categoryIds: [], seoTitle: "", seoDescription: "", images: [], variants: [emptyVariant("GENERAL")] };
}

type DbProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  kind: ProductKindKey;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  categories: { categoryId: string }[];
  images: { id: string; url: string; storageKey: string | null; alt: string }[];
  variants: { id: string; sku: string; options: unknown; price: number; salePrice: number | null; stockQuantity: number; lowStockThreshold: number }[];
};

export function productToFormValues(p: DbProduct): ProductFormValues {
  const order = optionMatrix(p.variants.map((v) => ({ options: v.options as VariantOptions })), KIND_ATTRIBUTES[p.kind]).map((m) => m.name);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    kind: p.kind,
    status: p.status,
    isFeatured: p.isFeatured,
    categoryIds: p.categories.map((c) => c.categoryId),
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
    images: p.images.map((i) => ({ id: i.id, url: i.url, storageKey: i.storageKey, alt: i.alt })),
    variants: p.variants.map((v) => {
      const opts = v.options as VariantOptions;
      return {
        id: v.id,
        sku: v.sku,
        options: order.filter((k) => opts[k]).map((key) => ({ key, value: opts[key] })),
        price: toShekelInput(v.price),
        salePrice: toShekelInput(v.salePrice),
        stockQuantity: String(v.stockQuantity),
        lowStockThreshold: String(v.lowStockThreshold),
      };
    }),
  };
}
