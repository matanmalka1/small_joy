"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { removeCartLineAction, updateCartLineAction } from "@/actions/cart";
import type { CartLineView } from "@/server/cart/cart";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Price } from "@/components/ui/price";
import { toast } from "@/components/ui/toast";
import { formatPrice } from "@/lib/money";
import { ProductImage } from "./product-image";

export function CartLine({ line }: { line: CartLineView }) {
  const [qty, setQty] = useState(line.quantity);
  const [pending, start] = useTransition();
  const router = useRouter();

  const update = (next: number) => {
    setQty(next);
    start(async () => {
      const res = await updateCartLineAction({ variantId: line.variantId, quantity: next });
      if (!res.ok) {
        toast(res.error, "error");
        setQty(line.quantity);
      } else if (res.data && res.data.quantity !== next) {
        setQty(res.data.quantity);
        toast(`הכמות עודכנה ל־${res.data.quantity} לפי המלאי הזמין`, "info");
      }
      router.refresh();
    });
  };

  return (
    <li className="flex gap-3 p-4 sm:gap-4" aria-busy={pending}>
      <Link href={`/p/${line.productSlug}`} className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-sand sm:size-24" tabIndex={-1} aria-hidden="true">
        <ProductImage src={line.imageUrl} alt="" sizes="96px" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/p/${line.productSlug}`} className="font-semibold hover:text-teal">{line.productName}</Link>
            {line.variantLabel && <p className="text-sm text-ink-soft">{line.variantLabel}</p>}
            <Price price={line.unitPrice} compareAt={line.onSale ? line.listPrice : null} size="sm" className="mt-1" />
          </div>
          <p className="shrink-0 font-bold">{formatPrice(line.lineTotal)}</p>
        </div>
        {line.problem && <p className="text-sm font-semibold text-danger" role="alert">{line.problem}</p>}
        <div className="flex items-center justify-between gap-2">
          <QuantityStepper
            value={qty}
            onChange={update}
            max={Math.max(1, Math.min(line.stock, 99))}
            disabled={pending || line.stock <= 0}
            label={`כמות – ${line.productName}`}
          />
          <button
            type="button"
            disabled={pending}
            className="rounded-lg px-2 py-1 text-sm text-ink-soft underline hover:text-danger"
            onClick={() =>
              start(async () => {
                await removeCartLineAction(line.variantId);
                toast("המוצר הוסר מהסל", "info");
                router.refresh();
              })
            }
          >
            הסרה<span className="sr-only"> – {line.productName}</span>
          </button>
        </div>
      </div>
    </li>
  );
}
